/**
 * Primera ejecución: instala el curso de ejemplo ("Aprender a aprender") para que el panel no
 * empiece vacío. El contenido del curso se descarga bajo demanda (no pesa en la carga inicial).
 */
import { SAMPLE_COURSE_ID } from '@/data/sample/id';
import { db } from './db';
import { getMeta, setMeta } from './repo';

const SEED_KEY = 'sample_seeded_v1';

export async function installSampleCourse() {
  const { installSampleCourse: install } = await import('./sampleInstaller');
  await install();
}

/** Tarjetas preparadas de una lección del curso de ejemplo (en lugar de pedirlas a la IA). */
export async function sampleFlashcards(lessonId: string) {
  const { sampleFlashcards: get } = await import('./sampleInstaller');
  return get(lessonId);
}

let seeding: Promise<void> | null = null;

/** Idempotente y a prueba de llamadas simultáneas (StrictMode ejecuta los efectos dos veces). */
export function ensureSeeded(): Promise<void> {
  seeding ??= (async () => {
    if (await getMeta<boolean>(SEED_KEY)) return;
    const existing = await db.courses.count();
    if (existing === 0) await installSampleCourse();
    await setMeta(SEED_KEY, true);
  })();
  return seeding;
}

export async function hasSampleCourse() {
  return !!(await db.courses.get(SAMPLE_COURSE_ID));
}
