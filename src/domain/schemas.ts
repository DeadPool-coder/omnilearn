/**
 * Contrato de datos de Omnilearn.
 *
 * Dos familias de esquemas:
 *  1. Esquemas "AI" (sufijo `AI`): lo que se le pide al LLM. Sin IDs ni estado: el modelo
 *     solo produce contenido. Se convierten a JSON Schema estricto para cada proveedor.
 *  2. Esquemas de dominio: lo que guarda la app. El AIService normaliza la salida del LLM
 *     a estas estructuras (asigna course_id, module_id, lesson_id, status…).
 *
 * Los campos usan snake_case porque forman parte del contrato JSON (exportable/importable).
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enumeraciones
// ---------------------------------------------------------------------------

/** Nivel previo del estudiante: Desde cero / Conocimientos básicos / Intermedio / Avanzado. */
export const LEVELS = ['beginner', 'basic', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVELS)[number];

/** Enfoque: Teórico-conceptual / Práctico por proyectos / Preparación de examen / Resumen ejecutivo. */
export const FOCUSES = ['theoretical', 'practical', 'exam', 'executive'] as const;
export type Focus = (typeof FOCUSES)[number];

/** Tiempo disponible: micro-lecciones (~5 min) o sesiones profundas (30+ min por módulo). */
export const TIME_BUDGETS = ['micro', 'deep'] as const;
export type TimeBudget = (typeof TIME_BUDGETS)[number];

/** Estado guardado de una lección. "locked" no se guarda: se deriva (ver domain/progress.ts). */
export const LESSON_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type StoredLessonStatus = (typeof LESSON_STATUSES)[number];
export type LessonStatus = StoredLessonStatus | 'locked';

/** Niveles de la taxonomía de Bloom usados para equilibrar los quizzes. */
export const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze'] as const;
export type BloomLevel = (typeof BLOOM_LEVELS)[number];

export const COURSE_STATUSES = ['active', 'completed', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_SOURCES = ['ai', 'demo', 'sample', 'import'] as const;
export type CourseSource = (typeof COURSE_SOURCES)[number];

export const EXPANSION_KINDS = ['simpler', 'example', 'deeper', 'question'] as const;
export type ExpansionKind = (typeof EXPANSION_KINDS)[number];

export const FEYNMAN_VERDICTS = ['needs_work', 'partial', 'solid', 'excellent'] as const;
export type FeynmanVerdict = (typeof FEYNMAN_VERDICTS)[number];

/** Confianza declarada al responder (metacognición / calibración). */
export const CONFIDENCE_LEVELS = ['guess', 'probable', 'sure'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// ---------------------------------------------------------------------------
// 1. Esquemas que produce el LLM
// ---------------------------------------------------------------------------

const text = (description: string) => z.string().describe(description);

export const LessonOutlineAI = z.object({
  title: text('Título concreto y específico de la lección (no genérico).'),
  objective: text('Objetivo de aprendizaje observable: "Al terminar podrás…".'),
  key_concepts: z
    .array(text('Concepto clave, 1-5 palabras.'))
    .min(2)
    .max(6)
    .describe('Entre 2 y 6 conceptos clave que la lección enseña.'),
  estimated_minutes: z.number().int().min(3).max(90).describe('Minutos estimados de estudio.'),
});

export const ModuleOutlineAI = z.object({
  title: text('Título del módulo.'),
  description: text('Objetivo del módulo en 1-2 frases.'),
  lessons: z.array(LessonOutlineAI).min(1).max(8),
});

export const SyllabusAI = z.object({
  title: text('Título atractivo y claro de la ruta de aprendizaje.'),
  description: text('Descripción de la ruta en 2-3 frases: qué se aprenderá y para qué sirve.'),
  learning_outcomes: z.array(text('Resultado de aprendizaje medible.')).min(2).max(8),
  prerequisites: z
    .array(text('Conocimiento previo recomendado.'))
    .max(8)
    .describe('Lista vacía si no se necesitan prerrequisitos.'),
  modules: z.array(ModuleOutlineAI).min(1).max(10),
});
export type SyllabusDraft = z.infer<typeof SyllabusAI>;

export const QuizOptionAI = z.object({
  text: text('Texto de la opción.'),
  is_correct: z.boolean(),
  explanation: text('Por qué esta opción es correcta o incorrecta (1-2 frases).'),
});

export const QuizQuestionAI = z.object({
  question: text('Enunciado de la pregunta.'),
  concept: text('Concepto clave que evalúa la pregunta.'),
  bloom_level: z.enum(BLOOM_LEVELS),
  options: z.array(QuizOptionAI).length(4),
});

export const QuizAI = z.object({
  questions: z.array(QuizQuestionAI).min(3).max(5),
});
export type QuizDraft = z.infer<typeof QuizAI>;

export const FlashcardAI = z.object({
  front: text('Pregunta o pista (cara frontal). Una sola idea.'),
  back: text('Respuesta breve (menos de 40 palabras).'),
  concept: text('Concepto clave al que pertenece.'),
});

export const FlashcardsAI = z.object({
  cards: z.array(FlashcardAI).min(3).max(15),
});
export type FlashcardsDraft = z.infer<typeof FlashcardsAI>;

export const FeynmanEvaluationAI = z.object({
  rubric: z.object({
    accuracy: z.number().int().min(0).max(40).describe('Exactitud conceptual (0-40).'),
    completeness: z.number().int().min(0).max(30).describe('Cobertura de los conceptos clave (0-30).'),
    clarity: z.number().int().min(0).max(20).describe('Claridad y sencillez (0-20).'),
    examples: z.number().int().min(0).max(10).describe('Uso de ejemplos o analogías propias (0-10).'),
  }),
  verdict: z.enum(FEYNMAN_VERDICTS),
  summary: text('Retroalimentación general en 2-3 frases, en segunda persona.'),
  strengths: z.array(text('Algo que el estudiante entendió bien.')).max(6),
  gaps: z.array(text('Idea importante que faltó.')).max(6),
  misconceptions: z.array(text('Afirmación incorrecta o imprecisa y su corrección.')).max(6),
  jargon: z.array(text('Término técnico usado sin explicar.')).max(6),
  suggestions: z.array(text('Sugerencia concreta para mejorar la explicación.')).max(5),
  follow_up_question: text('Pregunta socrática para profundizar.'),
});
export type FeynmanEvaluationDraft = z.infer<typeof FeynmanEvaluationAI>;

// ---------------------------------------------------------------------------
// 2. Esquemas de dominio (lo que guarda la app)
// ---------------------------------------------------------------------------

export const GeneratorInfo = z.object({
  provider: z.string(),
  model: z.string(),
});
export type GeneratorInfo = z.infer<typeof GeneratorInfo>;

export const LessonRef = z.object({
  lesson_id: z.string(), // "1.1"
  title: z.string(),
  objective: z.string(),
  key_concepts: z.array(z.string()),
  estimated_minutes: z.number(),
  status: z.enum(LESSON_STATUSES),
});
export type LessonRef = z.infer<typeof LessonRef>;

export const Module = z.object({
  module_id: z.number().int(),
  title: z.string(),
  description: z.string(),
  lessons: z.array(LessonRef),
});
export type Module = z.infer<typeof Module>;

/** Ruta de aprendizaje: el contrato JSON del motor (ampliado con metadatos). */
export const Course = z.object({
  course_id: z.string(),
  topic: z.string(),
  title: z.string(),
  description: z.string(),
  level: z.enum(LEVELS),
  focus: z.enum(FOCUSES),
  time_budget: z.enum(TIME_BUDGETS),
  language: z.string(),
  goal: z.string(),
  learning_outcomes: z.array(z.string()),
  prerequisites: z.array(z.string()),
  modules: z.array(Module),
  status: z.enum(COURSE_STATUSES),
  sequential: z.boolean(),
  source: z.enum(COURSE_SOURCES),
  generator: GeneratorInfo.nullable(),
  source_material: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
  last_studied_at: z.number().nullable(),
  completed_at: z.number().nullable(),
});
export type Course = z.infer<typeof Course>;

export const QuizOption = z.object({
  id: z.string(),
  text: z.string(),
  is_correct: z.boolean(),
  explanation: z.string(),
});
export type QuizOption = z.infer<typeof QuizOption>;

export const QuizQuestion = z.object({
  id: z.string(),
  question: z.string(),
  concept: z.string(),
  bloom_level: z.enum(BLOOM_LEVELS),
  options: z.array(QuizOption),
});
export type QuizQuestion = z.infer<typeof QuizQuestion>;

export const Quiz = z.object({
  questions: z.array(QuizQuestion),
  generated_at: z.number(),
});
export type Quiz = z.infer<typeof Quiz>;

export const Expansion = z.object({
  id: z.string(),
  kind: z.enum(EXPANSION_KINDS),
  selection: z.string(),
  question: z.string(),
  content_markdown: z.string(),
  created_at: z.number(),
});
export type Expansion = z.infer<typeof Expansion>;

/** Contenido generado de una lección (se crea bajo demanda, "justo a tiempo"). */
export const LessonContent = z.object({
  id: z.string(), // `${course_id}:${lesson_id}`
  course_id: z.string(),
  lesson_id: z.string(),
  content_markdown: z.string(),
  generated_at: z.number(),
  generator: GeneratorInfo.nullable(),
  quiz: Quiz.nullable(),
  flashcards_generated: z.boolean(),
  expansions: z.array(Expansion),
});
export type LessonContent = z.infer<typeof LessonContent>;

/** Estado de repaso espaciado (FSRS). Fechas como timestamps (ms) para poder indexarlas. */
export const SrsState = z.object({
  due: z.number(),
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number().int().min(0).max(3), // 0 Nueva, 1 Aprendiendo, 2 Repaso, 3 Reaprendiendo
  last_review: z.number().nullable(),
});
export type SrsState = z.infer<typeof SrsState>;

export const FLASHCARD_SOURCES = ['ai', 'quiz_error', 'user', 'sample'] as const;
export type FlashcardSource = (typeof FLASHCARD_SOURCES)[number];

export const Flashcard = z.object({
  id: z.string(),
  course_id: z.string(),
  lesson_id: z.string().nullable(),
  front: z.string(),
  back: z.string(),
  concept: z.string(),
  source: z.enum(FLASHCARD_SOURCES),
  suspended: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
  srs: SrsState,
});
export type Flashcard = z.infer<typeof Flashcard>;

export const ReviewLogEntry = z.object({
  id: z.string(),
  card_id: z.string(),
  course_id: z.string(),
  rating: z.number().int().min(1).max(4), // 1 Otra vez, 2 Difícil, 3 Bien, 4 Fácil
  state_before: z.number().int(),
  reviewed_at: z.number(),
  scheduled_days: z.number(),
  duration_ms: z.number(),
});
export type ReviewLogEntry = z.infer<typeof ReviewLogEntry>;

export const QuizAnswer = z.object({
  question_id: z.string(),
  option_id: z.string(),
  correct: z.boolean(),
  confidence: z.enum(CONFIDENCE_LEVELS).nullable(),
  concept: z.string(),
});
export type QuizAnswer = z.infer<typeof QuizAnswer>;

export const QuizAttempt = z.object({
  id: z.string(),
  course_id: z.string(),
  lesson_id: z.string(),
  answers: z.array(QuizAnswer),
  score: z.number(), // 0-1
  passed: z.boolean(),
  created_at: z.number(),
});
export type QuizAttempt = z.infer<typeof QuizAttempt>;

export const FeynmanEvaluation = FeynmanEvaluationAI.extend({
  score: z.number().int().min(0).max(100),
});
export type FeynmanEvaluation = z.infer<typeof FeynmanEvaluation>;

export const FeynmanAttempt = z.object({
  id: z.string(),
  course_id: z.string(),
  lesson_id: z.string(),
  explanation: z.string(),
  evaluation: FeynmanEvaluation,
  created_at: z.number(),
});
export type FeynmanAttempt = z.infer<typeof FeynmanAttempt>;

export const ACTIVITY_TYPES = [
  'course_created',
  'lesson_started',
  'lesson_completed',
  'quiz_attempt',
  'review',
  'feynman',
  'course_completed',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ActivityEvent = z.object({
  id: z.string(),
  type: z.enum(ACTIVITY_TYPES),
  at: z.number(),
  day: z.string(), // YYYY-MM-DD en hora local
  course_id: z.string().nullable(),
  lesson_id: z.string().nullable(),
  value: z.number().nullable(),
});
export type ActivityEvent = z.infer<typeof ActivityEvent>;
