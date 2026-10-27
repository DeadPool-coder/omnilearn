/**
 * Normalización de la salida del LLM.
 *
 * Paso 1 (prepare*): arreglos benignos ANTES de validar con Zod (recortar espacios, convertir "5" en 5,
 * limitar listas demasiado largas, acotar números). Lo que no se puede arreglar sin inventar
 * (p. ej. menos preguntas de las pedidas) se deja para que la validación falle y el AIService pida una reparación.
 *
 * Paso 2 (build*): convertir el borrador validado en estructuras de dominio con IDs y estado.
 */
import type {
  Course,
  CourseSource,
  FeynmanEvaluation,
  FeynmanEvaluationDraft,
  FeynmanVerdict,
  FlashcardsDraft,
  GeneratorInfo,
  Quiz,
  QuizDraft,
  SyllabusDraft,
} from '@/domain/schemas';
import { FeynmanEvaluationAI, FlashcardsAI, QuizAI, SyllabusAI } from '@/domain/schemas';
import { uid } from '@/lib/id';
import type { SyllabusInput } from './prompts';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): unknown =>
  typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : v;
const arr = (v: unknown): unknown[] | unknown => (Array.isArray(v) ? v : v);
const toNumber = (v: unknown): unknown => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
};
const clampInt = (v: unknown, min: number, max: number): unknown => {
  const n = toNumber(v);
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : n;
};
const toBool = (v: unknown): unknown => (v === 'true' ? true : v === 'false' ? false : v);

/** Lista de strings: recorta, quita vacíos y duplicados, y limita la longitud. */
function stringList(v: unknown, max: number): unknown {
  if (!Array.isArray(v)) return v;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const s = typeof item === 'string' ? item.trim() : typeof item === 'number' ? String(item) : '';
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

/** Algunos modelos envuelven la respuesta: {"syllabus": {...}} o {"data": {...}}. */
function unwrap(raw: unknown, expectedKey: string): unknown {
  if (!isObj(raw)) return raw;
  if (expectedKey in raw) return raw;
  const values = Object.values(raw);
  if (values.length === 1 && isObj(values[0]) && expectedKey in values[0]) return values[0];
  return raw;
}

// ---------------------------------------------------------------------------
// Syllabus
// ---------------------------------------------------------------------------

export function prepareSyllabus(raw: unknown): unknown {
  const data = unwrap(raw, 'modules');
  if (!isObj(data)) return data;
  const modules = Array.isArray(data.modules)
    ? data.modules.slice(0, 10).map((m) => {
        if (!isObj(m)) return m;
        const lessons = Array.isArray(m.lessons)
          ? m.lessons.slice(0, 8).map((l) =>
              isObj(l)
                ? {
                    title: str(l.title),
                    objective: str(l.objective ?? l.description ?? ''),
                    key_concepts: stringList(l.key_concepts, 6),
                    estimated_minutes: clampInt(l.estimated_minutes ?? 10, 3, 90),
                  }
                : l,
            )
          : arr(m.lessons);
        return { title: str(m.title), description: str(m.description ?? ''), lessons };
      })
    : data.modules;
  return {
    title: str(data.title),
    description: str(data.description ?? ''),
    learning_outcomes: stringList(data.learning_outcomes ?? [], 8),
    prerequisites: stringList(data.prerequisites ?? [], 8),
    modules,
  };
}

export const SyllabusValidator = SyllabusAI;

export function buildCourse(
  draft: SyllabusDraft,
  input: SyllabusInput,
  opts: { generator: GeneratorInfo | null; source: CourseSource; sequential: boolean; now?: number },
): Course {
  const now = opts.now ?? Date.now();
  return {
    course_id: uid(),
    topic: input.topic.trim(),
    title: draft.title,
    description: draft.description,
    level: input.level,
    focus: input.focus,
    time_budget: input.time_budget,
    language: input.language,
    goal: input.goal.trim(),
    learning_outcomes: draft.learning_outcomes,
    prerequisites: draft.prerequisites,
    modules: draft.modules.map((m, mi) => ({
      module_id: mi + 1,
      title: m.title,
      description: m.description,
      lessons: m.lessons.map((l, li) => ({
        lesson_id: `${mi + 1}.${li + 1}`,
        title: l.title,
        objective: l.objective,
        key_concepts: l.key_concepts,
        estimated_minutes: l.estimated_minutes,
        status: 'pending' as const,
      })),
    })),
    status: 'active',
    sequential: opts.sequential,
    source: opts.source,
    generator: opts.generator,
    source_material: input.source_material.trim().slice(0, 20000),
    created_at: now,
    updated_at: now,
    last_studied_at: null,
    completed_at: null,
  };
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export function prepareQuiz(raw: unknown): unknown {
  const data = unwrap(raw, 'questions');
  if (!isObj(data) || !Array.isArray(data.questions)) return data;
  const questions = data.questions.slice(0, 5).map((q) => {
    if (!isObj(q)) return q;
    let options = Array.isArray(q.options)
      ? q.options.map((o) =>
          isObj(o)
            ? { text: str(o.text), is_correct: toBool(o.is_correct), explanation: str(o.explanation ?? '') }
            : o,
        )
      : q.options;
    // Si sobran opciones y hay exactamente una correcta, conservamos la correcta y tres incorrectas.
    if (Array.isArray(options) && options.length > 4) {
      const correct = options.filter((o) => isObj(o) && o.is_correct === true);
      if (correct.length === 1) {
        const wrong = options.filter((o) => isObj(o) && o.is_correct !== true).slice(0, 3);
        const keep = new Set([correct[0], ...wrong]);
        options = options.filter((o) => keep.has(o));
      }
    }
    const bloom = typeof q.bloom_level === 'string' ? q.bloom_level.trim().toLowerCase() : q.bloom_level;
    return { question: str(q.question), concept: str(q.concept ?? ''), bloom_level: bloom, options };
  });
  return { questions };
}

/** Además de la forma, exigimos exactamente una respuesta correcta y opciones no repetidas. */
export const QuizValidator = QuizAI.superRefine((quiz, ctx) => {
  quiz.questions.forEach((q, i) => {
    const correct = q.options.filter((o) => o.is_correct).length;
    if (correct !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['questions', i, 'options'],
        message: `debe haber exactamente una opción correcta (hay ${correct})`,
      });
    }
    const texts = new Set(q.options.map((o) => o.text.toLowerCase()));
    if (texts.size !== q.options.length) {
      ctx.addIssue({ code: 'custom', path: ['questions', i, 'options'], message: 'hay opciones repetidas' });
    }
  });
});

export function buildQuiz(draft: QuizDraft, now = Date.now()): Quiz {
  return {
    generated_at: now,
    questions: draft.questions.map((q, i) => ({
      id: `q${i + 1}`,
      question: q.question,
      concept: q.concept,
      bloom_level: q.bloom_level,
      options: q.options.map((o, j) => ({
        id: `q${i + 1}-${'abcd'[j] ?? j}`,
        text: o.text,
        is_correct: o.is_correct,
        explanation: o.explanation,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export function prepareFlashcards(raw: unknown): unknown {
  const data = unwrap(raw, 'cards');
  const list = Array.isArray(data) ? data : isObj(data) ? data.cards : undefined;
  if (!Array.isArray(list)) return data;
  const seen = new Set<string>();
  const cards = [];
  for (const c of list) {
    if (!isObj(c)) continue;
    const front = str(c.front ?? c.question);
    const back = str(c.back ?? c.answer);
    if (typeof front !== 'string' || typeof back !== 'string' || !front || !back) continue;
    const key = front.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({ front, back, concept: str(c.concept ?? '') });
    if (cards.length >= 15) break;
  }
  return { cards };
}

export const FlashcardsValidator = FlashcardsAI;

export type FlashcardDraft = FlashcardsDraft['cards'][number];

// ---------------------------------------------------------------------------
// Evaluación Feynman
// ---------------------------------------------------------------------------

export function prepareFeynman(raw: unknown): unknown {
  const data = unwrap(raw, 'rubric');
  if (!isObj(data)) return data;
  const rubric = isObj(data.rubric)
    ? {
        accuracy: clampInt(data.rubric.accuracy, 0, 40),
        completeness: clampInt(data.rubric.completeness, 0, 30),
        clarity: clampInt(data.rubric.clarity, 0, 20),
        examples: clampInt(data.rubric.examples, 0, 10),
      }
    : data.rubric;
  const verdict =
    typeof data.verdict === 'string' ? data.verdict.trim().toLowerCase().replace(/\s+/g, '_') : data.verdict;
  return {
    rubric,
    verdict,
    summary: str(data.summary ?? ''),
    strengths: stringList(data.strengths ?? [], 6),
    gaps: stringList(data.gaps ?? [], 6),
    misconceptions: stringList(data.misconceptions ?? [], 6),
    jargon: stringList(data.jargon ?? [], 6),
    suggestions: stringList(data.suggestions ?? [], 5),
    follow_up_question: str(data.follow_up_question ?? ''),
  };
}

export const FeynmanValidator = FeynmanEvaluationAI;

export function verdictForScore(score: number): FeynmanVerdict {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'solid';
  if (score >= 50) return 'partial';
  return 'needs_work';
}

/** La puntuación es la suma de la rúbrica; el veredicto se deriva de ella para que sean coherentes. */
export function buildFeynmanEvaluation(draft: FeynmanEvaluationDraft): FeynmanEvaluation {
  const { accuracy, completeness, clarity, examples } = draft.rubric;
  const score = Math.max(0, Math.min(100, accuracy + completeness + clarity + examples));
  return { ...draft, score, verdict: verdictForScore(score) };
}
