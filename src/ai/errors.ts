/**
 * Errores de la capa de IA con un código estable y un mensaje listo para mostrar al usuario.
 * La UI decide qué hacer según `code` (reintentar, ir a Ajustes, etc.).
 */
export type AIErrorCode =
  | 'not_configured' // falta clave o modelo
  | 'auth' // clave inválida o sin permisos
  | 'rate_limit' // demasiadas peticiones / cuota agotada
  | 'network' // sin conexión, CORS o servidor inaccesible
  | 'bad_request' // el proveedor rechazó la petición (modelo inexistente, parámetro no soportado…)
  | 'refusal' // el modelo declinó responder
  | 'truncated' // la respuesta se cortó por límite de tokens
  | 'invalid_output' // la salida no cumplió el esquema tras los reintentos
  | 'server' // error 5xx del proveedor
  | 'aborted' // cancelado por el usuario
  | 'unknown';

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status?: number;
  readonly detail?: string;

  constructor(
    code: AIErrorCode,
    message: string,
    opts: { status?: number; detail?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = 'AIError';
    this.code = code;
    this.status = opts.status;
    this.detail = opts.detail;
  }

  /** ¿Tiene sentido ofrecer "Reintentar"? */
  get retryable(): boolean {
    return ['network', 'rate_limit', 'server', 'invalid_output', 'truncated', 'unknown'].includes(this.code);
  }
}

const DEFAULT_MESSAGES: Record<AIErrorCode, string> = {
  not_configured: 'Configura un proveedor de IA (clave y modelo) en Ajustes.',
  auth: 'La clave de API no es válida o no tiene permisos. Revísala en Ajustes.',
  rate_limit: 'El proveedor limitó las peticiones o se agotó la cuota. Espera un momento y reintenta.',
  network:
    'No se pudo contactar con el proveedor. Revisa tu conexión, la URL base y, si usas un modelo local, que el servidor permita peticiones desde este origen (CORS).',
  bad_request: 'El proveedor rechazó la petición. Revisa el nombre del modelo en Ajustes.',
  refusal: 'El modelo declinó generar este contenido. Prueba a reformular el tema.',
  truncated: 'La respuesta se cortó antes de terminar. Reintenta o usa un modelo con más capacidad.',
  invalid_output: 'El modelo devolvió una estructura inválida varias veces. Reintenta o prueba otro modelo.',
  server: 'El proveedor tuvo un error temporal. Reintenta en unos segundos.',
  aborted: 'Generación cancelada.',
  unknown: 'Ocurrió un error inesperado al generar contenido.',
};

export function aiError(
  code: AIErrorCode,
  opts: { status?: number; detail?: string; cause?: unknown; message?: string } = {},
) {
  return new AIError(code, opts.message ?? DEFAULT_MESSAGES[code], opts);
}

/** Traduce un código HTTP a nuestro código de error. */
export function codeFromStatus(status: number): AIErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (
    status === 400 ||
    status === 404 ||
    status === 405 ||
    status === 409 ||
    status === 413 ||
    status === 422
  )
    return 'bad_request';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof AIError) return error.code === 'aborted';
  if (error && typeof error === 'object' && 'name' in error) {
    const name = (error as { name?: string }).name;
    return name === 'AbortError' || name === 'APIUserAbortError';
  }
  return false;
}

/** Normaliza cualquier error a AIError. */
export function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  if (isAbortError(error)) return aiError('aborted', { cause: error });
  if (error instanceof TypeError) {
    // fetch lanza TypeError ante fallos de red y bloqueos CORS.
    return aiError('network', { detail: error.message, cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  return aiError('unknown', { detail: message, cause: error });
}

/** Texto para mostrar: mensaje + detalle técnico corto si existe. */
export function describeError(error: unknown): { title: string; detail?: string; code: AIErrorCode } {
  const e = toAIError(error);
  return { title: e.message, detail: e.detail, code: e.code };
}
