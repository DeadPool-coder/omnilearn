import type {
  BloomLevel,
  Confidence,
  ExpansionKind,
  FeynmanVerdict,
  Focus,
  LessonStatus,
  Level,
  TimeBudget,
} from './schemas';

interface OptionMeta {
  label: string;
  description: string;
}

export const LEVEL_META: Record<Level, OptionMeta & { profile: string }> = {
  beginner: {
    label: 'Desde cero',
    description: 'Nunca lo he estudiado. Explícamelo como si fuera la primera vez.',
    profile: 'Principiante · explicación tipo Feynman',
  },
  basic: {
    label: 'Conocimientos básicos',
    description: 'Conozco algunas ideas sueltas, pero no tengo una base sólida.',
    profile: 'Principiante · base sólida',
  },
  intermediate: {
    label: 'Intermedio',
    description: 'Domino lo esencial. Quiero aplicar y profundizar.',
    profile: 'Intermedio · práctico',
  },
  advanced: {
    label: 'Avanzado',
    description: 'Tengo experiencia. Quiero rigor técnico, matices y casos límite.',
    profile: 'Avanzado · técnico',
  },
};

export const FOCUS_META: Record<Focus, OptionMeta> = {
  theoretical: {
    label: 'Teórico-conceptual',
    description: 'Entender el porqué: modelos, principios y conexiones.',
  },
  practical: {
    label: 'Práctico por proyectos',
    description: 'Aprender haciendo: ejercicios, pasos y mini-proyectos.',
  },
  exam: {
    label: 'Preparación de examen',
    description: 'Definiciones precisas, problemas tipo y errores frecuentes.',
  },
  executive: {
    label: 'Resumen ejecutivo',
    description: 'Lo esencial en poco tiempo: ideas clave y decisiones.',
  },
};

export const TIME_META: Record<TimeBudget, OptionMeta> = {
  micro: {
    label: 'Micro-lecciones',
    description: 'Lecciones de ~5 minutos. Ideal para el día a día.',
  },
  deep: {
    label: 'Sesiones profundas',
    description: '30+ minutos por módulo, con ejemplos y práctica.',
  },
};

export const LESSON_STATUS_META: Record<LessonStatus, { label: string }> = {
  locked: { label: 'Bloqueada' },
  pending: { label: 'Disponible' },
  in_progress: { label: 'En curso' },
  completed: { label: 'Completada' },
};

export const BLOOM_META: Record<BloomLevel, { label: string }> = {
  remember: { label: 'Recordar' },
  understand: { label: 'Comprender' },
  apply: { label: 'Aplicar' },
  analyze: { label: 'Analizar' },
};

export const EXPANSION_META: Record<ExpansionKind, { label: string; action: string }> = {
  simpler: { label: 'Explicación más simple', action: 'Más simple (analogía)' },
  example: { label: 'Ejemplo práctico', action: 'Ejemplo práctico' },
  deeper: { label: 'Profundización técnica', action: 'Profundizar' },
  question: { label: 'Respuesta del tutor', action: 'Preguntar' },
};

export const FEYNMAN_VERDICT_META: Record<FeynmanVerdict, { label: string }> = {
  needs_work: { label: 'Necesita trabajo' },
  partial: { label: 'Comprensión parcial' },
  solid: { label: 'Comprensión sólida' },
  excellent: { label: 'Excelente' },
};

export const CONFIDENCE_META: Record<Confidence, { label: string; expected: number; hint: string }> = {
  guess: { label: 'Adivino', expected: 0.33, hint: 'No estoy seguro' },
  probable: { label: 'Creo que sí', expected: 0.7, hint: 'Bastante seguro' },
  sure: { label: 'Seguro', expected: 0.95, hint: 'Lo sé' },
};

export const CONTENT_LANGUAGES: { code: string; label: string; promptName: string }[] = [
  { code: 'es', label: 'Español', promptName: 'español' },
  { code: 'en', label: 'English', promptName: 'inglés (English)' },
  { code: 'pt', label: 'Português', promptName: 'portugués (Português)' },
  { code: 'fr', label: 'Français', promptName: 'francés (Français)' },
  { code: 'it', label: 'Italiano', promptName: 'italiano' },
  { code: 'de', label: 'Deutsch', promptName: 'alemán (Deutsch)' },
];

export function languagePromptName(code: string): string {
  return CONTENT_LANGUAGES.find((l) => l.code === code)?.promptName ?? code;
}

export const SRS_STATE_META: Record<number, { label: string }> = {
  0: { label: 'Nueva' },
  1: { label: 'Aprendiendo' },
  2: { label: 'Repaso' },
  3: { label: 'Reaprendiendo' },
};
