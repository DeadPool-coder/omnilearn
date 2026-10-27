#!/usr/bin/env node
/**
 * Proxy opcional de Omnilearn (Node ≥ 22, sin dependencias).
 *
 * Para qué sirve: usar Omnilearn con varias personas sin repartir claves de API. Las claves viven
 * en el servidor (variables de entorno); el navegador solo habla con este proxy.
 *
 *   Navegador ──► /openai/*     ──► OPENAI_BASE_URL (OpenAI, OpenRouter, Groq…)  + Authorization
 *             ──► /anthropic/*  ──► https://api.anthropic.com                     + x-api-key
 *             ──► /gemini/*     ──► https://generativelanguage.googleapis.com     + x-goog-api-key
 *             ──► /*            ──► archivos de ../dist (la app compilada), si existen
 *
 * Seguridad:
 *  - Solo se reenvían los endpoints que usa Omnilearn (generación y listado de modelos).
 *  - PROXY_TOKEN (opcional): si se define, cada petición debe traerlo como "clave de API".
 *    En Ajustes, pon la URL del proxy y escribe el token en el campo de la clave.
 *  - Límite de peticiones por IP y de tamaño del cuerpo.
 *  - CORS restringido a ALLOWED_ORIGINS (no hace falta si la app se sirve desde el propio proxy).
 *
 * Uso:  OPENAI_API_KEY=sk-… ANTHROPIC_API_KEY=sk-ant-… npm run proxy
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/** Endpoints permitidos por proveedor (expresiones sobre la ruta tras el prefijo). */
const ROUTES = {
  openai: {
    upstream: (env) => env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    allow: [/^\/chat\/completions$/, /^\/models$/],
    key: (env) => env.OPENAI_API_KEY,
    auth: (key) => ({ authorization: `Bearer ${key}` }),
  },
  anthropic: {
    upstream: (env) => env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    allow: [/^\/v1\/messages$/, /^\/v1\/models(\?.*)?$/],
    key: (env) => env.ANTHROPIC_API_KEY,
    auth: (key) => ({ 'x-api-key': key }),
  },
  gemini: {
    upstream: (env) => env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
    allow: [
      /^\/v1beta\/models(\?.*)?$/,
      /^\/v1beta\/models\/[\w.-]+:(generateContent|streamGenerateContent)(\?alt=sse)?$/,
    ],
    key: (env) => env.GEMINI_API_KEY,
    auth: (key) => ({ 'x-goog-api-key': key }),
  },
};

/** Cabeceras del cliente que nunca se reenvían (credenciales, hop-by-hop, navegador). */
const DROP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'authorization',
  'x-api-key',
  'x-goog-api-key',
  'cookie',
  'origin',
  'referer',
  'accept-encoding',
  'anthropic-dangerous-direct-browser-access',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

function parseOrigins(value) {
  return (value || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function json(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extra });
  res.end(JSON.stringify(body));
}

/** Credencial que trae el cliente (para validar PROXY_TOKEN). */
function clientCredential(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.headers['x-api-key'] || req.headers['x-goog-api-key'] || '';
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Ventana deslizante de 60 s por IP. */
function createRateLimiter(perMinute) {
  const hits = new Map();
  return (ip, now = Date.now()) => {
    if (hits.size > 10_000) {
      for (const [key, times] of hits) if (!times.some((t) => now - t < 60_000)) hits.delete(key);
    }
    const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length <= perMinute;
  };
}

export function createProxyServer(
  env = process.env,
  { distDir = resolve(HERE, '../dist'), fetchImpl = fetch } = {},
) {
  const origins = parseOrigins(env.ALLOWED_ORIGINS);
  const allowAnyOrigin = origins.includes('*');
  const limit = Number(env.MAX_BODY_BYTES || 2_000_000);
  const allowRequest = createRateLimiter(Number(env.RATE_LIMIT_PER_MIN || 60));
  const token = env.PROXY_TOKEN || '';

  return createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://proxy.local');
    const origin = req.headers.origin;
    const cors = {};
    let sameOrigin = false;
    try {
      sameOrigin = !!origin && new URL(origin).host === req.headers.host;
    } catch {
      sameOrigin = false;
    }
    if (origin && (sameOrigin || allowAnyOrigin || origins.includes(origin))) {
      cors['access-control-allow-origin'] = origin;
      cors.vary = 'Origin';
      cors['access-control-allow-methods'] = 'GET, POST, OPTIONS';
      cors['access-control-allow-headers'] =
        req.headers['access-control-request-headers'] || 'content-type, authorization';
      cors['access-control-max-age'] = '600';
    }

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(origin && !cors['access-control-allow-origin'] ? 403 : 204, cors);
        return res.end();
      }
      if (url.pathname === '/health') {
        return json(
          res,
          200,
          { ok: true, providers: Object.keys(ROUTES).filter((p) => ROUTES[p].key(env)) },
          cors,
        );
      }

      const [, prefix, ...rest] = url.pathname.split('/');
      const route = ROUTES[prefix];
      if (route) {
        if (origin && !cors['access-control-allow-origin'])
          return json(res, 403, { error: { message: 'Origen no permitido' } });
        const ip = req.socket.remoteAddress || 'desconocida';
        if (!allowRequest(ip))
          return json(res, 429, { error: { message: 'Demasiadas peticiones; espera un minuto.' } }, cors);
        if (token && clientCredential(req) !== token) {
          return json(res, 401, { error: { message: 'Token del proxy inválido' } }, cors);
        }
        const key = route.key(env);
        if (!key)
          return json(res, 503, { error: { message: `El proxy no tiene clave para ${prefix}` } }, cors);
        const path = `/${rest.join('/')}${url.search}`;
        if (!route.allow.some((re) => re.test(path))) {
          return json(res, 404, { error: { message: 'Endpoint no permitido por el proxy' } }, cors);
        }
        if (req.method !== 'GET' && req.method !== 'POST') {
          return json(res, 405, { error: { message: 'Método no permitido' } }, cors);
        }

        const headers = {};
        for (const [name, value] of Object.entries(req.headers)) {
          if (!DROP_HEADERS.has(name) && typeof value === 'string') headers[name] = value;
        }
        Object.assign(headers, route.auth(key));
        const body = req.method === 'POST' ? await readBody(req, limit) : undefined;
        const upstream = await fetchImpl(`${route.upstream(env).replace(/\/+$/, '')}${path}`, {
          method: req.method,
          headers,
          body,
        });
        const outHeaders = { ...cors };
        for (const name of ['content-type', 'cache-control', 'request-id', 'x-request-id', 'retry-after']) {
          const value = upstream.headers.get(name);
          if (value) outHeaders[name] = value;
        }
        res.writeHead(upstream.status, outHeaders);
        if (!upstream.body) return res.end();
        // Reenvío en streaming (SSE de lecciones incluido).
        Readable.fromWeb(upstream.body)
          .on('error', () => res.destroy())
          .pipe(res);
        return;
      }

      // Archivos estáticos de la app compilada (npm run build).
      if (req.method === 'GET' || req.method === 'HEAD') {
        const relative = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
        let file = resolve(distDir, relative || 'index.html');
        if (!file.startsWith(resolve(distDir)))
          return json(res, 400, { error: { message: 'Ruta inválida' } });
        try {
          if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
        } catch {
          file = join(distDir, 'index.html'); // HashRouter: cualquier ruta sirve la app
        }
        try {
          const content = await readFile(file);
          const type = MIME[extname(file)] || 'application/octet-stream';
          const immutable = file.includes(`${join(distDir, 'assets')}`);
          res.writeHead(200, {
            'content-type': type,
            'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
            'x-content-type-options': 'nosniff',
          });
          return res.end(req.method === 'HEAD' ? undefined : content);
        } catch {
          return json(res, 404, { error: { message: 'No hay build de la app. Ejecuta npm run build.' } });
        }
      }
      return json(res, 404, { error: { message: 'No encontrado' } }, cors);
    } catch (error) {
      if (!res.headersSent)
        json(res, error.status || 502, { error: { message: error.message || 'Error del proxy' } }, cors);
      else res.destroy();
    }
  });
}

// Ejecutado directamente: arrancar el servidor.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  createProxyServer().listen(port, () => {
    const available = Object.keys(ROUTES).filter((p) => ROUTES[p].key(process.env));
    console.log(`Omnilearn proxy en http://localhost:${port}`);
    console.log(
      `Proveedores con clave: ${available.length ? available.join(', ') : 'ninguno (define OPENAI_API_KEY, ANTHROPIC_API_KEY o GEMINI_API_KEY)'}`,
    );
    console.log(
      'En Ajustes, usa como URL base: /openai · /anthropic · /gemini/v1beta (precedidas de esta dirección).',
    );
    if (process.env.PROXY_TOKEN)
      console.log('PROXY_TOKEN activo: escribe el token en el campo "Clave de API".');
  });
}
