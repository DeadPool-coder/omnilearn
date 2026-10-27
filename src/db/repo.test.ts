import { beforeEach, describe, expect, it } from 'vitest';
import { makeCourse } from '../../tests/fixtures';
import { buildQuiz } from '@/ai/normalize';
import { toContract } from '@/domain/contract';
import { courseFromContract, exportCourse, importData } from './backup';
import { db } from './db';
import {
  addFlashcards,
  deleteCourse,
  getDueCards,
  recordQuizAttempt,
  reviewFlashcard,
  saveLessonContent,
  saveNewCourse,
  setLessonStatus,
} from './repo';

const quiz = buildQuiz({
  questions: [
    {
      question: '¿Qué mide la entropía?',
      concept: 'Entropía',
      bloom_level: 'understand',
      options: [
        { text: 'El desorden / número de microestados', is_correct: true, explanation: 'Correcto.' },
        { text: 'La temperatura', is_correct: false, explanation: 'No.' },
        { text: 'La presión', is_correct: false, explanation: 'No.' },
        { text: 'El volumen', is_correct: false, explanation: 'No.' },
      ],
    },
  ],
});

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('repositorio', () => {
  it('guarda una ruta y registra la actividad', async () => {
    await saveNewCourse(makeCourse());
    expect(await db.courses.count()).toBe(1);
    expect((await db.activity.toArray()).map((a) => a.type)).toEqual(['course_created']);
  });

  it('un quiz aprobado completa la lección y los fallos se vuelven tarjetas', async () => {
    await saveNewCourse(makeCourse());
    await saveLessonContent('c1', '1.1', '# contenido', null);
    const wrongAnswer = {
      question_id: 'q1',
      option_id: 'q1-b',
      correct: false,
      confidence: 'sure' as const,
      concept: 'Entropía',
    };

    const failed = await recordQuizAttempt(
      { course_id: 'c1', lesson_id: '1.1', answers: [wrongAnswer], score: 0, passed: false },
      { quiz, errorsToCards: true },
    );
    expect(failed.errorCards).toHaveLength(1);
    expect(failed.errorCards[0].back).toContain('microestados');
    expect((await db.courses.get('c1'))?.modules[0].lessons[0].status).toBe('pending');

    await recordQuizAttempt(
      {
        course_id: 'c1',
        lesson_id: '1.1',
        answers: [{ ...wrongAnswer, correct: true }],
        score: 1,
        passed: true,
      },
      { quiz, errorsToCards: true },
    );
    expect((await db.courses.get('c1'))?.modules[0].lessons[0].status).toBe('completed');
  });

  it('marca la ruta como finalizada al completar la última lección', async () => {
    await saveNewCourse(makeCourse());
    await setLessonStatus('c1', '1.1', 'completed');
    await setLessonStatus('c1', '1.2', 'completed');
    const { becameComplete } = await setLessonStatus('c1', '2.1', 'completed');
    expect(becameComplete).toBe(true);
    expect((await db.courses.get('c1'))?.status).toBe('completed');
  });

  it('no duplica tarjetas con el mismo anverso y programa el repaso', async () => {
    await saveNewCourse(makeCourse());
    const now = Date.now();
    const created = await addFlashcards(
      [
        { front: 'Pregunta', back: 'Respuesta' },
        { front: 'pregunta ', back: 'Duplicada' },
      ],
      { courseId: 'c1', lessonId: '1.1', source: 'ai', now },
    );
    expect(created).toHaveLength(1);
    expect(await getDueCards(now)).toHaveLength(1);
    await reviewFlashcard(created[0], 3, { now });
    expect(await getDueCards(now)).toHaveLength(0);
    expect(await db.reviewLogs.count()).toBe(1);
  });

  it('borrar una ruta elimina en cascada todo lo relacionado', async () => {
    await saveNewCourse(makeCourse());
    await saveLessonContent('c1', '1.1', 'x', null);
    await addFlashcards([{ front: 'a', back: 'b' }], { courseId: 'c1', lessonId: null, source: 'user' });
    await deleteCourse('c1');
    expect(await db.courses.count()).toBe(0);
    expect(await db.lessons.count()).toBe(0);
    expect(await db.flashcards.count()).toBe(0);
    expect(await db.activity.count()).toBe(0);
  });
});

describe('copias de seguridad', () => {
  it('exporta e importa una ruta con sus tarjetas', async () => {
    await saveNewCourse(makeCourse());
    await addFlashcards([{ front: 'a', back: 'b' }], { courseId: 'c1', lessonId: null, source: 'user' });
    const backup = await exportCourse('c1');
    await Promise.all(db.tables.map((t) => t.clear()));
    const result = await importData(JSON.parse(JSON.stringify(backup)));
    expect(result).toMatchObject({ courses: 1, flashcards: 1, skipped: 0, kind: 'backup' });
  });

  it('importa un temario suelto con el contrato JSON del motor', async () => {
    const contract = {
      course_id: 'uuid',
      topic: 'Historia de Roma',
      level: 'intermediate',
      focus: 'practical',
      modules: [
        {
          module_id: 1,
          title: 'La República',
          description: 'Instituciones',
          lessons: [
            { lesson_id: '1.1', title: 'El Senado', key_concepts: ['Senado', 'Cónsules'], status: 'pending' },
          ],
        },
      ],
    };
    const result = await importData(contract);
    expect(result.kind).toBe('contract');
    const [course] = await db.courses.toArray();
    expect(course.topic).toBe('Historia de Roma');
    expect(course.course_id).not.toBe('uuid');
    expect(course.modules[0].lessons[0]).toMatchObject({
      lesson_id: '1.1',
      status: 'pending',
      estimated_minutes: 10,
    });
  });

  it('el JSON de la vista previa (contrato) se vuelve a importar sin perder el temario', () => {
    const course = makeCourse({
      topic: 'Termodinámica',
      level: 'advanced',
      focus: 'exam',
      time_budget: 'deep',
      learning_outcomes: ['Aplicar la primera ley'],
      prerequisites: ['Cálculo'],
      source_material: 'apuntes privados',
    });
    const contract = toContract(course);
    expect(contract).not.toHaveProperty('source_material');
    expect(contract).not.toHaveProperty('created_at');
    const restored = courseFromContract(JSON.parse(JSON.stringify(contract)))!;
    expect(restored.course_id).not.toBe(course.course_id);
    expect(toContract(restored)).toEqual({ ...contract, course_id: restored.course_id });
  });

  it('rechaza un archivo que no es de Omnilearn ni un temario', async () => {
    expect(courseFromContract({ foo: 1 })).toBeNull();
    await expect(importData({ foo: 1 })).rejects.toThrow();
  });
});
