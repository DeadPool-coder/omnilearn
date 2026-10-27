/**
 * Construye las entradas de los prompts a partir de una ruta guardada.
 */
import { findLesson, flattenLessons } from '@/domain/progress';
import type { Course } from '@/domain/schemas';
import type { CourseBrief, LessonInput } from './prompts';

export function courseBrief(course: Course): CourseBrief {
  return {
    title: course.title,
    topic: course.topic,
    description: course.description,
    level: course.level,
    focus: course.focus,
    time_budget: course.time_budget,
    language: course.language,
    goal: course.goal,
  };
}

export function lessonInput(
  course: Course,
  lessonId: string,
  weakConcepts: string[] = [],
): LessonInput | null {
  const location = findLesson(course, lessonId);
  if (!location) return null;
  const flat = flattenLessons(course);
  const previous = flat.slice(Math.max(0, location.index - 4), location.index).map((f) => f.lesson.title);
  const next = flat.slice(location.index + 1, location.index + 4).map((f) => f.lesson.title);
  const { lesson, module } = location;
  return {
    course: courseBrief(course),
    module: { module_id: module.module_id, title: module.title, description: module.description },
    lesson: {
      lesson_id: lesson.lesson_id,
      title: lesson.title,
      objective: lesson.objective,
      key_concepts: lesson.key_concepts,
      estimated_minutes: lesson.estimated_minutes,
    },
    previous_lessons: previous,
    next_lessons: next,
    weak_concepts: weakConcepts,
    source_material: course.source_material,
  };
}
