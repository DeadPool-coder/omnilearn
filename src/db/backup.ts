/**
 * Copias de seguridad y portabilidad.
 *
 * Formatos que acepta la importación:
 *  1. Copia completa o de una ruta exportada por Omnilearn ({ app: "omnilearn", format_version, courses, … }).
 *  2. Un temario suelto que siga el contrato JSON del motor ({ topic, level, focus, modules: [...] }),
 *     útil para compartir rutas entre personas o crearlas con otras herramientas.
 */
import { z } from 'zod';
import {
  ActivityEvent,
  Course,
  FeynmanAttempt,
  Flashcard,
  FOCUSES,
  LessonContent,
  LEVELS,
  QuizAttempt,
  ReviewLogEntry,
  TIME_BUDGETS,
} from '@/domain/schemas';
import { uid } from '@/lib/id';
import { db } from './db';

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  app: 'omnilearn';
  format_version: number;
  exported_at: string;
  courses: Course[];
  lessons: LessonContent[];
  flashcards: Flashcard[];
  reviewLogs: ReviewLogEntry[];
  quizAttempts: QuizAttempt[];
  feynmanAttempts: FeynmanAttempt[];
  activity: ActivityEvent[];
}

export async function exportAll(): Promise<BackupFile> {
  const [courses, lessons, flashcards, reviewLogs, quizAttempts, feynmanAttempts, activity] =
    await Promise.all([
      db.courses.toArray(),
      db.lessons.toArray(),
      db.flashcards.toArray(),
      db.reviewLogs.toArray(),
      db.quizAttempts.toArray(),
      db.feynmanAttempts.toArray(),
      db.activity.toArray(),
    ]);
  return {
    app: 'omnilearn',
    format_version: BACKUP_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    courses,
    lessons,
    flashcards,
    reviewLogs,
    quizAttempts,
    feynmanAttempts,
    activity,
  };
}

export async function exportCourse(courseId: string): Promise<BackupFile> {
  const course = await db.courses.get(courseId);
  if (!course) throw new Error('Ruta no encontrada');
  const byCourse = <T>(table: { where(index: string): { equals(v: string): { toArray(): Promise<T[]> } } }) =>
    table.where('course_id').equals(courseId).toArray();
  const [lessons, flashcards, reviewLogs, quizAttempts, feynmanAttempts, activity] = await Promise.all([
    byCourse<LessonContent>(db.lessons),
    byCourse<Flashcard>(db.flashcards),
    byCourse<ReviewLogEntry>(db.reviewLogs),
    byCourse<QuizAttempt>(db.quizAttempts),
    byCourse<FeynmanAttempt>(db.feynmanAttempts),
    byCourse<ActivityEvent>(db.activity),
  ]);
  return {
    app: 'omnilearn',
    format_version: BACKUP_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    courses: [course],
    lessons,
    flashcards,
    reviewLogs,
    quizAttempts,
    feynmanAttempts,
    activity,
  };
}

function validItems<T>(schema: z.ZodType<T>, items: unknown): { valid: T[]; skipped: number } {
  if (!Array.isArray(items)) return { valid: [], skipped: 0 };
  const valid: T[] = [];
  let skipped = 0;
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) valid.push(result.data);
    else skipped += 1;
  }
  return { valid, skipped };
}

/** Temario suelto según el contrato del motor (campos opcionales con valores por defecto). */
const LooseCourse = z.object({
  course_id: z.string().optional(),
  topic: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  level: z.enum(LEVELS).catch('basic'),
  focus: z.enum(FOCUSES).catch('theoretical'),
  time_budget: z.enum(TIME_BUDGETS).catch('micro'),
  language: z.string().optional(),
  goal: z.string().optional(),
  learning_outcomes: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  modules: z
    .array(
      z.object({
        module_id: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        lessons: z.array(
          z.object({
            lesson_id: z.string().optional(),
            title: z.string(),
            objective: z.string().optional(),
            key_concepts: z.array(z.string()).optional(),
            estimated_minutes: z.number().optional(),
            status: z.string().optional(),
          }),
        ),
      }),
    )
    .min(1),
});

export function courseFromContract(raw: unknown, now = Date.now()): Course | null {
  const parsed = LooseCourse.safeParse(raw);
  if (!parsed.success) return null;
  const c = parsed.data;
  return {
    course_id: uid(),
    topic: c.topic,
    title: c.title ?? c.topic,
    description: c.description ?? '',
    level: c.level,
    focus: c.focus,
    time_budget: c.time_budget,
    language: c.language ?? 'es',
    goal: c.goal ?? '',
    learning_outcomes: c.learning_outcomes ?? [],
    prerequisites: c.prerequisites ?? [],
    modules: c.modules.map((m, mi) => ({
      module_id: mi + 1,
      title: m.title,
      description: m.description ?? '',
      lessons: m.lessons.map((l, li) => ({
        lesson_id: `${mi + 1}.${li + 1}`,
        title: l.title,
        objective: l.objective ?? '',
        key_concepts: l.key_concepts ?? [],
        estimated_minutes: l.estimated_minutes ?? 10,
        status: 'pending' as const,
      })),
    })),
    status: 'active',
    sequential: true,
    source: 'import',
    generator: null,
    source_material: '',
    created_at: now,
    updated_at: now,
    last_studied_at: null,
    completed_at: null,
  };
}

export interface ImportResult {
  courses: number;
  flashcards: number;
  skipped: number;
  kind: 'backup' | 'contract';
}

export async function importData(raw: unknown, mode: 'merge' | 'replace' = 'merge'): Promise<ImportResult> {
  const isBackup = !!raw && typeof raw === 'object' && (raw as { app?: string }).app === 'omnilearn';
  if (!isBackup) {
    const course = courseFromContract(raw);
    if (!course)
      throw new Error('El archivo no es una copia de Omnilearn ni un temario con el contrato JSON.');
    await db.courses.put(course);
    return { courses: 1, flashcards: 0, skipped: 0, kind: 'contract' };
  }

  const data = raw as Record<string, unknown>;
  const courses = validItems(Course, data.courses);
  const lessons = validItems(LessonContent, data.lessons);
  const flashcards = validItems(Flashcard, data.flashcards);
  const reviewLogs = validItems(ReviewLogEntry, data.reviewLogs);
  const quizAttempts = validItems(QuizAttempt, data.quizAttempts);
  const feynmanAttempts = validItems(FeynmanAttempt, data.feynmanAttempts);
  const activity = validItems(ActivityEvent, data.activity);

  await db.transaction(
    'rw',
    [db.courses, db.lessons, db.flashcards, db.reviewLogs, db.quizAttempts, db.feynmanAttempts, db.activity],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.courses.clear(),
          db.lessons.clear(),
          db.flashcards.clear(),
          db.reviewLogs.clear(),
          db.quizAttempts.clear(),
          db.feynmanAttempts.clear(),
          db.activity.clear(),
        ]);
      }
      await db.courses.bulkPut(courses.valid);
      await db.lessons.bulkPut(lessons.valid);
      await db.flashcards.bulkPut(flashcards.valid);
      await db.reviewLogs.bulkPut(reviewLogs.valid);
      await db.quizAttempts.bulkPut(quizAttempts.valid);
      await db.feynmanAttempts.bulkPut(feynmanAttempts.valid);
      await db.activity.bulkPut(activity.valid);
    },
  );

  const skipped =
    courses.skipped +
    lessons.skipped +
    flashcards.skipped +
    reviewLogs.skipped +
    quizAttempts.skipped +
    feynmanAttempts.skipped +
    activity.skipped;
  return { courses: courses.valid.length, flashcards: flashcards.valid.length, skipped, kind: 'backup' };
}

export async function deleteAllData() {
  await db.transaction(
    'rw',
    [
      db.courses,
      db.lessons,
      db.flashcards,
      db.reviewLogs,
      db.quizAttempts,
      db.feynmanAttempts,
      db.activity,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.courses.clear(),
        db.lessons.clear(),
        db.flashcards.clear(),
        db.reviewLogs.clear(),
        db.quizAttempts.clear(),
        db.feynmanAttempts.clear(),
        db.activity.clear(),
        db.meta.clear(),
      ]);
    },
  );
}
