/**
 * Constructores de prompts. Cada función recibe una entrada estructurada y devuelve mensajes de chat.
 * Las mismas entradas viajan como `taskInput` al proveedor demo, que simula las respuestas sin IA.
 */
import { EXPANSION_META, LEVEL_META } from '@/domain/labels';
import type { ExpansionKind, Focus, Level, TimeBudget } from '@/domain/schemas';
import { truncateMiddle } from '@/lib/text';
import type { ChatMessage } from '../types';
import {
  FOCUS_SYLLABUS_RULE,
  LESSON_LENGTH_GUIDE,
  profileBlock,
  sourceMaterialBlock,
  syllabusSizeGuide,
  systemPrompt,
} from './guides';

// ---------------------------------------------------------------------------
// Entradas de cada tarea
// ---------------------------------------------------------------------------

export interface SyllabusInput {
  topic: string;
  level: Level;
  focus: Focus;
  time_budget: TimeBudget;
  goal: string;
  source_material: string;
  language: string;
}

export interface CourseBrief {
  title: string;
  topic: string;
  description: string;
  level: Level;
  focus: Focus;
  time_budget: TimeBudget;
  language: string;
  goal: string;
}

export interface LessonInput {
  course: CourseBrief;
  module: { module_id: number; title: string; description: string };
  lesson: {
    lesson_id: string;
    title: string;
    objective: string;
    key_concepts: string[];
    estimated_minutes: number;
  };
  previous_lessons: string[];
  next_lessons: string[];
  weak_concepts: string[];
  source_material: string;
}

export interface AssessmentInput {
  course: CourseBrief;
  lesson: LessonInput['lesson'];
  content_markdown: string;
  count: number;
}

export interface FeynmanInput {
  course: CourseBrief;
  lesson: LessonInput['lesson'];
  content_markdown: string;
  explanation: string;
}

export interface ExpansionInput {
  course: CourseBrief;
  lesson: LessonInput['lesson'];
  content_markdown: string;
  kind: ExpansionKind;
  selection: string;
  question: string;
}

const MAX_LESSON_CONTEXT = 14000;

function lessonContext(content: string): string {
  return ['Contenido de la lección:', '"""', truncateMiddle(content, MAX_LESSON_CONTEXT), '"""'].join('\n');
}

function list(items: string[]): string {
  return items.length ? items.map((i) => `«${i}»`).join(', ') : 'ninguna';
}

// ---------------------------------------------------------------------------
// Syllabus (mapa de ruta)
// ---------------------------------------------------------------------------

export function buildSyllabusMessages(input: SyllabusInput): ChatMessage[] {
  const user = [
    `Diseña una ruta de aprendizaje estructurada (syllabus) sobre: «${input.topic.trim()}».`,
    '',
    'Perfil del estudiante:',
    profileBlock(input.level, input.focus, input.time_budget),
    `- Objetivo personal: ${input.goal.trim() || 'no especificado'}.`,
    sourceMaterialBlock(input.source_material),
    '',
    'Requisitos de diseño:',
    '- Ordena módulos y lecciones por prerrequisitos: ningún concepto se usa antes de haberse enseñado.',
    `- Tamaño: ${syllabusSizeGuide(input.time_budget, input.focus)}`,
    '- El primer módulo asienta las bases adecuadas para el nivel (desde cero: la intuición fundamental; avanzado: un repaso breve y riguroso).',
    '- Cada lección tiene un título concreto (evita títulos genéricos como «Introducción» a secas), un objetivo observable que empiece por «Al terminar podrás…» y entre 2 y 5 conceptos clave.',
    '- Sin solapamientos: cada concepto clave es protagonista de una sola lección.',
    `- ${FOCUS_SYLLABUS_RULE[input.focus]}`,
    '- Si el objetivo personal menciona un examen, proyecto o fecha, orienta la ruta a lograrlo.',
    '- learning_outcomes: resultados medibles de toda la ruta. prerequisites: conocimientos previos realistas (lista vacía si no hacen falta).',
    '- estimated_minutes: estimación honesta del tiempo de estudio de cada lección.',
  ].join('\n');
  return [
    { role: 'system', content: systemPrompt(input.language) },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// Lección (Markdown en streaming)
// ---------------------------------------------------------------------------

export function buildLessonMessages(input: LessonInput): ChatMessage[] {
  const { course, lesson, module } = input;
  const weak = input.weak_concepts.length
    ? `\nEl estudiante tuvo dificultades recientes con: ${list(input.weak_concepts)}. Si guardan relación con esta lección, ` +
      'empieza con un repaso de 2-3 frases que las aclare, sin desviarte del objetivo.'
    : '';
  const user = [
    `Escribe el contenido de la lección ${lesson.lesson_id} «${lesson.title}» del módulo «${module.title}», dentro de la ruta «${course.title}» sobre «${course.topic}».`,
    `Objetivo de la lección: ${lesson.objective}`,
    `Conceptos clave que debes enseñar: ${list(lesson.key_concepts)}.`,
    '',
    'Perfil del estudiante:',
    profileBlock(course.level, course.focus, course.time_budget),
    `- Objetivo personal: ${course.goal.trim() || 'no especificado'}.`,
    `- Extensión: ${LESSON_LENGTH_GUIDE[course.time_budget]}`,
    '',
    `Lecciones anteriores (puedes apoyarte en ellas): ${list(input.previous_lessons)}.`,
    `Próximas lecciones (no adelantes su contenido): ${list(input.next_lessons)}.${weak}`,
    sourceMaterialBlock(input.source_material, 6000),
    '',
    'Estructura en Markdown (NO repitas el título de la lección como encabezado: la interfaz ya lo muestra):',
    '1. Gancho inicial de 2-3 frases: por qué importa, conectado con el objetivo del estudiante si existe.',
    '2. Un apartado `##` por concepto clave: intuición → definición precisa → ejemplo. Usa analogías según el nivel.',
    '3. Resalta cada definición esencial con una cita: `> **Concepto clave:** …`.',
    '4. Al menos un ejemplo resuelto o caso concreto paso a paso cuando el tema lo permita.',
    '5. Un apartado `## Errores frecuentes` con 2-4 confusiones típicas y cómo evitarlas.',
    '6. Si un proceso, jerarquía o secuencia se entiende mejor visualmente, añade UN diagrama Mermaid sencillo (```mermaid con `flowchart TD` o `flowchart LR`, etiquetas cortas entre comillas dobles). Si no aporta, omítelo.',
    '7. Fórmulas en LaTeX ($…$ en línea, $$…$$ en bloque); código en bloques con lenguaje (```python, ```sql…); tablas para comparar.',
    '8. Cierra con `## Resumen` (3-5 viñetas) y `## Para pensar` con una pregunta de reflexión tipo «¿por qué…?» o «¿qué pasaría si…?» (sin responderla).',
    'No incluyas preguntas tipo test (la evaluación se genera aparte). Responde solo con el Markdown de la lección.',
  ].join('\n');
  return [
    { role: 'system', content: systemPrompt(course.language) },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// Micro-quiz
// ---------------------------------------------------------------------------

export function buildQuizMessages(input: AssessmentInput): ChatMessage[] {
  const { lesson, course } = input;
  const user = [
    `Crea un micro-quiz de ${input.count} preguntas de opción múltiple para comprobar la comprensión de la lección «${lesson.title}».`,
    `Objetivo de la lección: ${lesson.objective}. Conceptos clave: ${list(lesson.key_concepts)}.`,
    `Nivel del estudiante: ${LEVEL_META[course.level].label}; ajusta la dificultad a ese nivel.`,
    '',
    'Reglas:',
    '- Basa TODAS las preguntas exclusivamente en el contenido de la lección.',
    '- Cubre conceptos distintos. Reparte niveles de Bloom: al menos una de "understand" y una de "apply" o "analyze"; como mucho una de "remember".',
    '- Prefiere preguntas que apliquen la idea a una situación nueva (transferencia) frente a repetir frases literales.',
    '- Exactamente 4 opciones por pregunta y exactamente UNA con is_correct: true.',
    '- Distractores plausibles basados en errores conceptuales típicos; nada de «todas/ninguna de las anteriores»; opciones de longitud parecida.',
    '- En cada opción, explanation explica por qué es correcta o qué confusión refleja si es incorrecta.',
    '',
    lessonContext(input.content_markdown),
  ].join('\n');
  return [
    { role: 'system', content: systemPrompt(course.language) },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export function buildFlashcardsMessages(input: AssessmentInput): ChatMessage[] {
  const { lesson, course } = input;
  const user = [
    `Extrae ${input.count} tarjetas de memoria (flashcards) de la lección «${lesson.title}» para repaso espaciado.`,
    `Conceptos clave: ${list(lesson.key_concepts)}.`,
    '',
    'Reglas (principio de información mínima):',
    '- Una sola idea por tarjeta. La cara frontal es una pregunta concreta que obliga a recordar (no «explica todo sobre X»).',
    '- Varía los tipos: definición, por qué/causa, cómo/procedimiento, diferencia entre conceptos, ejemplo o aplicación.',
    '- La respuesta (back) es breve (menos de 40 palabras) y se entiende sin el texto original.',
    '- Evita tarjetas triviales o que dependan del contexto («según el texto…»).',
    '- concept: el concepto clave al que pertenece la tarjeta.',
    '',
    lessonContext(input.content_markdown),
  ].join('\n');
  return [
    { role: 'system', content: systemPrompt(course.language) },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// Desafío Feynman
// ---------------------------------------------------------------------------

export function buildFeynmanMessages(input: FeynmanInput): ChatMessage[] {
  const { lesson, course } = input;
  const user = [
    `Evalúa la explicación que escribió un estudiante en el Desafío Feynman: explicar con sus propias palabras «${lesson.title}» como si se lo contara a alguien sin conocimientos previos.`,
    `Conceptos clave que debería cubrir: ${list(lesson.key_concepts)}. Objetivo: ${lesson.objective}.`,
    `Nivel del estudiante: ${LEVEL_META[course.level].label}.`,
    '',
    'Rúbrica (sé justo y concreto):',
    '- accuracy (0-40): ¿lo que dice es correcto? Penaliza los errores conceptuales.',
    '- completeness (0-30): ¿cubre los conceptos clave y cómo se relacionan?',
    '- clarity (0-20): ¿lo entendería un principiante? ¿Evita la jerga sin explicar?',
    '- examples (0-10): ¿usa ejemplos o analogías propias y adecuadas?',
    'verdict según la suma: needs_work (<50), partial (50-69), solid (70-89), excellent (90+).',
    'En misconceptions, cita brevemente la idea incorrecta y corrígela. En gaps, nombra lo que faltó.',
    'Dirígete al estudiante en segunda persona, con tono alentador pero honesto. No reescribas su explicación completa.',
    'Si la explicación está vacía, es irrelevante o es un copiado literal de la lección, puntúa bajo y dilo con amabilidad.',
    '',
    lessonContext(input.content_markdown),
    '',
    'Explicación del estudiante:',
    '"""',
    input.explanation.trim(),
    '"""',
  ].join('\n');
  return [
    { role: 'system', content: systemPrompt(course.language) },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// Acciones rápidas: más simple / ejemplo / profundizar / pregunta libre
// ---------------------------------------------------------------------------

const EXPANSION_INSTRUCTIONS: Record<ExpansionKind, (target: string, question: string) => string> = {
  simpler: (target) =>
    `Explica de forma más sencilla ${target} usando una analogía de la vida cotidiana, como si hablaras con un estudiante curioso de 12 años. ` +
    'Primero la analogía; después conecta cada parte de la analogía con el concepto real; termina con una frase sobre dónde falla la analogía (sus límites). Máximo 250 palabras.',
  example: (target) =>
    `Da un ejemplo práctico o un caso real concreto de ${target}. Si aplica, usa datos o números realistas y desarrolla el razonamiento paso a paso. ` +
    'Termina indicando qué demuestra el ejemplo. Máximo 350 palabras.',
  deeper: (target) =>
    `Profundiza técnicamente en ${target} para un estudiante que quiere ir más allá: mecanismos subyacentes, formalismo (fórmulas o código si aplica), ` +
    'matices, casos límite y conexiones con temas más avanzados. Máximo 450 palabras. No inventes referencias.',
  question: (target, question) =>
    `Responde a la pregunta del estudiante: «${question.trim()}». Contexto: ${target}. ` +
    'Responde dentro del contexto de la lección; si la pregunta se sale del tema, respóndela brevemente y reconduce. ' +
    'Si detectas una confusión de fondo, señálala con amabilidad. Máximo 300 palabras.',
};

export function buildExpansionMessages(input: ExpansionInput): ChatMessage[] {
  const { lesson, course } = input;
  const selection = input.selection.trim();
  const target = selection
    ? `este fragmento de la lección «${lesson.title}»: «${truncateMiddle(selection, 1200)}»`
    : `la idea central de la lección «${lesson.title}»`;
  const user = [
    `Acción solicitada: ${EXPANSION_META[input.kind].label}.`,
    EXPANSION_INSTRUCTIONS[input.kind](target, input.question),
    `Nivel del estudiante: ${LEVEL_META[course.level].label}.`,
    'Responde en Markdown, sin encabezado principal; puedes usar listas, fórmulas LaTeX o bloques de código si ayudan.',
    '',
    lessonContext(input.content_markdown),
  ].join('\n');
  return [
    { role: 'system', content: systemPrompt(course.language) },
    { role: 'user', content: user },
  ];
}

/** Petición mínima para "Probar conexión" en Ajustes. */
export function buildPingMessages(): ChatMessage[] {
  return [
    { role: 'system', content: 'Responde solo con JSON.' },
    { role: 'user', content: 'Devuelve {"ok": true, "message": "listo"}.' },
  ];
}
