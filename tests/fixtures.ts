import type { Course } from '@/domain/schemas';

/** Ruta mínima de 3 lecciones (2 módulos) para pruebas. */
export function makeCourse(overrides: Partial<Course> = {}): Course {
  const lesson = (id: string, status: 'pending' | 'in_progress' | 'completed' = 'pending') => ({
    lesson_id: id,
    title: `Lección ${id}`,
    objective: 'Al terminar podrás…',
    key_concepts: ['A', 'B'],
    estimated_minutes: 10,
    status,
  });
  return {
    course_id: 'c1',
    topic: 'Tema',
    title: 'Ruta',
    description: '',
    level: 'basic',
    focus: 'theoretical',
    time_budget: 'micro',
    language: 'es',
    goal: '',
    learning_outcomes: [],
    prerequisites: [],
    modules: [
      { module_id: 1, title: 'M1', description: '', lessons: [lesson('1.1'), lesson('1.2')] },
      { module_id: 2, title: 'M2', description: '', lessons: [lesson('2.1')] },
    ],
    status: 'active',
    sequential: true,
    source: 'demo',
    generator: null,
    source_material: '',
    created_at: 0,
    updated_at: 0,
    last_studied_at: null,
    completed_at: null,
    ...overrides,
  };
}
