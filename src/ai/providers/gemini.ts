/**
 * Adaptador para la API de Gemini (Google AI Studio) vía REST.
 *
 * - JSON: generationConfig.responseMimeType = application/json + responseJsonSchema (JSON Schema estándar).
 *   Si el modelo rechaza responseJsonSchema (HTTP 400), se reintenta con el esquema en el prompt.
 * - Streaming: :streamGenerateContent?alt=sse.
 * - Las partes de "pensamiento" (thought: true) se descartan.
 */
import { aiError, AIError } from '../errors';
import { joinUrl, readSSE, request, requestJson } from '../http';
import { splitSystem, withSchemaInstructions } from '../json';
import { GEMINI_DEFAULT_BASE_URL, GEMINI_DEFAULT_MODEL } from './meta';
import type { ChatMessage, JSONRequest, LLMProvider, ProviderConfig, TextStreamRequest } from '../types';

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
}

const BLOCKED_REASONS = new Set([
  'SAFETY',
  'RECITATION',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
  'IMAGE_SAFETY',
]);

function partsText(data: GeminiResponse): string {
  if (data.promptFeedback?.blockReason) {
    throw aiError('refusal', { detail: `Bloqueado por Gemini: ${data.promptFeedback.blockReason}` });
  }
  const candidate = data.candidates?.[0];
  const reason = candidate?.finishReason;
  if (reason && BLOCKED_REASONS.has(reason))
    throw aiError('refusal', { detail: `Gemini detuvo la respuesta: ${reason}` });
  return (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
}

function toContents(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

function normalizeModel(model: string): string {
  return model.trim().replace(/^models\//, '');
}

export class GeminiProvider implements LLMProvider {
  readonly id = 'gemini' as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private nativeSchema = true;

  constructor(config: ProviderConfig) {
    this.model = normalizeModel(config.model) || GEMINI_DEFAULT_MODEL;
    this.apiKey = config.apiKey.trim();
    this.baseUrl = config.baseUrl.trim() || GEMINI_DEFAULT_BASE_URL;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['x-goog-api-key'] = this.apiKey;
    return headers;
  }

  private ensureConfigured() {
    if (!this.apiKey && this.baseUrl === GEMINI_DEFAULT_BASE_URL) {
      throw aiError('not_configured', {
        message: 'Añade tu clave de API de Gemini (Google AI Studio) en Ajustes.',
      });
    }
  }

  private body(messages: ChatMessage[], generationConfig?: Record<string, unknown>) {
    const { system, rest } = splitSystem(messages);
    return {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: toContents(rest),
      ...(generationConfig ? { generationConfig } : {}),
    };
  }

  async generateJSON(req: JSONRequest): Promise<string> {
    this.ensureConfigured();
    const native = this.nativeSchema;
    const messages = native ? req.messages : withSchemaInstructions(req.messages, req.schema);
    const generationConfig: Record<string, unknown> = { responseMimeType: 'application/json' };
    if (native) generationConfig.responseJsonSchema = req.schema;
    try {
      const data = await requestJson<GeminiResponse>(
        joinUrl(this.baseUrl, `models/${encodeURIComponent(this.model)}:generateContent`),
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(this.body(messages, generationConfig)),
          signal: req.signal,
        },
      );
      const text = partsText(data);
      if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw aiError('truncated');
      if (!text.trim()) throw aiError('invalid_output', { detail: 'Gemini no devolvió texto' });
      return text;
    } catch (error) {
      if (
        native &&
        error instanceof AIError &&
        error.code === 'bad_request' &&
        /responseJsonSchema|response_json_schema|schema/i.test(error.detail ?? '')
      ) {
        this.nativeSchema = false;
        return this.generateJSON(req);
      }
      throw error;
    }
  }

  async streamText(req: TextStreamRequest): Promise<string> {
    this.ensureConfigured();
    const res = await request(
      joinUrl(this.baseUrl, `models/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`),
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.body(req.messages)),
        signal: req.signal,
      },
    );
    let full = '';
    for await (const { data } of readSSE(res, req.signal)) {
      let chunk: GeminiResponse;
      try {
        chunk = JSON.parse(data) as GeminiResponse;
      } catch {
        continue;
      }
      const delta = partsText(chunk);
      if (delta) {
        full += delta;
        req.onDelta?.(delta, full);
      }
    }
    if (!full.trim()) throw aiError('invalid_output', { detail: 'Gemini no devolvió texto' });
    return full;
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    this.ensureConfigured();
    const data = await requestJson<{
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    }>(joinUrl(this.baseUrl, 'models?pageSize=1000'), { headers: this.headers(), signal });
    return (data.models ?? [])
      .filter(
        (m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'),
      )
      .map((m) => normalizeModel(m.name ?? ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }
}
