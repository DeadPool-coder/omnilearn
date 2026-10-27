// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error -- módulo JS sin tipos
import { createProxyServer } from './proxy.mjs';

interface Seen {
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let upstream: Server;
let proxy: Server;
let proxyUrl = '';
const seen: Seen[] = [];

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
    );
  });
}

beforeAll(async () => {
  upstream = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push({ url: req.url ?? '', headers: req.headers, body });
      if (req.url?.includes('stream')) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write('data: {"a":1}\n\n');
        setTimeout(() => res.end('data: [DONE]\n\n'), 20);
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const upstreamUrl = await listen(upstream);
  const dist = mkdtempSync(join(tmpdir(), 'omni-dist-'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Omnilearn</title>');
  proxy = createProxyServer(
    {
      OPENAI_API_KEY: 'sk-servidor',
      OPENAI_BASE_URL: `${upstreamUrl}/v1`,
      ANTHROPIC_API_KEY: 'sk-ant-servidor',
      ANTHROPIC_BASE_URL: upstreamUrl,
      GEMINI_API_KEY: 'AIza-servidor',
      GEMINI_BASE_URL: upstreamUrl,
      ALLOWED_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_PER_MIN: '50',
    },
    { distDir: dist },
  );
  proxyUrl = await listen(proxy);
});

afterAll(() => {
  upstream.close();
  proxy.close();
});

describe('proxy opcional', () => {
  it('reenvía a OpenAI-compatible inyectando la clave del servidor', async () => {
    const res = await fetch(`${proxyUrl}/openai/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer del-navegador',
        origin: 'http://localhost:5173',
      },
      body: JSON.stringify({ model: 'x' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const last = seen.at(-1)!;
    expect(last.url).toBe('/v1/chat/completions');
    expect(last.headers.authorization).toBe('Bearer sk-servidor');
    expect(last.body).toBe('{"model":"x"}');
  });

  it('para Claude cambia la credencial por x-api-key y quita la cabecera de navegador', async () => {
    await fetch(`${proxyUrl}/anthropic/v1/messages`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer proxy',
        'anthropic-version': '2026-10-21',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: '{}',
    });
    const last = seen.at(-1)!;
    expect(last.url).toBe('/v1/messages');
    expect(last.headers['x-api-key']).toBe('sk-ant-servidor');
    expect(last.headers.authorization).toBeUndefined();
    expect(last.headers['anthropic-dangerous-direct-browser-access']).toBeUndefined();
    expect(last.headers['anthropic-version']).toBe('2026-10-21');
  });

  it('reenvía el streaming SSE de Gemini', async () => {
    const res = await fetch(`${proxyUrl}/gemini/v1beta/models/gemini-x:streamGenerateContent?alt=sse`, {
      method: 'POST',
      body: '{}',
    });
    expect(await res.text()).toContain('[DONE]');
    expect(seen.at(-1)!.headers['x-goog-api-key']).toBe('AIza-servidor');
  });

  it('bloquea endpoints no permitidos, orígenes ajenos y responde al preflight', async () => {
    expect((await fetch(`${proxyUrl}/openai/files`, { method: 'POST', body: '{}' })).status).toBe(404);
    const foreign = await fetch(`${proxyUrl}/openai/chat/completions`, {
      method: 'POST',
      headers: { origin: 'https://malicioso.example' },
      body: '{}',
    });
    expect(foreign.status).toBe(403);
    const preflight = await fetch(`${proxyUrl}/openai/chat/completions`, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-headers': 'content-type, x-stainless-os',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-headers')).toContain('x-stainless-os');
  });

  it('sirve la app compilada en cualquier ruta', async () => {
    const res = await fetch(`${proxyUrl}/cualquier/ruta`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Omnilearn');
    const traversal = await fetch(`${proxyUrl}/..%2F..%2Fetc%2Fpasswd`);
    expect(await traversal.text()).not.toContain('root:');
  });

  it('exige PROXY_TOKEN cuando está configurado', async () => {
    const guarded = createProxyServer({
      OPENAI_API_KEY: 'k',
      PROXY_TOKEN: 'secreto',
      OPENAI_BASE_URL: 'http://127.0.0.1:1',
    });
    const url = await listen(guarded);
    const denied = await fetch(`${url}/openai/models`, { headers: { authorization: 'Bearer otro' } });
    expect(denied.status).toBe(401);
    guarded.close();
  });
});
