/**
 * Adaptador para cualquier API compatible con OpenAI Chat Completions:
 * OpenAI, OpenRouter, Groq, Together, DeepSeek, Mistral, LM Studio, vLLM, el endpoint /v1 de Ollama…
 *
 * Salida estructurada, en orden de preferencia:
 *  1. response_format json_schema (strict)  → el servidor garantiza el esquema.
 *  2. response_format json_object           → JSON garantizado, esquema en el prompt.
 *  3. sin response_format                   → esquema en el prompt y extracción tolerante.
 * Si el servidor rechaza un modo (HTTP 400), se degrada al siguiente automáticamente.
 *
 * No enviamos temperature ni max_tokens: los modelos de razonamiento recientes rechazan valores
 * distintos del predeterminado y varios servidores compatibles no aceptan max_completion_tokens.
 */
import { aiError, AIError } from '../errors';
import { joinUrl, readSSE, request, requestJson } from '../http';
import { withSchemaInstructions } from '../json';
import { OPENAI_DEFAULT_BASE_URL } from './meta';
import type { JSONRequest, LLMProvider, ProviderConfig, StructuredMode, TextStreamRequest } from '../types';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null; refusal?: string | null };
    finish_reason?: string | null;
  }>;
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: { content?: string | null; refusal?: string | null };
    finish_reason?: string | null;
  }>;
}

const MODE_ORDER: StructuredMode[] = ['json_schema', 'json_object', 'none'];

function looksLikeFormatRejection(error: unknown): boolean {
  if (!(error instanceof AIError) || error.code !== 'bad_request') return false;
  const detail = (error.detail ?? '').toLowerCase();
  return /response_format|json_schema|json_object|structured|schema/.test(detail);
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly id = 'openai' as const;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private mode: StructuredMode;

  constructor(config: ProviderConfig) {
    this.model = config.model.trim();
    this.baseUrl = config.baseUrl.trim() || OPENAI_DEFAULT_BASE_URL;
    this.apiKey = config.apiKey.trim();
    this.mode = config.structuredMode ?? 'json_schema';
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private ensureConfigured() {
    if (!this.model)
      throw aiError('not_configured', { message: 'Indica un modelo en Ajustes (p. ej. gpt-5-mini).' });
    if (!this.apiKey && this.baseUrl === OPENAI_DEFAULT_BASE_URL) {
      throw aiError('not_configured', { message: 'Añade tu clave de API de OpenAI en Ajustes.' });
    }
  }

  async generateJSON(req: JSONRequest): Promise<string> {
    this.ensureConfigured();
    let modeIndex = MODE_ORDER.indexOf(this.mode);
    while (true) {
      const mode = MODE_ORDER[modeIndex];
      try {
        return await this.completeJSON(req, mode);
      } catch (error) {
        if (modeIndex < MODE_ORDER.length - 1 && looksLikeFormatRejection(error)) {
          modeIndex += 1;
          this.mode = MODE_ORDER[modeIndex]; // recordamos el modo que funciona con este servidor
          continue;
        }
        throw error;
      }
    }
  }

  private async completeJSON(req: JSONRequest, mode: StructuredMode): Promise<string> {
    const messages = mode === 'json_schema' ? req.messages : withSchemaInstructions(req.messages, req.schema);
    const body: Record<string, unknown> = { model: this.model, messages };
    if (mode === 'json_schema') {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: req.schemaName, strict: true, schema: req.schema },
      };
    } else if (mode === 'json_object') {
      body.response_format = { type: 'json_object' };
    }
    const data = await requestJson<ChatCompletionResponse>(joinUrl(this.baseUrl, 'chat/completions'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: req.signal,
    });
    const choice = data.choices?.[0];
    if (choice?.message?.refusal) throw aiError('refusal', { detail: choice.message.refusal });
    if (choice?.finish_reason === 'length') throw aiError('truncated');
    if (choice?.finish_reason === 'content_filter') throw aiError('refusal');
    const content = choice?.message?.content;
    if (!content) throw aiError('invalid_output', { detail: 'Respuesta vacía del modelo' });
    return content;
  }

  async streamText(req: TextStreamRequest): Promise<string> {
    this.ensureConfigured();
    const res = await request(joinUrl(this.baseUrl, 'chat/completions'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, messages: req.messages, stream: true }),
      signal: req.signal,
    });
    let full = '';
    for await (const { data } of readSSE(res, req.signal)) {
      if (data === '[DONE]') break;
      let chunk: ChatCompletionChunk;
      try {
        chunk = JSON.parse(data) as ChatCompletionChunk;
      } catch {
        continue;
      }
      const choice = chunk.choices?.[0];
      if (choice?.delta?.refusal) throw aiError('refusal', { detail: choice.delta.refusal });
      const delta = choice?.delta?.content;
      if (delta) {
        full += delta;
        req.onDelta?.(delta, full);
      }
      if (choice?.finish_reason === 'content_filter') throw aiError('refusal');
    }
    if (!full.trim()) throw aiError('invalid_output', { detail: 'El modelo no devolvió texto' });
    return full;
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    const data = await requestJson<{ data?: Array<{ id?: string }> }>(joinUrl(this.baseUrl, 'models'), {
      headers: this.headers(),
      signal,
    });
    return (data.data ?? [])
      .map((m) => m.id)
      .filter((id): id is string => typeof id === 'string')
      .sort((a, b) => a.localeCompare(b));
  }
}
