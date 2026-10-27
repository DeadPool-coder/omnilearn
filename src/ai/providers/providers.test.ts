import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JSONRequest } from '../types';
import { AnthropicProvider, supportsEffort, supportsServerFallback } from './anthropic';
import { GeminiProvider } from './gemini';
import { isProviderReady, defaultProviderConfig } from './index';
import { OllamaProvider } from './ollama';
import { OpenAICompatibleProvider } from './openai';

const schema = {
  type: 'object',
  properties: { ok: { type: 'boolean' } },
  required: ['ok'],
  additionalProperties: false,
};
const jsonReq: JSONRequest = {
  messages: [
    { role: 'system', content: 'Eres un tutor.' },
    { role: 'user', content: 'Hola' },
  ],
  schema,
  schemaName: 'ping',
  task: 'ping',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

function mockFetch(...responses: Response[]) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function bodyOf(fn: ReturnType<typeof vi.fn>, call = 0) {
  return JSON.parse((fn.mock.calls[call][1] as RequestInit).body as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAI-compatible', () => {
  const config = { ...defaultProviderConfig('openai'), apiKey: 'sk-test', model: 'gpt-test' };

  it('usa response_format json_schema estricto y la cabecera Authorization', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }] }),
    );
    const text = await new OpenAICompatibleProvider(config).generateJSON(jsonReq);
    expect(text).toBe('{"ok":true}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = bodyOf(fetchMock);
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'ping', strict: true, schema },
    });
    expect(body).not.toHaveProperty('temperature');
  });

  it('se degrada a json_object si el servidor no admite json_schema', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: { message: "response_format 'json_schema' is not supported" } }, 400),
      jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] }),
    );
    await new OpenAICompatibleProvider({ ...config, baseUrl: 'http://localhost:1234/v1' }).generateJSON(
      jsonReq,
    );
    const second = bodyOf(fetchMock, 1);
    expect(second.response_format).toEqual({ type: 'json_object' });
    expect(second.messages.at(-1).content).toContain('JSON Schema');
  });

  it('lee el streaming SSE', async () => {
    mockFetch(
      streamResponse([
        'data: {"choices":[{"delta":{"content":"Hola"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" mun',
        'do"}}]}\n\ndata: [DONE]\n\n',
      ]),
    );
    const deltas: string[] = [];
    const text = await new OpenAICompatibleProvider(config).streamText({
      ...jsonReq,
      task: 'lesson',
      onDelta: (d) => deltas.push(d),
    });
    expect(text).toBe('Hola mundo');
    expect(deltas).toEqual(['Hola', ' mundo']);
  });

  it('traduce 401 a un error de autenticación', async () => {
    mockFetch(jsonResponse({ error: { message: 'Incorrect API key' } }, 401));
    await expect(new OpenAICompatibleProvider(config).generateJSON(jsonReq)).rejects.toMatchObject({
      code: 'auth',
    });
  });

  it('exige clave con la URL oficial de OpenAI', async () => {
    await expect(
      new OpenAICompatibleProvider({ ...config, apiKey: '' }).generateJSON(jsonReq),
    ).rejects.toMatchObject({ code: 'not_configured' });
  });
});

describe('Gemini', () => {
  const config = { ...defaultProviderConfig('gemini'), apiKey: 'AIza-test', model: 'models/gemini-test' };

  it('envía systemInstruction, responseJsonSchema y descarta las partes de pensamiento', async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: 'pensando…', thought: true }, { text: '{"ok":true}' }] } }],
      }),
    );
    const text = await new GeminiProvider(config).generateJSON(jsonReq);
    expect(text).toBe('{"ok":true}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIza-test');
    const body = bodyOf(fetchMock);
    expect(body.systemInstruction.parts[0].text).toBe('Eres un tutor.');
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Hola' }] }]);
    expect(body.generationConfig).toEqual({
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    });
  });

  it('reintenta sin responseJsonSchema si el modelo lo rechaza', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: { message: 'Unknown name "responseJsonSchema"' } }, 400),
      jsonResponse({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
    );
    await new GeminiProvider(config).generateJSON(jsonReq);
    expect(bodyOf(fetchMock, 1).generationConfig).toEqual({ responseMimeType: 'application/json' });
  });

  it('trata un bloqueo de seguridad como negativa', async () => {
    mockFetch(jsonResponse({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(new GeminiProvider(config).generateJSON(jsonReq)).rejects.toMatchObject({ code: 'refusal' });
  });
});

describe('Ollama', () => {
  const config = { ...defaultProviderConfig('ollama'), model: 'qwen3:8b' };

  it('envía el esquema en format y quita el razonamiento', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ message: { content: '<think>hmm</think>{"ok":true}' }, done: true }),
    );
    const text = await new OllamaProvider(config).generateJSON(jsonReq);
    expect(text).toBe('{"ok":true}');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/chat');
    const body = bodyOf(fetchMock);
    expect(body.format).toEqual(schema);
    expect(body.stream).toBe(false);
  });

  it('lee el streaming NDJSON ocultando <think>', async () => {
    mockFetch(
      streamResponse([
        '{"message":{"content":"<think>razono"},"done":false}\n',
        '{"message":{"content":"</think>Hola"},"done":false}\n{"message":{"content":" Omni"},"done":false}\n',
        '{"message":{"content":""},"done":true}\n',
      ]),
    );
    const deltas: string[] = [];
    const text = await new OllamaProvider(config).streamText({
      ...jsonReq,
      task: 'lesson',
      onDelta: (d) => deltas.push(d),
    });
    expect(text).toBe('Hola Omni');
    expect(deltas.join('')).toBe('Hola Omni');
  });
});

describe('Claude (SDK oficial)', () => {
  const config = { ...defaultProviderConfig('anthropic'), apiKey: 'sk-ant-test', model: 'claude-opus-5-5' };

  it('pide salida estructurada, esfuerzo y fallback por defecto', async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: '{"ok":true}' }],
        stop_reason: 'end_turn',
        stop_details: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
    const text = await new AnthropicProvider(config).generateJSON(jsonReq);
    expect(text).toBe('{"ok":true}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/v1/messages');
    const headers = new Headers(init.headers as HeadersInit);
    // El SDK 1.x envía la clave como Authorization: Bearer (antes, x-api-key).
    expect(headers.get('x-api-key') ?? headers.get('authorization')).toContain('sk-ant-test');
    expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    const body = bodyOf(fetchMock);
    expect(body.system).toBe('Eres un tutor.');
    expect(body.messages).toEqual([{ role: 'user', content: 'Hola' }]);
    expect(body.output_config).toEqual({ format: { type: 'json_schema', schema }, effort: 'medium' });
    expect(body.fallbacks).toBe('default');
    expect(body).not.toHaveProperty('temperature');
  });

  it('convierte stop_reason "refusal" en un error de negativa', async () => {
    mockFetch(
      jsonResponse({
        id: 'msg_2',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [],
        stop_reason: 'refusal',
        stop_details: { type: 'refusal', category: 'cyber', explanation: 'no' },
        usage: { input_tokens: 1, output_tokens: 0 },
      }),
    );
    await expect(new AnthropicProvider(config).generateJSON(jsonReq)).rejects.toMatchObject({
      code: 'refusal',
    });
  });

  it('decide qué modelos admiten esfuerzo y fallback', () => {
    expect(supportsEffort('claude-haiku-5-5')).toBe(true);
    expect(supportsEffort('claude-sonnet-4-5')).toBe(false);
    expect(supportsServerFallback('claude-sonnet-5-5')).toBe(true);
    expect(supportsServerFallback('claude-haiku-5-5')).toBe(false);
  });
});

describe('isProviderReady', () => {
  it('requiere clave salvo en demo, Ollama o con URL propia', () => {
    expect(isProviderReady(defaultProviderConfig('demo'))).toBe(true);
    expect(isProviderReady(defaultProviderConfig('ollama'))).toBe(true);
    expect(isProviderReady(defaultProviderConfig('anthropic'))).toBe(false);
    expect(
      isProviderReady({ ...defaultProviderConfig('anthropic'), baseUrl: 'https://mi-proxy.example.com' }),
    ).toBe(true);
  });
});
