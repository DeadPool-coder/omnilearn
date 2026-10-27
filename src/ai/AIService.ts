/**
 * AIService: la API pedagógica de Omnilearn, independiente del proveedor.
 *
 *   UI ──► AIService ──► prompts ──► LLMProvider (OpenAI | Claude | Gemini | Ollama | Demo)
 *                │                          │
 *                └── validación Zod ◄── extracción JSON ◄┘   (+ bucle de reparación)
 *
 * Garantía: los métodos estructurados devuelven SIEMPRE datos que cumplen el contrato de
 * domain/schemas.ts o lanzan un AIError. La interfaz nunca recibe JSON a medio formar.
 */
import { z } from 'zod';
import type { Course, FeynmanEvaluation, GeneratorInfo, Quiz } from '@/domain/schemas';
import { FeynmanEvaluationAI, FlashcardsAI, QuizAI, SyllabusAI } from '@/domain/schemas';
import { wordCount } from '@/lib/text';
import { aiError } from './errors';
import { cleanMarkdownOutput, extractJson, formatZodIssues, zodToProviderSchema } from './json';
import {
  buildCourse,
  buildFeynmanEvaluation,
  buildQuiz,
  FeynmanValidator,
  FlashcardsValidator,
  prepareFeynman,
  prepareFlashcards,
  prepareQuiz,
  prepareSyllabus,
  QuizValidator,
  SyllabusValidator,
  type FlashcardDraft,
} from './normalize';
import {
  buildExpansionMessages,
  buildFeynmanMessages,
  buildFlashcardsMessages,
  buildLessonMessages,
  buildPingMessages,
  buildQuizMessages,
  buildSyllabusMessages,
  type AssessmentInput,
  type ExpansionInput,
  type FeynmanInput,
  type LessonInput,
  type SyllabusInput,
} from './prompts';
import type { AITask, ChatMessage, JsonSchema, LLMProvider } from './types';

export interface AIServiceOptions {
  /** Reintentos de reparación cuando la salida no cumple el esquema (por defecto 2). */
  maxRepairAttempts?: number;
  /** Mensajes de progreso para la UI ("Corrigiendo formato…"). */
  onStatus?: (message: string) => void;
}

interface StructuredCall<T> {
  task: AITask;
  schemaName: string;
  aiSchema: z.ZodType;
  validator: z.ZodType<T>;
  prepare: (raw: unknown) => unknown;
  messages: ChatMessage[];
  taskInput: unknown;
  signal?: AbortSignal;
}

const PingSchema = z.object({ ok: z.boolean(), message: z.string() });

const schemaCache = new WeakMap<z.ZodType, JsonSchema>();
function providerSchema(schema: z.ZodType): JsonSchema {
  let cached = schemaCache.get(schema);
  if (!cached) {
    cached = zodToProviderSchema(schema);
    schemaCache.set(schema, cached);
  }
  return cached;
}

/** Quita un H1 inicial: la interfaz ya muestra el título de la lección. */
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+[^\n]+\n+/, '');
}

export class AIService {
  constructor(
    readonly provider: LLMProvider,
    private readonly options: AIServiceOptions = {},
  ) {}

  get generator(): GeneratorInfo {
    return { provider: this.provider.id, model: this.provider.model };
  }

  // -------------------------------------------------------------------------
  // Núcleo: llamada estructurada con validación y reparación
  // -------------------------------------------------------------------------

  private async structured<T>(call: StructuredCall<T>): Promise<T> {
    const schema = providerSchema(call.aiSchema);
    const maxRepairs = this.options.maxRepairAttempts ?? 2;
    let messages = call.messages;
    let problem = '';

    for (let attempt = 0; attempt <= maxRepairs; attempt++) {
      if (attempt > 0)
        this.options.onStatus?.(`Corrigiendo el formato de la respuesta (intento ${attempt + 1})…`);
      const raw = await this.provider.generateJSON({
        messages,
        schema,
        schemaName: call.schemaName,
        task: call.task,
        taskInput: call.taskInput,
        signal: call.signal,
      });

      let parsed: unknown;
      try {
        parsed = extractJson(raw);
      } catch {
        problem = '- La respuesta no era un JSON válido.';
        messages = this.repairMessages(call.messages, raw, problem);
        continue;
      }

      const result = call.validator.safeParse(call.prepare(parsed));
      if (result.success) return result.data;
      problem = formatZodIssues(result.error);
      messages = this.repairMessages(call.messages, raw, problem);
    }
    throw aiError('invalid_output', { detail: problem });
  }

  private repairMessages(base: ChatMessage[], raw: string, problem: string): ChatMessage[] {
    return [
      ...base,
      { role: 'assistant', content: raw.slice(0, 16000) || '(vacío)' },
      {
        role: 'user',
        content:
          'Tu respuesta anterior no cumple el formato requerido:\n' +
          problem +
          '\nDevuelve de nuevo la respuesta COMPLETA y corregida: solo el JSON, cumpliendo todas las reglas anteriores.',
      },
    ];
  }

  // -------------------------------------------------------------------------
  // API pública
  // -------------------------------------------------------------------------

  /** Genera el mapa de ruta (syllabus) y lo normaliza al contrato Course. */
  async generateSyllabus(
    input: SyllabusInput,
    opts: { sequential?: boolean; signal?: AbortSignal } = {},
  ): Promise<Course> {
    if (!input.topic.trim()) throw aiError('bad_request', { message: 'Escribe qué quieres aprender.' });
    const draft = await this.structured({
      task: 'syllabus',
      schemaName: 'syllabus',
      aiSchema: SyllabusAI,
      validator: SyllabusValidator,
      prepare: prepareSyllabus,
      messages: buildSyllabusMessages(input),
      taskInput: input,
      signal: opts.signal,
    });
    return buildCourse(draft, input, {
      generator: this.generator,
      source: this.provider.id === 'demo' ? 'demo' : 'ai',
      sequential: opts.sequential ?? true,
    });
  }

  /** Redacta la lección en Markdown, emitiendo fragmentos a medida que llegan. */
  async streamLesson(
    input: LessonInput,
    onDelta?: (delta: string, fullText: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const text = await this.provider.streamText({
      messages: buildLessonMessages(input),
      task: 'lesson',
      taskInput: input,
      signal,
      onDelta,
    });
    const cleaned = stripLeadingH1(cleanMarkdownOutput(text));
    if (wordCount(cleaned) < 40) {
      throw aiError('invalid_output', { detail: 'La lección generada es demasiado corta' });
    }
    return cleaned;
  }

  async generateQuiz(input: AssessmentInput, signal?: AbortSignal): Promise<Quiz> {
    const draft = await this.structured({
      task: 'quiz',
      schemaName: 'quiz',
      aiSchema: QuizAI,
      validator: QuizValidator,
      prepare: prepareQuiz,
      messages: buildQuizMessages(input),
      taskInput: input,
      signal,
    });
    return buildQuiz(draft);
  }

  async generateFlashcards(input: AssessmentInput, signal?: AbortSignal): Promise<FlashcardDraft[]> {
    const draft = await this.structured({
      task: 'flashcards',
      schemaName: 'flashcards',
      aiSchema: FlashcardsAI,
      validator: FlashcardsValidator,
      prepare: prepareFlashcards,
      messages: buildFlashcardsMessages(input),
      taskInput: input,
      signal,
    });
    return draft.cards;
  }

  async evaluateFeynman(input: FeynmanInput, signal?: AbortSignal): Promise<FeynmanEvaluation> {
    if (wordCount(input.explanation) < 5) {
      throw aiError('bad_request', { message: 'Escribe tu explicación antes de pedir la evaluación.' });
    }
    const draft = await this.structured({
      task: 'feynman',
      schemaName: 'feynman_evaluation',
      aiSchema: FeynmanEvaluationAI,
      validator: FeynmanValidator,
      prepare: prepareFeynman,
      messages: buildFeynmanMessages(input),
      taskInput: input,
      signal,
    });
    return buildFeynmanEvaluation(draft);
  }

  /** Acciones rápidas: más simple, ejemplo práctico, profundizar o pregunta libre. */
  async streamExpansion(
    input: ExpansionInput,
    onDelta?: (delta: string, fullText: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    if (input.kind === 'question' && !input.question.trim()) {
      throw aiError('bad_request', { message: 'Escribe tu pregunta.' });
    }
    const text = await this.provider.streamText({
      messages: buildExpansionMessages(input),
      task: 'expansion',
      taskInput: input,
      signal,
      onDelta,
    });
    return stripLeadingH1(cleanMarkdownOutput(text));
  }

  /** Comprueba la conexión con una petición estructurada mínima. */
  async ping(signal?: AbortSignal): Promise<{ latencyMs: number }> {
    const started = performance.now();
    await this.structured({
      task: 'ping',
      schemaName: 'ping',
      aiSchema: PingSchema,
      validator: PingSchema,
      prepare: (raw) => raw,
      messages: buildPingMessages(),
      taskInput: null,
      signal,
    });
    return { latencyMs: Math.round(performance.now() - started) };
  }
}

/** Número de preguntas y tarjetas según el tiempo disponible. */
export function assessmentSizes(course: Pick<Course, 'time_budget' | 'focus'>): {
  quiz: number;
  cards: number;
} {
  if (course.focus === 'executive') return { quiz: 3, cards: 4 };
  return course.time_budget === 'deep' ? { quiz: 5, cards: 8 } : { quiz: 3, cards: 5 };
}
