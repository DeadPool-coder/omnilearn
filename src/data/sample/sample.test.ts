import { describe, expect, it } from 'vitest';
import { FlashcardsValidator, prepareFlashcards, prepareQuiz, QuizValidator } from '@/ai/normalize';
import { Course, LessonContent } from '@/domain/schemas';
import { buildSampleCourse, buildSampleLessons } from '@/db/sampleInstaller';
import { SAMPLE_COURSE, SAMPLE_LESSONS } from './index';

describe('curso de ejemplo', () => {
  const lessonIds = SAMPLE_COURSE.modules.flatMap((m, mi) => m.lessons.map((_, li) => `${mi + 1}.${li + 1}`));

  it('cumple el contrato Course y tiene contenido para cada lección', () => {
    expect(() => Course.parse(buildSampleCourse())).not.toThrow();
    expect(Object.keys(SAMPLE_LESSONS).sort()).toEqual([...lessonIds].sort());
    for (const content of buildSampleLessons()) expect(() => LessonContent.parse(content)).not.toThrow();
  });

  it.each(lessonIds)('la lección %s tiene estructura pedagógica completa y evaluaciones válidas', (id) => {
    const lesson = SAMPLE_LESSONS[id];
    expect(lesson.markdown).toContain('> **Concepto clave:**');
    expect(lesson.markdown).toContain('## Errores frecuentes');
    expect(lesson.markdown).toContain('## Resumen');
    expect(lesson.markdown).toContain('## Para pensar');
    expect(lesson.markdown).not.toContain('${');
    expect(QuizValidator.safeParse(prepareQuiz(lesson.quiz)).success).toBe(true);
    expect(FlashcardsValidator.safeParse(prepareFlashcards({ cards: lesson.flashcards })).success).toBe(true);
    // Cada pregunta evalúa un concepto clave de su lección.
    const concepts = SAMPLE_COURSE.modules.flatMap((m) => m.lessons)[lessonIds.indexOf(id)].key_concepts;
    for (const question of lesson.quiz.questions) expect(concepts).toContain(question.concept);
  });

  it('los diagramas Mermaid usan una sintaxis de diagrama de flujo', () => {
    for (const lesson of Object.values(SAMPLE_LESSONS)) {
      for (const block of lesson.markdown.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
        expect(block[1].trim()).toMatch(/^flowchart (LR|TD)/);
      }
    }
  });
});
