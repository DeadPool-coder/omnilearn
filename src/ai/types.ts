/**
 * Contrato entre el AIService (lógica pedagógica) y los proveedores de LLM (transporte).
 *
 * Un proveedor solo sabe hacer dos cosas:
 *  - generateJSON: devolver texto JSON que cumpla un JSON Schema (con el mecanismo nativo
 *    del proveedor si lo tiene, o con instrucciones en el prompt si no).
 *  - streamText: devolver texto libre (Markdown) emitiendo fragmentos a medida que llegan.
 *
 * Todo lo demás (prompts, validación con Zod, reparación, normalización) vive en AIService.
 * Así, conectar un LLM nuevo es implementar esta interfaz y registrarlo en providers/index.ts.
 */

export type ProviderId = 'demo' | 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type JsonSchema = Record<string, unknown>;

/** Tareas del motor. El proveedor demo las usa para simular respuestas; los reales las ignoran. */
export type AITask = 'syllabus' | 'lesson' | 'quiz' | 'flashcards' | 'feynman' | 'expansion' | 'ping';

interface BaseRequest {
  messages: ChatMessage[];
  task: AITask;
  /** Entrada estructurada de la tarea (solo informativa para proveedores reales). */
  taskInput?: unknown;
  signal?: AbortSignal;
}

export interface JSONRequest extends BaseRequest {
  schema: JsonSchema;
  schemaName: string;
}

export interface TextStreamRequest extends BaseRequest {
  onDelta?: (delta: string, fullText: string) => void;
}

export interface LLMProvider {
  readonly id: ProviderId;
  readonly model: string;
  /** Devuelve el texto crudo de la respuesta (se espera JSON). */
  generateJSON(req: JSONRequest): Promise<string>;
  /** Devuelve el texto completo; llama a onDelta con cada fragmento. */
  streamText(req: TextStreamRequest): Promise<string>;
  /** Lista de modelos disponibles para la clave/servidor configurados (opcional). */
  listModels?(signal?: AbortSignal): Promise<string[]>;
}

export type StructuredMode = 'json_schema' | 'json_object' | 'none';
export type ClaudeEffort = 'low' | 'medium' | 'high';

/** Configuración de un proveedor tal como se guarda en Ajustes. */
export interface ProviderConfig {
  id: ProviderId;
  apiKey: string;
  model: string;
  /** URL base opcional (proxy propio, OpenRouter, LM Studio, servidor Ollama remoto…). */
  baseUrl: string;
  /** Solo OpenAI-compatible: cómo forzar JSON. */
  structuredMode?: StructuredMode;
  /** Solo Claude: nivel de esfuerzo de razonamiento. */
  effort?: ClaudeEffort;
  /** Solo demo: retardo entre fragmentos simulados (ms). */
  demoDelayMs?: number;
}
