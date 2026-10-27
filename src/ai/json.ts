import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';
import { aiError } from './errors';
import type { ChatMessage, JsonSchema } from './types';

/** Quita bloques de razonamiento (<think>…</think>) que algunos modelos locales incluyen en la salida. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '');
}

/** Quita una valla de código envolvente (```json … ``` o ```markdown … ```). */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```\s*$/.exec(trimmed);
  return match ? match[1] : trimmed;
}

/** Limpia la salida Markdown de una lección: sin razonamiento ni valla envolvente. */
export function cleanMarkdownOutput(text: string): string {
  const withoutThinking = stripThinking(text).trim();
  // Solo quitamos la valla si envuelve TODO el documento (no bloques de código internos).
  if (/^```(markdown|md)?\s*\n/i.test(withoutThinking) && withoutThinking.endsWith('```')) {
    return stripCodeFence(withoutThinking).trim();
  }
  return withoutThinking;
}

/**
 * Extrae un valor JSON de la respuesta de un modelo, tolerando:
 * vallas de código, texto antes/después, comas sobrantes, comillas simples o JSON truncado.
 */
export function extractJson(raw: string): unknown {
  const text = stripCodeFence(stripThinking(raw)).trim();
  if (!text) throw aiError('invalid_output', { detail: 'Respuesta vacía' });

  const attempts: string[] = [text];
  const start = text.search(/[[{]/);
  if (start > 0) attempts.push(text.slice(start));
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start >= 0 && lastBrace > start) attempts.push(text.slice(start, lastBrace + 1));

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // probamos la siguiente variante
    }
  }
  for (const candidate of attempts.slice(1).concat(attempts[0])) {
    try {
      return JSON.parse(jsonrepair(candidate));
    } catch {
      // seguimos
    }
  }
  throw aiError('invalid_output', { detail: 'La respuesta no contiene JSON válido' });
}

/** Palabras clave de JSON Schema que no todos los proveedores aceptan en modo estricto. */
const UNSUPPORTED_KEYWORDS = new Set([
  '$schema',
  'minItems',
  'maxItems',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'pattern',
  'format',
  'default',
  'uniqueItems',
  'minProperties',
  'maxProperties',
]);

/**
 * Convierte el JSON Schema generado por Zod en el "mínimo común denominador" que aceptan
 * OpenAI (strict), Claude (structured outputs), Gemini (responseJsonSchema) y Ollama (format):
 *  - sin restricciones numéricas/longitud (Zod las valida después en el cliente);
 *  - todos los objetos con additionalProperties: false y todas sus propiedades en required.
 */
export function toProviderSchema(schema: JsonSchema): JsonSchema {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== 'object') return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (UNSUPPORTED_KEYWORDS.has(key)) continue;
      if (key === 'properties' && value && typeof value === 'object') {
        out.properties = Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, visit(v)]),
        );
        continue;
      }
      out[key] = visit(value);
    }
    if (out.type === 'object' && out.properties && typeof out.properties === 'object') {
      out.additionalProperties = false;
      out.required = Object.keys(out.properties as Record<string, unknown>);
    }
    return out;
  };
  return visit(schema) as JsonSchema;
}

/** JSON Schema listo para proveedores a partir de un esquema Zod. */
export function zodToProviderSchema(schema: z.ZodType): JsonSchema {
  return toProviderSchema(z.toJSONSchema(schema) as JsonSchema);
}

/**
 * Para proveedores sin salida estructurada nativa (o como respaldo):
 * añade el esquema y la orden de responder solo JSON al último mensaje del usuario.
 */
export function withSchemaInstructions(messages: ChatMessage[], schema: JsonSchema): ChatMessage[] {
  const instruction =
    '\n\n---\nFORMATO DE RESPUESTA OBLIGATORIO: responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional, sin ```), ' +
    'que cumpla exactamente este JSON Schema:\n' +
    JSON.stringify(schema);
  const copy = messages.map((m) => ({ ...m }));
  for (let i = copy.length - 1; i >= 0; i--) {
    if (copy[i].role === 'user') {
      copy[i] = { ...copy[i], content: copy[i].content + instruction };
      return copy;
    }
  }
  return [...copy, { role: 'user', content: instruction.trim() }];
}

/** Lista legible de problemas de validación de Zod para el prompt de reparación. */
export function formatZodIssues(error: z.ZodError, max = 12): string {
  return error.issues
    .slice(0, max)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : '(raíz)';
      return `- ${path}: ${issue.message}`;
    })
    .join('\n');
}

/** Separa los mensajes de sistema del resto (Claude y Gemini los reciben aparte). */
export function splitSystem(messages: ChatMessage[]): { system: string; rest: ChatMessage[] } {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  return { system, rest };
}
