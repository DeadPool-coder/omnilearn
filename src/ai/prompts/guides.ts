/**
 * Guías pedagógicas que se inyectan en los prompts.
 * Aquí vive la "adaptabilidad de nivel": cambiar estas frases cambia cómo enseña Omnilearn.
 */
import { FOCUS_META, LEVEL_META, TIME_META, languagePromptName } from '@/domain/labels';
import type { Focus, Level, TimeBudget } from '@/domain/schemas';

export const LEVEL_GUIDE: Record<Level, string> = {
  beginner:
    'El estudiante parte de cero. Usa el estilo Feynman: lenguaje cotidiano, frases cortas y una idea por párrafo. ' +
    'Presenta primero la intuición y solo después el término técnico, definido en una frase. ' +
    'Usa al menos una analogía de la vida diaria por concepto. Evita fórmulas salvo que sean imprescindibles; si aparecen, explica cada símbolo.',
  basic:
    'El estudiante conoce ideas sueltas pero no tiene una base sólida. Construye la base con orden: intuición → definición precisa → ejemplo. ' +
    'Introduce la terminología estándar y relaciónala con lo que probablemente ya ha oído. Señala las confusiones típicas de principiante.',
  intermediate:
    'El estudiante domina lo esencial. Enfócate en aplicar: ejemplos realistas, procedimientos paso a paso, buenas prácticas, ' +
    'compromisos (trade-offs) y errores frecuentes. Usa la terminología técnica con naturalidad e incluye al menos un ejemplo resuelto.',
  advanced:
    'El estudiante tiene experiencia. Prioriza el rigor: definiciones formales, mecanismos subyacentes, supuestos, casos límite, ' +
    'limitaciones y debates abiertos. Usa notación técnica o matemática cuando aporte. Menciona estándares o fuentes primarias ' +
    'de referencia cuando sea pertinente, sin inventar citas.',
};

export const FOCUS_GUIDE: Record<Focus, string> = {
  theoretical:
    'Prioriza la comprensión del porqué: modelos mentales, principios, relaciones causales y conexiones entre conceptos.',
  practical:
    'Prioriza aprender haciendo: cada concepto va acompañado de cómo se aplica, con pasos concretos, ejercicios guiados y mini-proyectos.',
  exam: 'Prioriza lo que se evalúa: definiciones precisas, fórmulas clave, problemas tipo resueltos paso a paso, trampas habituales y reglas mnemotécnicas.',
  executive:
    'Prioriza lo esencial (principio 80/20): ideas clave, implicaciones prácticas y decisiones. Sé conciso y evita detalles que no cambien la comprensión.',
};

export const LESSON_LENGTH_GUIDE: Record<TimeBudget, string> = {
  micro:
    'Micro-lección de unos 5 minutos de lectura: entre 350 y 650 palabras. Mejor uno o dos conceptos bien explicados que muchos superficiales.',
  deep: 'Lección profunda de 12 a 20 minutos de lectura: entre 1200 y 2000 palabras, con ejemplos desarrollados y al menos un ejercicio.',
};

export function syllabusSizeGuide(time: TimeBudget, focus: Focus): string {
  if (focus === 'executive') {
    return 'Ruta compacta: 2-4 módulos con 2-3 lecciones cada uno.';
  }
  return time === 'micro'
    ? 'Entre 3 y 5 módulos, cada uno con 2-4 micro-lecciones de 5-8 minutos.'
    : 'Entre 3 y 6 módulos, cada uno con 2-4 lecciones de 12-25 minutos (al menos 30 minutos por módulo).';
}

export const FOCUS_SYLLABUS_RULE: Record<Focus, string> = {
  theoretical:
    'Incluye conexiones explícitas entre ideas y cierra con una lección que integre el modelo completo.',
  practical:
    'Termina cada módulo con una lección práctica o mini-proyecto que integre lo aprendido en ese módulo.',
  exam: 'Incluye lecciones de práctica con problemas tipo y termina con un repaso integrador de todo el temario.',
  executive: 'Mantén la ruta corta y centrada en las ideas que cambian decisiones.',
};

export function profileBlock(level: Level, focus: Focus, time: TimeBudget): string {
  return [
    `- Nivel actual: ${LEVEL_META[level].label}. ${LEVEL_GUIDE[level]}`,
    `- Enfoque: ${FOCUS_META[focus].label}. ${FOCUS_GUIDE[focus]}`,
    `- Tiempo disponible: ${TIME_META[time].label}.`,
  ].join('\n');
}

export function systemPrompt(language: string): string {
  return [
    'Eres el motor pedagógico de Omnilearn: un experto en diseño instruccional y un tutor excepcional.',
    'Tu misión es que el estudiante aprenda de verdad (no solo que lea), aplicando tres principios:',
    '1. Andamiaje cognitivo: de lo simple a lo complejo; cada idea se apoya en la anterior.',
    '2. Adaptabilidad: lenguaje, profundidad y analogías ajustados al perfil del estudiante.',
    '3. Aprendizaje activo: el estudiante debe recuperar, aplicar y explicar lo aprendido.',
    'Exactitud: no inventes datos, cifras, citas ni referencias. Si algo es incierto o está en debate, dilo explícitamente.',
    `Escribe todo el contenido en ${languagePromptName(language)}.`,
  ].join('\n');
}

/** Bloque opcional con el material que aporta el estudiante (apuntes, temario oficial…). */
export function sourceMaterialBlock(material: string, maxChars = 12000): string {
  const trimmed = material.trim();
  if (!trimmed) return '';
  const clipped = trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}\n[…recortado…]` : trimmed;
  return [
    '',
    'Material de referencia aportado por el estudiante (úsalo como guía principal de contenidos, terminología y orden; no lo copies literalmente):',
    '"""',
    clipped,
    '"""',
  ].join('\n');
}
