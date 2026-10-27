/**
 * Instalador del curso de ejemplo "Aprender a aprender" (se carga bajo demanda). Se instala la primera vez que se abre
 * la app, para que el panel no empiece vacío y se pueda probar todo el flujo sin clave de API.
 */
import { buildQuiz, prepareQuiz, QuizValidator } from '@/ai/normalize';
import { SAMPLE_COURSE, SAMPLE_COURSE_ID, SAMPLE_LESSONS } from '@/data/sample';
import type { Course, LessonContent } from '@/domain/schemas';
import { db } from './db';
import { logActivity } from './repo';

export function buildSampleCourse(now = Date.now()): Course {
  return {
    ...SAMPLE_COURSE,
    course_id: SAMPLE_COURSE_ID,
    modules: SAMPLE_COURSE.modules.map((m, mi) => ({
      module_id: mi + 1,
      title: m.title,
      description: m.description,
      lessons: m.lessons.map((l, li) => ({
        ...l,
        lesson_id: `${mi + 1}.${li + 1}`,
        status: 'pending' as const,
      })),
    })),
    status: 'active',
    sequential: true,
    source: 'sample',
    generator: null,
    source_material: '',
    created_at: now,
    updated_at: now,
    last_studied_at: null,
    completed_at: null,
  };
}

export function buildSampleLessons(now = Date.now()): LessonContent[] {
  return Object.entries(SAMPLE_LESSONS).map(([lessonId, lesson]) => {
    // Validamos el quiz de ejemplo con el mismo esquema que la salida de la IA.
    const draft = QuizValidator.parse(prepareQuiz(lesson.quiz));
    return {
      id: `${SAMPLE_COURSE_ID}:${lessonId}`,
      course_id: SAMPLE_COURSE_ID,
      lesson_id: lessonId,
      content_markdown: lesson.markdown.trim(),
      generated_at: now,
      generator: null,
      quiz: buildQuiz(draft, now),
      flashcards_generated: false,
      expansions: [],
    };
  });
}

/** Tarjetas preparadas de una lección del curso de ejemplo (en lugar de pedirlas a la IA). */
export function sampleFlashcards(lessonId: string) {
  return SAMPLE_LESSONS[lessonId]?.flashcards ?? [];
}

export async function installSampleCourse() {
  const now = Date.now();
  await db.transaction('rw', db.courses, db.lessons, async () => {
    await db.courses.put(buildSampleCourse(now));
    await db.lessons.bulkPut(buildSampleLessons(now));
  });
  await logActivity('course_created', { courseId: SAMPLE_COURSE_ID, at: now });
}
