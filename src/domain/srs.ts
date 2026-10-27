/**
 * Repaso espaciado con FSRS (Free Spaced Repetition Scheduler, el algoritmo que usa Anki desde 2023).
 * Envolvemos ts-fsrs para guardar fechas como timestamps (indexables en IndexedDB).
 *
 * Calificaciones: 1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil.
 * `retention` es la retención deseada (0,9 = repasar cuando la probabilidad de recordar baja al 90 %).
 */
import { createEmptyCard, fsrs, type Card, type Grade, Rating, State } from 'ts-fsrs';
import type { SrsState } from './schemas';

export type ReviewRating = 1 | 2 | 3 | 4;

export const RATING_LABELS: Record<ReviewRating, string> = {
  1: 'Otra vez',
  2: 'Difícil',
  3: 'Bien',
  4: 'Fácil',
};

const schedulers = new Map<number, ReturnType<typeof fsrs>>();
function scheduler(retention: number) {
  const key = Math.round(retention * 1000) / 1000;
  let s = schedulers.get(key);
  if (!s) {
    s = fsrs({ request_retention: key, enable_fuzz: true, maximum_interval: 3650 });
    schedulers.set(key, s);
  }
  return s;
}

function fromCard(card: Card): SrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.getTime() : null,
  };
}

function toCard(srs: SrsState): Card {
  return {
    due: new Date(srs.due),
    stability: srs.stability,
    difficulty: srs.difficulty,
    elapsed_days: srs.elapsed_days,
    scheduled_days: srs.scheduled_days,
    learning_steps: srs.learning_steps,
    reps: srs.reps,
    lapses: srs.lapses,
    state: srs.state as State,
    last_review: srs.last_review !== null ? new Date(srs.last_review) : undefined,
  };
}

export function newSrsState(now: number = Date.now()): SrsState {
  return fromCard(createEmptyCard(new Date(now)));
}

const RATING_MAP: Record<ReviewRating, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

export function applyReview(srs: SrsState, rating: ReviewRating, now: number = Date.now(), retention = 0.9) {
  const result = scheduler(retention).next(toCard(srs), new Date(now), RATING_MAP[rating]);
  return { srs: fromCard(result.card), scheduledDays: result.card.scheduled_days };
}

/** Milisegundos hasta el próximo repaso para cada calificación (para etiquetar los botones). */
export function previewIntervals(
  srs: SrsState,
  now: number = Date.now(),
  retention = 0.9,
): Record<ReviewRating, number> {
  const preview = scheduler(retention).repeat(toCard(srs), new Date(now));
  return {
    1: preview[Rating.Again].card.due.getTime() - now,
    2: preview[Rating.Hard].card.due.getTime() - now,
    3: preview[Rating.Good].card.due.getTime() - now,
    4: preview[Rating.Easy].card.due.getTime() - now,
  };
}

/** Probabilidad estimada de recordar ahora (0-1). Las tarjetas nuevas devuelven null. */
export function retrievability(srs: SrsState, now: number = Date.now(), retention = 0.9): number | null {
  if (srs.state === State.New || srs.last_review === null) return null;
  const r = scheduler(retention).get_retrievability(toCard(srs), new Date(now), false);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : null;
}

export function isDue(srs: SrsState, now: number = Date.now()): boolean {
  return srs.due <= now;
}
