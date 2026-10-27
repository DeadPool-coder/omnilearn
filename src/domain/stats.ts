/**
 * Métricas de aprendizaje: racha, dominio por lección/ruta, calibración y conceptos débiles.
 * Funciones puras (sin acceso a la base de datos) para poder probarlas fácilmente.
 */
import { CONFIDENCE_META } from './labels';
import { flattenLessons } from './progress';
import type { Confidence, Course, QuizAnswer, QuizAttempt } from './schemas';
import { addDays, dayKey } from '@/lib/dates';

// ---------------------------------------------------------------------------
// Racha de estudio
// ---------------------------------------------------------------------------

export interface Streak {
  current: number;
  longest: number;
  activeToday: boolean;
}

/**
 * Días consecutivos con actividad. Si hoy aún no has estudiado, la racha sigue viva
 * (cuenta hasta ayer) hasta que termine el día.
 */
export function computeStreak(days: Iterable<string>, today: Date = new Date()): Streak {
  const set = new Set(days);
  const todayKey = dayKey(today);
  const activeToday = set.has(todayKey);

  let current = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (set.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev && dayKey(addDays(new Date(`${prev}T12:00:00`), 1)) === key) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = key;
  }
  return { current, longest: Math.max(longest, current), activeToday };
}

// ---------------------------------------------------------------------------
// Dominio (mastery)
// ---------------------------------------------------------------------------

/**
 * Dominio de una lección (0-1):
 *  - 60 % la mejor nota del quiz (comprensión demostrada),
 *  - 40 % la retención actual estimada de sus tarjetas (memoria a largo plazo, decae si no repasas).
 * Sin tarjetas repasadas aún, cuenta solo el quiz. Sin completar, como mucho la mitad.
 */
export function lessonMastery(input: {
  completed: boolean;
  bestQuizScore: number | null;
  retrievability: number | null;
}): number {
  const quiz = input.bestQuizScore ?? 0;
  if (!input.completed && input.bestQuizScore === null) return 0;
  const base = input.retrievability === null ? quiz : 0.6 * quiz + 0.4 * input.retrievability;
  return Math.max(0, Math.min(1, input.completed ? base : base * 0.5));
}

export function courseMastery(
  course: Course,
  bestQuizByLesson: Map<string, number>,
  retrievabilityByLesson: Map<string, number>,
): number {
  const lessons = flattenLessons(course).map((f) => f.lesson);
  if (!lessons.length) return 0;
  const sum = lessons.reduce(
    (acc, l) =>
      acc +
      lessonMastery({
        completed: l.status === 'completed',
        bestQuizScore: bestQuizByLesson.get(l.lesson_id) ?? null,
        retrievability: retrievabilityByLesson.get(l.lesson_id) ?? null,
      }),
    0,
  );
  return sum / lessons.length;
}

export function bestQuizScores(attempts: QuizAttempt[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of attempts) map.set(a.lesson_id, Math.max(map.get(a.lesson_id) ?? 0, a.score));
  return map;
}

// ---------------------------------------------------------------------------
// Calibración (metacognición)
// ---------------------------------------------------------------------------

export interface CalibrationBucket {
  confidence: Confidence;
  label: string;
  expected: number;
  total: number;
  correct: number;
  accuracy: number | null;
}

export interface Calibration {
  buckets: CalibrationBucket[];
  total: number;
  /** Error cuadrático medio entre confianza declarada y acierto (0 = perfecto, 0,25 = azar). */
  brier: number | null;
  /** Confianza media - acierto medio: > 0 sobreconfianza, < 0 infraconfianza. */
  bias: number | null;
}

export function calibrationStats(answers: QuizAnswer[]): Calibration {
  const rated = answers.filter((a): a is QuizAnswer & { confidence: Confidence } => a.confidence !== null);
  const buckets = (Object.keys(CONFIDENCE_META) as Confidence[]).map((confidence) => {
    const items = rated.filter((a) => a.confidence === confidence);
    const correct = items.filter((a) => a.correct).length;
    return {
      confidence,
      label: CONFIDENCE_META[confidence].label,
      expected: CONFIDENCE_META[confidence].expected,
      total: items.length,
      correct,
      accuracy: items.length ? correct / items.length : null,
    };
  });
  if (!rated.length) return { buckets, total: 0, brier: null, bias: null };
  let brierSum = 0;
  let confSum = 0;
  let correctSum = 0;
  for (const a of rated) {
    const p = CONFIDENCE_META[a.confidence].expected;
    const o = a.correct ? 1 : 0;
    brierSum += (p - o) ** 2;
    confSum += p;
    correctSum += o;
  }
  return {
    buckets,
    total: rated.length,
    brier: brierSum / rated.length,
    bias: (confSum - correctSum) / rated.length,
  };
}

// ---------------------------------------------------------------------------
// Conceptos débiles (para adaptar la siguiente lección)
// ---------------------------------------------------------------------------

/**
 * Conceptos fallados en el último intento de cada lección de la ruta, ordenados por frecuencia.
 * Se usan para que la siguiente lección empiece con un repaso breve de esos puntos.
 */
export function weakConcepts(attempts: QuizAttempt[], limit = 5): string[] {
  const latest = new Map<string, QuizAttempt>();
  for (const a of attempts) {
    const prev = latest.get(a.lesson_id);
    if (!prev || a.created_at > prev.created_at) latest.set(a.lesson_id, a);
  }
  const counts = new Map<string, number>();
  for (const attempt of latest.values()) {
    for (const answer of attempt.answers) {
      if (!answer.correct && answer.concept)
        counts.set(answer.concept, (counts.get(answer.concept) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([concept]) => concept);
}

// ---------------------------------------------------------------------------
// Mapa de calor de actividad
// ---------------------------------------------------------------------------

export interface HeatmapDay {
  key: string;
  date: Date;
  count: number;
}

/** Últimas `weeks` semanas completas (de lunes a domingo), terminando en la semana actual. */
export function activityHeatmap(
  countsByDay: Map<string, number>,
  weeks = 16,
  today: Date = new Date(),
): HeatmapDay[][] {
  const end = new Date(today);
  end.setHours(12, 0, 0, 0);
  const weekday = (end.getDay() + 6) % 7; // 0 = lunes
  const lastMonday = addDays(end, -weekday);
  const firstMonday = addDays(lastMonday, -(weeks - 1) * 7);
  const columns: HeatmapDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstMonday, w * 7 + d);
      const key = dayKey(date);
      column.push({ key, date, count: date > end ? -1 : (countsByDay.get(key) ?? 0) });
    }
    columns.push(column);
  }
  return columns;
}
