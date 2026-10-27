import { describe, expect, it } from 'vitest';
import {
  courseProgress,
  displayStatus,
  findLesson,
  lessonStatuses,
  nextLesson,
  withLessonStatus,
} from './progress';
import type { QuizAnswer, QuizAttempt } from './schemas';
import { makeCourse } from '../../tests/fixtures';
import { applyReview, newSrsState, previewIntervals, retrievability } from './srs';
import { activityHeatmap, calibrationStats, computeStreak, lessonMastery, weakConcepts } from './stats';

describe('progreso y desbloqueo por dominio', () => {
  it('bloquea las lecciones hasta completar la anterior', () => {
    const course = makeCourse();
    const statuses = lessonStatuses(course);
    expect(statuses.get('1.1')).toBe('pending');
    expect(statuses.get('1.2')).toBe('locked');
    expect(statuses.get('2.1')).toBe('locked');
  });

  it('sin modo secuencial no bloquea nada', () => {
    const course = makeCourse({ sequential: false });
    expect(displayStatus(course, '2.1')).toBe('pending');
  });

  it('completar una lección desbloquea la siguiente y la ruta termina al completar todas', () => {
    let course = withLessonStatus(makeCourse(), '1.1', 'completed', 100);
    expect(displayStatus(course, '1.2')).toBe('pending');
    expect(nextLesson(course)?.lesson.lesson_id).toBe('1.2');
    course = withLessonStatus(course, '1.2', 'completed', 200);
    course = withLessonStatus(course, '2.1', 'completed', 300);
    expect(course.status).toBe('completed');
    expect(course.completed_at).toBe(300);
    expect(courseProgress(course).percent).toBe(100);
  });

  it('reabrir una lección completada no la devuelve a "en curso"', () => {
    const course = withLessonStatus(withLessonStatus(makeCourse(), '1.1', 'completed'), '1.1', 'in_progress');
    expect(findLesson(course, '1.1')?.lesson.status).toBe('completed');
  });

  it('nextLesson prefiere la lección en curso', () => {
    const course = withLessonStatus(makeCourse({ sequential: false }), '2.1', 'in_progress');
    expect(nextLesson(course)?.lesson.lesson_id).toBe('2.1');
  });

  it('findLesson devuelve vecinas', () => {
    const loc = findLesson(makeCourse(), '1.2');
    expect(loc?.prev?.lesson.lesson_id).toBe('1.1');
    expect(loc?.next?.lesson.lesson_id).toBe('2.1');
    expect(loc?.total).toBe(3);
  });
});

describe('repaso espaciado (FSRS)', () => {
  const now = new Date('2026-10-01T10:00:00').getTime();

  it('una tarjeta nueva vence ya y no tiene retención estimada', () => {
    const srs = newSrsState(now);
    expect(srs.due).toBe(now);
    expect(srs.state).toBe(0);
    expect(retrievability(srs, now)).toBeNull();
  });

  it('los intervalos crecen de "Otra vez" a "Fácil"', () => {
    const i = previewIntervals(newSrsState(now), now);
    expect(i[1]).toBeLessThan(i[3]);
    expect(i[3]).toBeLessThan(i[4]);
    expect(i[2]).toBeLessThanOrEqual(i[3]);
  });

  it('recordar bien varias veces espacia cada vez más los repasos', () => {
    let srs = newSrsState(now);
    let t = now;
    const gaps: number[] = [];
    for (let k = 0; k < 4; k++) {
      srs = applyReview(srs, 3, t).srs;
      gaps.push(srs.due - t);
      t = srs.due;
    }
    expect(gaps[3]).toBeGreaterThan(gaps[1]);
    const r = retrievability(srs, t);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0.5);
  });
});

describe('métricas', () => {
  const today = new Date('2026-10-27T12:00:00');

  it('racha: cuenta días seguidos y sigue viva si hoy aún no estudiaste', () => {
    expect(computeStreak(['2026-10-25', '2026-10-26', '2026-10-27'], today)).toMatchObject({
      current: 3,
      activeToday: true,
    });
    expect(computeStreak(['2026-10-25', '2026-10-26'], today)).toMatchObject({
      current: 2,
      activeToday: false,
    });
    expect(computeStreak(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-25'], today)).toMatchObject({
      current: 0,
      longest: 3,
    });
  });

  it('dominio de lección: quiz y retención', () => {
    expect(lessonMastery({ completed: false, bestQuizScore: null, retrievability: null })).toBe(0);
    expect(lessonMastery({ completed: true, bestQuizScore: 1, retrievability: null })).toBe(1);
    expect(lessonMastery({ completed: true, bestQuizScore: 0.8, retrievability: 0.5 })).toBeCloseTo(0.68);
  });

  it('calibración: precisión por nivel de confianza y puntuación de Brier', () => {
    const answers: QuizAnswer[] = [
      { question_id: 'q1', option_id: 'a', correct: true, confidence: 'sure', concept: 'A' },
      { question_id: 'q2', option_id: 'a', correct: false, confidence: 'sure', concept: 'B' },
      { question_id: 'q3', option_id: 'a', correct: true, confidence: 'guess', concept: 'C' },
      { question_id: 'q4', option_id: 'a', correct: true, confidence: null, concept: 'D' },
    ];
    const cal = calibrationStats(answers);
    expect(cal.total).toBe(3);
    const sure = cal.buckets.find((b) => b.confidence === 'sure')!;
    expect(sure.accuracy).toBe(0.5);
    expect(cal.brier).toBeGreaterThan(0);
    expect(cal.bias).not.toBeNull();
  });

  it('conceptos débiles: solo el último intento de cada lección', () => {
    const attempt = (lesson: string, at: number, wrong: string[]): QuizAttempt => ({
      id: `${lesson}-${at}`,
      course_id: 'c1',
      lesson_id: lesson,
      answers: wrong.map((concept, i) => ({
        question_id: `q${i}`,
        option_id: 'x',
        correct: false,
        confidence: null,
        concept,
      })),
      score: 0.5,
      passed: false,
      created_at: at,
    });
    const result = weakConcepts([
      attempt('1.1', 1, ['Viejo']),
      attempt('1.1', 2, ['Entropía']),
      attempt('1.2', 3, ['Entalpía']),
    ]);
    expect(result).toEqual(expect.arrayContaining(['Entropía', 'Entalpía']));
    expect(result).not.toContain('Viejo');
  });

  it('mapa de calor: semanas completas de lunes a domingo', () => {
    const columns = activityHeatmap(new Map([['2026-10-27', 3]]), 4, today);
    expect(columns).toHaveLength(4);
    expect(columns.every((c) => c.length === 7)).toBe(true);
    expect(columns.flat().find((d) => d.key === '2026-10-27')?.count).toBe(3);
    expect(columns[3][0].date.getDay()).toBe(1); // lunes
  });
});
