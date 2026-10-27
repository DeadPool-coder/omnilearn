/**
 * Base de datos local (IndexedDB vía Dexie). Local-first: todo vive en el navegador del usuario
 * y se puede exportar/importar como JSON. No hace falta backend.
 */
import Dexie, { type EntityTable } from 'dexie';
import type {
  ActivityEvent,
  Course,
  FeynmanAttempt,
  Flashcard,
  LessonContent,
  QuizAttempt,
  ReviewLogEntry,
} from '@/domain/schemas';

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class OmnilearnDB extends Dexie {
  courses!: EntityTable<Course, 'course_id'>;
  lessons!: EntityTable<LessonContent, 'id'>;
  flashcards!: EntityTable<Flashcard, 'id'>;
  reviewLogs!: EntityTable<ReviewLogEntry, 'id'>;
  quizAttempts!: EntityTable<QuizAttempt, 'id'>;
  feynmanAttempts!: EntityTable<FeynmanAttempt, 'id'>;
  activity!: EntityTable<ActivityEvent, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name = 'omnilearn') {
    super(name);
    this.version(1).stores({
      courses: 'course_id, status, updated_at, last_studied_at',
      lessons: 'id, course_id',
      flashcards: 'id, course_id, lesson_id, srs.due, srs.state, created_at',
      reviewLogs: 'id, card_id, course_id, reviewed_at',
      quizAttempts: 'id, course_id, [course_id+lesson_id], created_at',
      feynmanAttempts: 'id, course_id, [course_id+lesson_id], created_at',
      activity: 'id, at, day, type, course_id',
      meta: 'key',
    });
  }
}

export const db = new OmnilearnDB();

export const ALL_TABLES = [
  'courses',
  'lessons',
  'flashcards',
  'reviewLogs',
  'quizAttempts',
  'feynmanAttempts',
  'activity',
] as const;
