/**
 * Consultas reactivas a IndexedDB: los componentes se actualizan solos cuando cambian los datos.
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { lessonKey } from '@/db/repo';
import { flattenLessons } from '@/domain/progress';
import type { Course, Flashcard, QuizAttempt } from '@/domain/schemas';
import { retrievability } from '@/domain/srs';
import { bestQuizScores, calibrationStats, computeStreak, courseMastery } from '@/domain/stats';
import { useSettings } from '@/stores/settings';
import { dayKey } from '@/lib/dates';

/** Marca de tiempo que avanza cada `intervalMs` (para "vencidas ahora"). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCourses(): Course[] | undefined {
  return useLiveQuery(async () => {
    const courses = await db.courses.toArray();
    return courses.sort(
      (a, b) =>
        (b.last_studied_at ?? b.updated_at) - (a.last_studied_at ?? a.updated_at) ||
        b.created_at - a.created_at,
    );
  }, []);
}

export function useCourse(courseId: string | undefined): Course | null | undefined {
  return useLiveQuery(async () => (courseId ? ((await db.courses.get(courseId)) ?? null) : null), [courseId]);
}

export function useLessonContent(courseId: string | undefined, lessonId: string | undefined) {
  return useLiveQuery(
    async () =>
      courseId && lessonId ? ((await db.lessons.get(lessonKey(courseId, lessonId))) ?? null) : null,
    [courseId, lessonId],
  );
}

export function useDueCount(courseId?: string | null): number {
  const now = useNow();
  return (
    useLiveQuery(async () => {
      const due = await db.flashcards.where('srs.due').belowOrEqual(now).toArray();
      return due.filter((c) => !c.suspended && (!courseId || c.course_id === courseId)).length;
    }, [now, courseId]) ?? 0
  );
}

/** Retención media actual de las tarjetas ya repasadas, por lección. */
function retrievabilityByLesson(cards: Flashcard[], now: number, retention: number): Map<string, number> {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const card of cards) {
    if (!card.lesson_id || card.suspended) continue;
    const r = retrievability(card.srs, now, retention);
    if (r === null) continue;
    const acc = sums.get(card.lesson_id) ?? { sum: 0, n: 0 };
    acc.sum += r;
    acc.n += 1;
    sums.set(card.lesson_id, acc);
  }
  return new Map([...sums].map(([k, v]) => [k, v.sum / v.n]));
}

export interface CourseStats {
  mastery: number;
  bestQuiz: Map<string, number>;
  cards: number;
  dueCards: number;
  attempts: QuizAttempt[];
}

export function computeCourseStats(
  course: Course,
  attempts: QuizAttempt[],
  cards: Flashcard[],
  now: number,
  retention: number,
): CourseStats {
  const bestQuiz = bestQuizScores(attempts);
  return {
    mastery: courseMastery(course, bestQuiz, retrievabilityByLesson(cards, now, retention)),
    bestQuiz,
    cards: cards.length,
    dueCards: cards.filter((c) => !c.suspended && c.srs.due <= now).length,
    attempts,
  };
}

export function useCourseStats(course: Course | null | undefined): CourseStats | undefined {
  const now = useNow();
  const retention = useSettings((s) => s.desiredRetention);
  return useLiveQuery(async () => {
    if (!course) return undefined;
    const [attempts, cards] = await Promise.all([
      db.quizAttempts.where('course_id').equals(course.course_id).toArray(),
      db.flashcards.where('course_id').equals(course.course_id).toArray(),
    ]);
    return computeCourseStats(course, attempts, cards, now, retention);
  }, [course, now, retention]);
}

/** Estadísticas globales del panel principal. */
export function useDashboardStats() {
  const now = useNow();
  const retention = useSettings((s) => s.desiredRetention);
  return useLiveQuery(async () => {
    const [courses, activity, attempts, cards] = await Promise.all([
      db.courses.toArray(),
      db.activity.toArray(),
      db.quizAttempts.toArray(),
      db.flashcards.toArray(),
    ]);
    const days = new Map<string, number>();
    for (const a of activity) days.set(a.day, (days.get(a.day) ?? 0) + 1);
    const streak = computeStreak(days.keys());

    const lessonsCompleted = courses.reduce(
      (acc, c) => acc + flattenLessons(c).filter((f) => f.lesson.status === 'completed').length,
      0,
    );
    const masteryByCourse = new Map<string, number>();
    for (const course of courses) {
      const stats = computeCourseStats(
        course,
        attempts.filter((a) => a.course_id === course.course_id),
        cards.filter((c) => c.course_id === course.course_id),
        now,
        retention,
      );
      masteryByCourse.set(course.course_id, stats.mastery);
    }
    const started = courses.filter(
      (c) => c.status !== 'archived' && flattenLessons(c).some((f) => f.lesson.status !== 'pending'),
    );
    const avgMastery = started.length
      ? started.reduce((acc, c) => acc + (masteryByCourse.get(c.course_id) ?? 0), 0) / started.length
      : 0;

    const dueCards = cards.filter((c) => !c.suspended && c.srs.due <= now).length;
    const reviewsToday = activity.filter((a) => a.type === 'review' && a.day === dayKey(now)).length;

    return {
      streak,
      activityByDay: days,
      lessonsCompleted,
      masteryByCourse,
      avgMastery,
      dueCards,
      totalCards: cards.length,
      reviewsToday,
      calibration: calibrationStats(attempts.flatMap((a) => a.answers)),
    };
  }, [now, retention]);
}
