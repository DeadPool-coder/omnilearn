import { describe, expect, it, vi } from 'vitest';
import { Course } from '@/domain/schemas';
import { AIService, assessmentSizes } from './AIService';
import { AIError } from './errors';
import type { LessonInput, SyllabusInput } from './prompts';
import { DemoProvider } from './providers/demo';
import type { JSONRequest, LLMProvider, TextStreamRequest } from './types';

const syllabusInput: SyllabusInput = {
  topic: 'Termodinámica',
  level: 'beginner',
  focus: 'exam',
  time_budget: 'micro',
  goal: 'Aprobar Física II',
  source_material: '',
  language: 'es',
};

function lessonInputFrom(course: Course): LessonInput {
  const module = course.modules[0];
  const lesson = module.lessons[0];
  return {
    course: { ...course },
    module,
    lesson,
    previous_lessons: [],
    next_lessons: [module.lessons[1]?.title ?? ''],
    weak_concepts: [],
    source_material: '',
  };
}

describe('AIService con el proveedor demo', () => {
  const ai = new AIService(new DemoProvider({ demoDelayMs: 0 }));

  it('genera un syllabus que cumple el contrato Course', async () => {
    const course = await ai.generateSyllabus(syllabusInput);
    expect(() => Course.parse(course)).not.toThrow();
    expect(course.course_id).toMatch(/[0-9a-f-]{36}/);
    expect(course.topic).toBe('Termodinámica');
    expect(course.modules[0].module_id).toBe(1);
    expect(course.modules[0].lessons[0].lesson_id).toBe('1.1');
    expect(course.modules.flatMap((m) => m.lessons).every((l) => l.status === 'pending')).toBe(true);
    expect(course.source).toBe('demo');
  });

  it('transmite la lección en fragmentos y devuelve Markdown limpio', async () => {
    const course = await ai.generateSyllabus(syllabusInput);
    const deltas: string[] = [];
    const markdown = await ai.streamLesson(lessonInputFrom(course), (d) => deltas.push(d));
    expect(deltas.length).toBeGreaterThan(5);
    expect(deltas.join('')).toContain('## ');
    expect(markdown).toContain('```mermaid');
    expect(markdown).not.toMatch(/^#\s/);
  });

  it('genera un quiz con exactamente una opción correcta por pregunta', async () => {
    const course = await ai.generateSyllabus(syllabusInput);
    const input = lessonInputFrom(course);
    const quiz = await ai.generateQuiz({
      course: input.course,
      lesson: input.lesson,
      content_markdown: 'contenido',
      count: assessmentSizes(course).quiz,
    });
    expect(quiz.questions.length).toBe(3);
    for (const q of quiz.questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.is_correct)).toHaveLength(1);
      expect(q.id).toMatch(/^q\d$/);
    }
  });

  it('evalúa el desafío Feynman con puntuación = suma de la rúbrica', async () => {
    const course = await ai.generateSyllabus(syllabusInput);
    const input = lessonInputFrom(course);
    const evaluation = await ai.evaluateFeynman({
      course: input.course,
      lesson: input.lesson,
      content_markdown: 'contenido',
      explanation:
        'La visión global es como mirar un mapa antes de un viaje. Por ejemplo, antes de estudiar cada fórmula ' +
        'conviene saber qué partes tiene el tema y cómo se conectan. Las preguntas guía ayudan a ordenar el estudio.',
    });
    const r = evaluation.rubric;
    expect(evaluation.score).toBe(r.accuracy + r.completeness + r.clarity + r.examples);
    expect(['needs_work', 'partial', 'solid', 'excellent']).toContain(evaluation.verdict);
  });

  it('rechaza una pregunta vacía al tutor', async () => {
    const course = await ai.generateSyllabus(syllabusInput);
    const input = lessonInputFrom(course);
    await expect(
      ai.streamExpansion({
        course: input.course,
        lesson: input.lesson,
        content_markdown: '',
        kind: 'question',
        selection: '',
        question: '  ',
      }),
    ).rejects.toBeInstanceOf(AIError);
  });
});

/** Proveedor falso que devuelve respuestas predefinidas en orden. */
class ScriptedProvider implements LLMProvider {
  readonly id = 'openai' as const;
  readonly model = 'fake';
  calls: JSONRequest[] = [];
  constructor(private readonly responses: string[]) {}
  async generateJSON(req: JSONRequest) {
    this.calls.push(req);
    return this.responses[Math.min(this.calls.length - 1, this.responses.length - 1)];
  }
  async streamText(_req: TextStreamRequest) {
    return '';
  }
}

const validQuiz = JSON.stringify({
  questions: [1, 2, 3].map((n) => ({
    question: `Pregunta ${n}`,
    concept: 'C',
    bloom_level: 'apply',
    options: [
      { text: 'A', is_correct: true, explanation: 'bien' },
      { text: 'B', is_correct: false, explanation: 'mal' },
      { text: 'C', is_correct: false, explanation: 'mal' },
      { text: 'D', is_correct: false, explanation: 'mal' },
    ],
  })),
});

const quizInput = {
  course: {
    title: 'T',
    topic: 'T',
    description: '',
    level: 'basic' as const,
    focus: 'theoretical' as const,
    time_budget: 'micro' as const,
    language: 'es',
    goal: '',
  },
  lesson: { lesson_id: '1.1', title: 'L', objective: 'O', key_concepts: ['C'], estimated_minutes: 5 },
  content_markdown: 'x',
  count: 3,
};

describe('bucle de reparación', () => {
  it('repara una salida inválida devolviendo los errores al modelo', async () => {
    const twoCorrect = JSON.parse(validQuiz);
    twoCorrect.questions[0].options[1].is_correct = true;
    const provider = new ScriptedProvider(['esto no es json', JSON.stringify(twoCorrect), validQuiz]);
    const status = vi.fn();
    const ai = new AIService(provider, { onStatus: status });

    const quiz = await ai.generateQuiz(quizInput);
    expect(quiz.questions).toHaveLength(3);
    expect(provider.calls).toHaveLength(3);
    const lastMessages = provider.calls[2].messages;
    expect(lastMessages.at(-1)?.content).toContain('exactamente una opción correcta');
    expect(status).toHaveBeenCalled();
  });

  it('se rinde tras agotar los intentos con un AIError invalid_output', async () => {
    const provider = new ScriptedProvider(['{"questions": []}']);
    const ai = new AIService(provider, { maxRepairAttempts: 1 });
    await expect(ai.generateQuiz(quizInput)).rejects.toMatchObject({ code: 'invalid_output' });
    expect(provider.calls).toHaveLength(2);
  });

  it('envía al proveedor un JSON Schema estricto sin restricciones numéricas', async () => {
    const provider = new ScriptedProvider([validQuiz]);
    await new AIService(provider).generateQuiz(quizInput);
    const schema = JSON.stringify(provider.calls[0].schema);
    expect(schema).toContain('"additionalProperties":false');
    expect(schema).not.toContain('minItems');
    expect(provider.calls[0].schemaName).toBe('quiz');
  });
});
