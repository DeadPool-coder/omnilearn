/**
 * Adaptador para Claude con el SDK oficial (@anthropic-ai/sdk), cargado bajo demanda para que
 * no pese en el bundle inicial de quien use otro proveedor.
 *
 * - Salida estructurada: `output_config.format` con JSON Schema (structured outputs).
 *   Si el modelo elegido no la soporta (HTTP 400), se reintenta con el esquema en el prompt.
 * - Esfuerzo de razonamiento: `output_config.effort` (low/medium/high) en los modelos que lo admiten.
 * - Negativas: se comprueba `stop_reason === 'refusal'` antes de leer el contenido. En los modelos
 *   que lo admiten se activa `fallbacks: "default"`, que reintenta en el servidor con el modelo
 *   recomendado por Anthropic cuando el modelo pedido declina.
 * - No se envían temperature/top_p/top_k (la versión de API actual los rechaza).
 *
 * Nota de seguridad: llamar a la API desde el navegador expone la clave a quien use este equipo.
 * Para uso multiusuario, usa el proxy de server/proxy.mjs y deja la clave vacía.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { aiError, AIError } from '../errors';
import { splitSystem, withSchemaInstructions } from '../json';
import { CLAUDE_DEFAULT_MODEL } from './meta';
import type { ClaudeEffort, JSONRequest, LLMProvider, ProviderConfig, TextStreamRequest } from '../types';

import type * as AnthropicModule from '@anthropic-ai/sdk';

type AnthropicSDK = typeof AnthropicModule;

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const JSON_MAX_TOKENS = 16000;
const STREAM_MAX_TOKENS = 32000;

let sdkPromise: Promise<AnthropicSDK> | null = null;
function loadSdk(): Promise<AnthropicSDK> {
  sdkPromise ??= import('@anthropic-ai/sdk');
  return sdkPromise;
}

/** Modelos que aceptan `output_config.effort`. */
export function supportsEffort(model: string): boolean {
  return (
    /^claude-(fable|mythos)-/.test(model) ||
    /^claude-(opus|sonnet|haiku)-5/.test(model) ||
    /^claude-opus-4-[5-9]/.test(model) ||
    /^claude-sonnet-4-[6-9]/.test(model)
  );
}

/** Modelos con reintento en servidor ante negativas (`fallbacks: "default"`). */
export function supportsServerFallback(model: string): boolean {
  return (
    /^claude-(fable|mythos)-5/.test(model) || /^claude-opus-5/.test(model) || /^claude-sonnet-5-5/.test(model)
  );
}

interface MessageLike {
  stop_reason: string | null;
  stop_details?: { explanation?: string | null; category?: string | null } | null;
  content: Array<{ type: string; text?: string }>;
}

function textFrom(message: MessageLike): string {
  if (message.stop_reason === 'refusal') {
    throw aiError('refusal', {
      detail: message.stop_details?.explanation ?? message.stop_details?.category ?? undefined,
    });
  }
  const text = message.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
  if (message.stop_reason === 'max_tokens') throw aiError('truncated');
  if (!text.trim()) throw aiError('invalid_output', { detail: 'Claude no devolvió texto' });
  return text;
}

function mapError(error: unknown, sdk: AnthropicSDK): AIError {
  if (error instanceof AIError) return error;
  // De la clase más específica a la más general.
  if (error instanceof sdk.APIUserAbortError) return aiError('aborted', { cause: error });
  if (error instanceof sdk.AuthenticationError || error instanceof sdk.PermissionDeniedError) {
    return aiError('auth', { status: error.status, detail: error.message, cause: error });
  }
  if (error instanceof sdk.RateLimitError)
    return aiError('rate_limit', { status: 429, detail: error.message, cause: error });
  if (error instanceof sdk.NotFoundError) {
    return aiError('bad_request', {
      status: 404,
      detail: error.message,
      message: 'Claude no encontró el modelo indicado. Revisa el nombre del modelo en Ajustes.',
      cause: error,
    });
  }
  if (error instanceof sdk.BadRequestError)
    return aiError('bad_request', { status: 400, detail: error.message, cause: error });
  if (error instanceof sdk.InternalServerError) {
    return aiError('server', { status: error.status, detail: error.message, cause: error });
  }
  if (error instanceof sdk.APIConnectionError)
    return aiError('network', { detail: error.message, cause: error });
  if (error instanceof sdk.APIError) {
    return aiError('unknown', { status: error.status, detail: error.message, cause: error });
  }
  return aiError('unknown', { detail: error instanceof Error ? error.message : String(error), cause: error });
}

export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic' as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly effort: ClaudeEffort | undefined;
  private nativeSchema = true;
  private client: Anthropic | null = null;

  constructor(config: ProviderConfig) {
    this.model = config.model.trim() || CLAUDE_DEFAULT_MODEL;
    this.apiKey = config.apiKey.trim();
    this.baseUrl = config.baseUrl.trim();
    this.effort = config.effort;
  }

  private ensureConfigured() {
    if (!this.apiKey && !this.baseUrl) {
      throw aiError('not_configured', { message: 'Añade tu clave de API de Anthropic en Ajustes.' });
    }
  }

  private async getClient(): Promise<{ client: Anthropic; sdk: AnthropicSDK }> {
    const sdk = await loadSdk();
    this.client ??= new sdk.default({
      // Con un proxy propio la clave puede ir vacía: el proxy añade la suya.
      apiKey: this.apiKey || 'proxy',
      baseURL: this.baseUrl || undefined,
      dangerouslyAllowBrowser: true,
      maxRetries: 2,
    });
    return { client: this.client, sdk };
  }

  private outputConfig(schema?: Record<string, unknown>): Anthropic.OutputConfig | undefined {
    const config: Anthropic.OutputConfig = {};
    if (schema) config.format = { type: 'json_schema', schema };
    if (this.effort && supportsEffort(this.model)) config.effort = this.effort;
    return Object.keys(config).length ? config : undefined;
  }

  /** El reintento en servidor solo existe en la API oficial (no tras proxies de terceros). */
  private useServerFallback(): boolean {
    return supportsServerFallback(this.model) && (!this.baseUrl || /api\.anthropic\.com/.test(this.baseUrl));
  }

  private baseParams(messages: JSONRequest['messages'], maxTokens: number, schema?: Record<string, unknown>) {
    const { system, rest } = splitSystem(messages);
    return {
      model: this.model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: rest.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ...(this.outputConfig(schema) ? { output_config: this.outputConfig(schema) } : {}),
    };
  }

  async generateJSON(req: JSONRequest): Promise<string> {
    this.ensureConfigured();
    const { client, sdk } = await this.getClient();
    const native = this.nativeSchema;
    const messages = native ? req.messages : withSchemaInstructions(req.messages, req.schema);
    const params = this.baseParams(messages, JSON_MAX_TOKENS, native ? req.schema : undefined);
    try {
      const message = this.useServerFallback()
        ? await client.beta.messages.create(
            { ...params, betas: [FALLBACK_BETA], fallbacks: 'default' },
            { signal: req.signal },
          )
        : await client.messages.create(params, { signal: req.signal });
      return textFrom(message as MessageLike);
    } catch (error) {
      if (
        native &&
        error instanceof sdk.BadRequestError &&
        /output_config|format|json_schema|structured/i.test(error.message)
      ) {
        // El modelo elegido no admite salida estructurada: seguimos con el esquema en el prompt.
        this.nativeSchema = false;
        return this.generateJSON(req);
      }
      throw mapError(error, sdk);
    }
  }

  async streamText(req: TextStreamRequest): Promise<string> {
    this.ensureConfigured();
    const { client, sdk } = await this.getClient();
    const params = this.baseParams(req.messages, STREAM_MAX_TOKENS);
    let full = '';
    const onText = (delta: string) => {
      full += delta;
      req.onDelta?.(delta, full);
    };
    try {
      let final: MessageLike;
      if (this.useServerFallback()) {
        const stream = client.beta.messages.stream(
          { ...params, betas: [FALLBACK_BETA], fallbacks: 'default' },
          { signal: req.signal },
        );
        stream.on('text', onText);
        final = (await stream.finalMessage()) as MessageLike;
      } else {
        const stream = client.messages.stream(params, { signal: req.signal });
        stream.on('text', onText);
        final = (await stream.finalMessage()) as MessageLike;
      }
      // Si toda la cadena declinó, descartamos el texto parcial: no es contenido completo.
      if (final.stop_reason === 'refusal') textFrom(final);
      if (final.stop_reason === 'max_tokens' && !full.trim()) throw aiError('truncated');
    } catch (error) {
      throw mapError(error, sdk);
    }
    if (!full.trim()) throw aiError('invalid_output', { detail: 'Claude no devolvió texto' });
    return full;
  }

  async listModels(): Promise<string[]> {
    this.ensureConfigured();
    const { client, sdk } = await this.getClient();
    try {
      const ids: string[] = [];
      for await (const model of client.models.list()) ids.push(model.id);
      return ids;
    } catch (error) {
      throw mapError(error, sdk);
    }
  }
}
