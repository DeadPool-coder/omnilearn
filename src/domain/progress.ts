/**
 * Progreso de una ruta: estados de lección, desbloqueo por dominio y siguiente lección.
 *
 * "Bloqueada" no se guarda: se deriva. Con desbloqueo secuencial (aprendizaje por dominio),
 * una lección pendiente queda bloqueada hasta completar (aprobar el quiz de) la anterior.
 */
import type { Course, LessonRef, LessonStatus, Module, StoredLessonStatus } from './schemas';

export interface FlatLesson {
  module: Module;
  lesson: LessonRef;
  index: number;
}

export function flattenLessons(course: Course): FlatLesson[] {
  const out: FlatLesson[] = [];
  for (const module of course.modules) {
    for (const lesson of module.lessons) out.push({ module, lesson, index: out.length });
  }
  return out;
}

export function lessonStatuses(course: Course): Map<string, LessonStatus> {
  const flat = flattenLessons(course);
  const map = new Map<string, LessonStatus>();
  flat.forEach(({ lesson }, i) => {
    const prev = flat[i - 1]?.lesson;
    const locked = course.sequential && lesson.status === 'pending' && !!prev && prev.status !== 'completed';
    map.set(lesson.lesson_id, locked ? 'locked' : lesson.status);
  });
  return map;
}

export function displayStatus(course: Course, lessonId: string): LessonStatus {
  return lessonStatuses(course).get(lessonId) ?? 'pending';
}

export interface CourseProgress {
  completed: number;
  inProgress: number;
  total: number;
  percent: number;
  minutesTotal: number;
  minutesLeft: number;
}

export function courseProgress(course: Course): CourseProgress {
  const lessons = flattenLessons(course).map((f) => f.lesson);
  const completed = lessons.filter((l) => l.status === 'completed');
  const minutesTotal = lessons.reduce((acc, l) => acc + l.estimated_minutes, 0);
  const minutesDone = completed.reduce((acc, l) => acc + l.estimated_minutes, 0);
  return {
    completed: completed.length,
    inProgress: lessons.filter((l) => l.status === 'in_progress').length,
    total: lessons.length,
    percent: lessons.length ? Math.round((completed.length / lessons.length) * 100) : 0,
    minutesTotal,
    minutesLeft: Math.max(0, minutesTotal - minutesDone),
  };
}

export interface LessonLocation extends FlatLesson {
  prev: FlatLesson | null;
  next: FlatLesson | null;
  total: number;
}

export function findLesson(course: Course, lessonId: string): LessonLocation | null {
  const flat = flattenLessons(course);
  const i = flat.findIndex((f) => f.lesson.lesson_id === lessonId);
  if (i < 0) return null;
  return { ...flat[i], prev: flat[i - 1] ?? null, next: flat[i + 1] ?? null, total: flat.length };
}

/** La lección por la que continuar: la que está en curso o la primera disponible sin completar. */
export function nextLesson(course: Course): FlatLesson | null {
  const flat = flattenLessons(course);
  const statuses = lessonStatuses(course);
  return (
    flat.find((f) => f.lesson.status === 'in_progress') ??
    flat.find((f) => statuses.get(f.lesson.lesson_id) === 'pending') ??
    null
  );
}

/** Copia inmutable de la ruta con el nuevo estado de una lección. */
export function withLessonStatus(
  course: Course,
  lessonId: string,
  status: StoredLessonStatus,
  now = Date.now(),
): Course {
  const modules = course.modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      if (l.lesson_id !== lessonId) return l;
      // Una lección completada no vuelve a "en curso" al reabrirla.
      if (l.status === 'completed' && status === 'in_progress') return l;
      return { ...l, status };
    }),
  }));
  const updated: Course = { ...course, modules, updated_at: now, last_studied_at: now };
  const allDone = flattenLessons(updated).every((f) => f.lesson.status === 'completed');
  if (allDone && updated.status === 'active') {
    updated.status = 'completed';
    updated.completed_at = now;
  }
  return updated;
}

export function isCourseComplete(course: Course): boolean {
  return flattenLessons(course).every((f) => f.lesson.status === 'completed');
}
