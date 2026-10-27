import { AIError, aiError, codeFromStatus, isAbortError } from './errors';

/** Extrae un mensaje legible del cuerpo de error de cualquier proveedor. */
function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return typeof body === 'string' ? body.slice(0, 500) : undefined;
  const b = body as Record<string, unknown>;
  const err = b.error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
  }
  if (typeof b.message === 'string') return b.message;
  return undefined;
}

export async function errorFromResponse(res: Response): Promise<AIError> {
  let detail: string | undefined;
  try {
    const textBody = await res.text();
    try {
      detail = extractErrorMessage(JSON.parse(textBody)) ?? textBody.slice(0, 500);
    } catch {
      detail = textBody.slice(0, 500);
    }
  } catch {
    detail = undefined;
  }
  const code = codeFromStatus(res.status);
  return aiError(code, {
    status: res.status,
    detail: detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`,
  });
}

/** fetch con errores normalizados (red/CORS, cancelación, HTTP ≥ 400). */
export async function request(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    if (isAbortError(error) || init.signal?.aborted) throw aiError('aborted', { cause: error });
    throw aiError('network', {
      detail: error instanceof Error ? error.message : String(error),
      cause: error,
    });
  }
  if (!res.ok) throw await errorFromResponse(res);
  return res;
}

export async function requestJson<T = unknown>(url: string, init: RequestInit): Promise<T> {
  const res = await request(url, init);
  try {
    return (await res.json()) as T;
  } catch (error) {
    throw aiError('invalid_output', {
      detail: 'El proveedor devolvió una respuesta que no es JSON',
      cause: error,
    });
  }
}

/** Lee un cuerpo en streaming línea a línea (decodificando UTF-8 correctamente entre fragmentos). */
export async function* readLines(res: Response, signal?: AbortSignal): AsyncGenerator<string> {
  if (!res.body) throw aiError('network', { detail: 'La respuesta no tiene cuerpo para streaming' });
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) throw aiError('aborted');
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) throw aiError('aborted', { cause: error });
        throw aiError('network', { detail: 'Se interrumpió la conexión durante el streaming', cause: error });
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        yield line;
        newline = buffer.indexOf('\n');
      }
    }
    buffer += decoder.decode();
    if (buffer.length) yield buffer.replace(/\r$/, '');
  } finally {
    reader.releaseLock();
  }
}

/** Server-Sent Events: devuelve el contenido de cada evento `data:` (ya unido si ocupa varias líneas). */
export async function* readSSE(
  res: Response,
  signal?: AbortSignal,
): AsyncGenerator<{ event?: string; data: string }> {
  let event: string | undefined;
  let dataLines: string[] = [];
  for await (const line of readLines(res, signal)) {
    if (line === '') {
      if (dataLines.length) yield { event, data: dataLines.join('\n') };
      event = undefined;
      dataLines = [];
      continue;
    }
    if (line.startsWith(':')) continue; // comentario / keep-alive
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  if (dataLines.length) yield { event, data: dataLines.join('\n') };
}

/** Une una URL base con una ruta sin duplicar barras. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}
