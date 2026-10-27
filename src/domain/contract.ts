/**
 * Vista "contrato" de una ruta: solo los campos del contrato JSON del motor, sin metadatos internos
 * (fechas, proveedor, material de referencia…). Es lo que se muestra en la vista previa del temario
 * y lo que acepta la importación de un temario suelto (`courseFromContract` en db/backup.ts).
 */
import type { Course, Focus, Level, StoredLessonStatus, TimeBudget } from './schemas';

export interface LessonContract {
  lesson_id: string;
  title: string;
  objective: string;
  key_concepts: string[];
  estimated_minutes: number;
  status: StoredLessonStatus;
}

export interface ModuleContract {
  module_id: number;
  title: string;
  description: string;
  lessons: LessonContract[];
}

export interface CourseContract {
  course_id: string;
  topic: string;
  level: Level;
  focus: Focus;
  time_budget: TimeBudget;
  language: string;
  title: string;
  description: string;
  learning_outcomes: string[];
  prerequisites: string[];
  modules: ModuleContract[];
}

export function toContract(course: Course): CourseContract {
  return {
    course_id: course.course_id,
    topic: course.topic,
    level: course.level,
    focus: course.focus,
    time_budget: course.time_budget,
    language: course.language,
    title: course.title,
    description: course.description,
    learning_outcomes: course.learning_outcomes,
    prerequisites: course.prerequisites,
    modules: course.modules.map((m) => ({
      module_id: m.module_id,
      title: m.title,
      description: m.description,
      lessons: m.lessons.map((l) => ({
        lesson_id: l.lesson_id,
        title: l.title,
        objective: l.objective,
        key_concepts: l.key_concepts,
        estimated_minutes: l.estimated_minutes,
        status: l.status,
      })),
    })),
  };
}
