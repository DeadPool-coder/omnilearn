/**
 * Adaptador para modelos locales con Ollama (API nativa /api/chat).
 *
 * - JSON: el campo `format` acepta un JSON Schema (salidas estructuradas de Ollama).
 * - Streaming: NDJSON (un objeto JSON por línea).
 * - Se elimina el razonamiento <think>…</think> de modelos como qwen3 o deepseek-r1.
 *
 * CORS: Ollama acepta por defecto orígenes localhost. Si sirves Omnilearn desde otro dominio,
 * arranca Ollama con OLLAMA_ORIGINS="https://tu-dominio" (ver README).
 */
import { stripThinking } from '../json';
import { aiError } from '../errors';
import { joinUrl, readLines, request, requestJson } from '../http';
import { OLLAMA_DEFAULT_BASE_URL, OLLAMA_DEFAULT_MODEL } from './meta';
import type { JSONRequest, LLMProvider, ProviderConfig, TextStreamRequest } from '../types';

/** Ventana de contexto: suficiente para lección + instrucciones + respuesta. */
const NUM_CTX = 8192;

interface OllamaChatResponse {
  message?: { content?: string; thinking?: string };
  done?: boolean;
  done_reason?: string;
  error?: string;
}

export class OllamaProvider implements LLMProvider {
  readonly id = 'ollama' as const;
  readonly model: string;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    this.model = config.model.trim() || OLLAMA_DEFAULT_MODEL;
    this.baseUrl = config.baseUrl.trim() || OLLAMA_DEFAULT_BASE_URL;
  }

  async generateJSON(req: JSONRequest): Promise<string> {
    const data = await requestJson<OllamaChatResponse>(joinUrl(this.baseUrl, 'api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: req.messages,
        stream: false,
        format: req.schema,
        options: { temperature: 0.3, num_ctx: NUM_CTX },
      }),
      signal: req.signal,
    });
    if (data.error) throw aiError('bad_request', { detail: data.error });
    const content = stripThinking(data.message?.content ?? '');
    if (!content.trim()) throw aiError('invalid_output', { detail: 'El modelo local no devolvió texto' });
    if (data.done_reason === 'length') throw aiError('truncated');
    return content;
  }

  async streamText(req: TextStreamRequest): Promise<string> {
    const res = await request(joinUrl(this.baseUrl, 'api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: req.messages,
        stream: true,
        options: { num_ctx: NUM_CTX },
      }),
      signal: req.signal,
    });
    let raw = '';
    let emitted = '';
    for await (const line of readLines(res, req.signal)) {
      if (!line.trim()) continue;
      let chunk: OllamaChatResponse;
      try {
        chunk = JSON.parse(line) as OllamaChatResponse;
      } catch {
        continue;
      }
      if (chunk.error) throw aiError('bad_request', { detail: chunk.error });
      const delta = chunk.message?.content ?? '';
      if (delta) {
        raw += delta;
        // Ocultamos cualquier bloque <think> mientras se escribe.
        const visible = stripThinking(raw).replace(/<think>[\s\S]*$/i, '');
        if (visible.length > emitted.length) {
          const piece = visible.slice(emitted.length);
          emitted = visible;
          req.onDelta?.(piece, emitted);
        }
      }
      if (chunk.done) break;
    }
    const finalText = stripThinking(raw);
    if (!finalText.trim()) throw aiError('invalid_output', { detail: 'El modelo local no devolvió texto' });
    return finalText;
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    const data = await requestJson<{ models?: Array<{ name?: string; model?: string }> }>(
      joinUrl(this.baseUrl, 'api/tags'),
      { signal },
    );
    return (data.models ?? [])
      .map((m) => m.name ?? m.model)
      .filter((n): n is string => typeof n === 'string')
      .sort((a, b) => a.localeCompare(b));
  }
}
