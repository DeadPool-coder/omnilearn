/**
 * Operaciones de datos de alto nivel. La UI no toca las tablas directamente: usa estas funciones,
 * que mantienen la coherencia (estado de lecciones, actividad, tarjetas, borrado en cascada).
 */
import { findLesson, withLessonStatus } from '@/domain/progress';
import type {
  ActivityType,
  Course,
  Expansion,
  FeynmanAttempt,
  Flashcard,
  FlashcardSource,
  LessonContent,
  Quiz,
  QuizAttempt,
  StoredLessonStatus,
} from '@/domain/schemas';
import { applyReview, newSrsState, type ReviewRating } from '@/domain/srs';
import { dayKey } from '@/lib/dates';
import { uid } from '@/lib/id';
import { db } from './db';

// ---------------------------------------------------------------------------
// Actividad
// ---------------------------------------------------------------------------

export async function logActivity(
  type: ActivityType,
  opts: { courseId?: string | null; lessonId?: string | null; value?: number | null; at?: number } = {},
) {
  const at = opts.at ?? Date.now();
  await db.activity.add({
    id: uid(),
    type,
    at,
    day: dayKey(at),
    course_id: opts.courseId ?? null,
    lesson_id: opts.lessonId ?? null,
    value: opts.value ?? null,
  });
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

export async function saveNewCourse(course: Course) {
  await db.courses.put(course);
  await logActivity('course_created', { courseId: course.course_id, at: course.created_at });
}

export async function getCourse(courseId: string) {
  return db.courses.get(courseId);
}

export async function updateCourse(courseId: string, changes: Partial<Course>) {
  await db.courses.update(courseId, { ...changes, updated_at: Date.now() });
}

export async function deleteCourse(courseId: string) {
  await db.transaction(
    'rw',
    [db.courses, db.lessons, db.flashcards, db.reviewLogs, db.quizAttempts, db.feynmanAttempts, db.activity],
    async () => {
      await db.courses.delete(courseId);
      await db.lessons.where('course_id').equals(courseId).delete();
      await db.flashcards.where('course_id').equals(courseId).delete();
      await db.reviewLogs.where('course_id').equals(courseId).delete();
      await db.quizAttempts.where('course_id').equals(courseId).delete();
      await db.feynmanAttempts.where('course_id').equals(courseId).delete();
      await db.activity.where('course_id').equals(courseId).delete();
    },
  );
}

/** Cambia el estado de una lección y, si la ruta queda completa, la marca como finalizada. */
export async function setLessonStatus(courseId: string, lessonId: string, status: StoredLessonStatus) {
  let becameComplete = false;
  let changed = false;
  await db.transaction('rw', db.courses, async () => {
    const course = await db.courses.get(courseId);
    if (!course) return;
    const current = findLesson(course, lessonId)?.lesson.status;
    const updated = withLessonStatus(course, lessonId, status);
    becameComplete = course.status !== 'completed' && updated.status === 'completed';
    changed =
      current !== updated.modules.flatMap((m) => m.lessons).find((l) => l.lesson_id === lessonId)?.status;
    await db.courses.put(updated);
  });
  if (changed && status === 'in_progress') await logActivity('lesson_started', { courseId, lessonId });
  if (changed && status === 'completed') await logActivity('lesson_completed', { courseId, lessonId });
  if (becameComplete) await logActivity('course_completed', { courseId });
  return { becameComplete };
}

export async function touchCourse(courseId: string) {
  await db.courses.update(courseId, { last_studied_at: Date.now() });
}

// ---------------------------------------------------------------------------
// Contenido de lecciones
// ---------------------------------------------------------------------------

export function lessonKey(courseId: string, lessonId: string) {
  return `${courseId}:${lessonId}`;
}

export async function getLessonContent(courseId: string, lessonId: string) {
  return db.lessons.get(lessonKey(courseId, lessonId));
}

export async function saveLessonContent(
  courseId: string,
  lessonId: string,
  markdown: string,
  generator: LessonContent['generator'],
) {
  const id = lessonKey(courseId, lessonId);
  const existing = await db.lessons.get(id);
  const content: LessonContent = {
    id,
    course_id: courseId,
    lesson_id: lessonId,
    content_markdown: markdown,
    generated_at: Date.now(),
    generator,
    // Si se regenera el texto, el quiz anterior deja de corresponder.
    quiz: null,
    flashcards_generated: existing?.flashcards_generated ?? false,
    expansions: existing?.expansions ?? [],
  };
  await db.lessons.put(content);
  return content;
}

export async function saveQuiz(courseId: string, lessonId: string, quiz: Quiz) {
  await db.lessons.update(lessonKey(courseId, lessonId), { quiz });
}

export async function addExpansion(courseId: string, lessonId: string, expansion: Expansion) {
  const id = lessonKey(courseId, lessonId);
  await db.transaction('rw', db.lessons, async () => {
    const lesson = await db.lessons.get(id);
    if (!lesson) return;
    await db.lessons.update(id, { expansions: [...lesson.expansions, expansion] });
  });
}

export async function removeExpansion(courseId: string, lessonId: string, expansionId: string) {
  const id = lessonKey(courseId, lessonId);
  await db.transaction('rw', db.lessons, async () => {
    const lesson = await db.lessons.get(id);
    if (!lesson) return;
    await db.lessons.update(id, { expansions: lesson.expansions.filter((e) => e.id !== expansionId) });
  });
}

// ---------------------------------------------------------------------------
// Flashcards y repaso espaciado
// ---------------------------------------------------------------------------

export interface NewCardInput {
  front: string;
  back: string;
  concept?: string;
}

export async function addFlashcards(
  cards: NewCardInput[],
  opts: { courseId: string; lessonId: string | null; source: FlashcardSource; now?: number },
): Promise<Flashcard[]> {
  const now = opts.now ?? Date.now();
  const existing = await db.flashcards.where('course_id').equals(opts.courseId).toArray();
  const seen = new Set(existing.map((c) => c.front.trim().toLowerCase()));
  const created: Flashcard[] = [];
  for (const card of cards) {
    const key = card.front.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    created.push({
      id: uid(),
      course_id: opts.courseId,
      lesson_id: opts.lessonId,
      front: card.front.trim(),
      back: card.back.trim(),
      concept: card.concept?.trim() ?? '',
      source: opts.source,
      suspended: false,
      created_at: now,
      updated_at: now,
      srs: newSrsState(now),
    });
  }
  if (created.length) await db.flashcards.bulkAdd(created);
  if (opts.lessonId && (opts.source === 'ai' || opts.source === 'sample')) {
    await db.lessons.update(lessonKey(opts.courseId, opts.lessonId), { flashcards_generated: true });
  }
  return created;
}

export async function updateFlashcard(
  id: string,
  changes: Partial<Pick<Flashcard, 'front' | 'back' | 'concept' | 'suspended'>>,
) {
  await db.flashcards.update(id, { ...changes, updated_at: Date.now() });
}

export async function deleteFlashcard(id: string) {
  await db.transaction('rw', db.flashcards, db.reviewLogs, async () => {
    await db.flashcards.delete(id);
    await db.reviewLogs.where('card_id').equals(id).delete();
  });
}

export async function reviewFlashcard(
  card: Flashcard,
  rating: ReviewRating,
  opts: { now?: number; durationMs?: number; retention?: number } = {},
) {
  const now = opts.now ?? Date.now();
  const { srs, scheduledDays } = applyReview(card.srs, rating, now, opts.retention ?? 0.9);
  await db.transaction('rw', db.flashcards, db.reviewLogs, async () => {
    await db.flashcards.update(card.id, { srs, updated_at: now });
    await db.reviewLogs.add({
      id: uid(),
      card_id: card.id,
      course_id: card.course_id,
      rating,
      state_before: card.srs.state,
      reviewed_at: now,
      scheduled_days: scheduledDays,
      duration_ms: opts.durationMs ?? 0,
    });
  });
  await logActivity('review', { courseId: card.course_id, value: rating, at: now });
  return srs;
}

/** Tarjetas vencidas (no suspendidas), primero las más atrasadas. */
export async function getDueCards(now: number = Date.now(), courseId?: string | null) {
  const due = await db.flashcards.where('srs.due').belowOrEqual(now).toArray();
  return due
    .filter((c) => !c.suspended && (!courseId || c.course_id === courseId))
    .sort((a, b) => a.srs.due - b.srs.due);
}

// ---------------------------------------------------------------------------
// Quiz y desafío Feynman
// ---------------------------------------------------------------------------

export async function recordQuizAttempt(
  attempt: Omit<QuizAttempt, 'id' | 'created_at'>,
  opts: { quiz: Quiz; errorsToCards: boolean },
) {
  const full: QuizAttempt = { ...attempt, id: uid(), created_at: Date.now() };
  await db.quizAttempts.add(full);
  await logActivity('quiz_attempt', {
    courseId: attempt.course_id,
    lessonId: attempt.lesson_id,
    value: attempt.score,
  });

  // Cuaderno de errores: cada fallo se convierte en una tarjeta de repaso.
  let errorCards: Flashcard[] = [];
  if (opts.errorsToCards) {
    const wrong = attempt.answers.filter((a) => !a.correct);
    const cards: NewCardInput[] = [];
    for (const answer of wrong) {
      const question = opts.quiz.questions.find((q) => q.id === answer.question_id);
      const correct = question?.options.find((o) => o.is_correct);
      if (!question || !correct) continue;
      cards.push({
        front: question.question,
        back: `${correct.text}\n\n${correct.explanation}`,
        concept: question.concept,
      });
    }
    if (cards.length) {
      errorCards = await addFlashcards(cards, {
        courseId: attempt.course_id,
        lessonId: attempt.lesson_id,
        source: 'quiz_error',
      });
    }
  }

  let becameComplete = false;
  if (attempt.passed) {
    ({ becameComplete } = await setLessonStatus(attempt.course_id, attempt.lesson_id, 'completed'));
  }
  return { attempt: full, errorCards, becameComplete };
}

export async function recordFeynmanAttempt(attempt: Omit<FeynmanAttempt, 'id' | 'created_at'>) {
  const full: FeynmanAttempt = { ...attempt, id: uid(), created_at: Date.now() };
  await db.feynmanAttempts.add(full);
  await logActivity('feynman', {
    courseId: attempt.course_id,
    lessonId: attempt.lesson_id,
    value: attempt.evaluation.score,
  });
  return full;
}

// ---------------------------------------------------------------------------
// Metadatos
// ---------------------------------------------------------------------------

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}
