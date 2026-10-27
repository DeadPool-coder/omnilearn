import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AIError } from './errors';
import {
  cleanMarkdownOutput,
  extractJson,
  stripThinking,
  toProviderSchema,
  withSchemaInstructions,
  zodToProviderSchema,
} from './json';

describe('extractJson', () => {
  it('parsea JSON limpio', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('tolera vallas de código y texto alrededor', () => {
    expect(extractJson('```json\n{"a": [1, 2]}\n```')).toEqual({ a: [1, 2] });
    expect(extractJson('Aquí tienes:\n{"ok": true}\nEspero que sirva.')).toEqual({ ok: true });
  });

  it('repara comas finales y comillas simples', () => {
    expect(extractJson("{'a': 1, 'b': [1,2,],}")).toEqual({ a: 1, b: [1, 2] });
  });

  it('ignora el razonamiento <think>', () => {
    expect(extractJson('<think>pienso {no json}</think>{"x": "y"}')).toEqual({ x: 'y' });
  });

  it('lanza invalid_output si no hay JSON', () => {
    expect(() => extractJson('')).toThrow(AIError);
    try {
      extractJson('solo texto');
    } catch (error) {
      expect((error as AIError).code).toBe('invalid_output');
    }
  });
});

describe('toProviderSchema', () => {
  const Schema = z.object({
    title: z.string().min(3).describe('Título'),
    items: z
      .array(z.object({ n: z.number().int().min(1).max(5) }))
      .min(3)
      .max(5),
  });

  it('elimina restricciones no soportadas y fuerza objetos estrictos', () => {
    const schema = zodToProviderSchema(Schema) as Record<string, unknown>;
    const json = JSON.stringify(schema);
    expect(json).not.toMatch(/minItems|maxItems|minLength|minimum|maximum|\$schema/);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['title', 'items']);
    const items = (schema.properties as Record<string, { items: Record<string, unknown> }>).items.items;
    expect(items.additionalProperties).toBe(false);
    expect(items.required).toEqual(['n']);
  });

  it('conserva propiedades cuyo nombre coincide con una palabra clave', () => {
    const schema = toProviderSchema({
      type: 'object',
      properties: { format: { type: 'string' }, pattern: { type: 'string' } },
    });
    expect(Object.keys(schema.properties as object)).toEqual(['format', 'pattern']);
  });
});

describe('utilidades de texto del modelo', () => {
  it('withSchemaInstructions añade el esquema al último mensaje del usuario', () => {
    const msgs = withSchemaInstructions(
      [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hola' },
      ],
      { type: 'object' },
    );
    expect(msgs[1].content).toContain('JSON Schema');
    expect(msgs[0].content).toBe('sys');
  });

  it('cleanMarkdownOutput quita una valla envolvente pero no los bloques internos', () => {
    expect(cleanMarkdownOutput('```markdown\n# Hola\n```')).toBe('# Hola');
    const inner = 'Texto\n\n```python\nprint(1)\n```';
    expect(cleanMarkdownOutput(inner)).toBe(inner);
  });

  it('stripThinking elimina bloques de razonamiento', () => {
    expect(stripThinking('<think>a</think>Respuesta')).toBe('Respuesta');
  });
});
