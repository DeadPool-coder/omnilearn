/**
 * Proveedor de demostración: funciona sin clave ni conexión.
 *
 * No "sabe" de ningún tema: produce una guía de estudio activa y genérica para el tema pedido,
 * con técnicas de aprendizaje basadas en evidencia (que sí son contenido real y verificable).
 * Devuelve las mismas estructuras JSON que un LLM, así que ejercita todo el pipeline
 * (prompts → proveedor → extracción → validación → normalización) y permite probar la app.
 */
import type { AssessmentInput, ExpansionInput, FeynmanInput, LessonInput, SyllabusInput } from '../prompts';
import { aiError } from '../errors';
import { normalizeForSearch, wordCount } from '@/lib/text';
import type { JSONRequest, LLMProvider, ProviderConfig, TextStreamRequest } from '../types';

const DEMO_NOTICE =
  '> **Modo demostración.** Este contenido se generó sin IA a partir de plantillas. ' +
  'Conecta un proveedor en **Ajustes** para recibir lecciones reales sobre el tema.';

// ---------------------------------------------------------------------------
// Syllabus
// ---------------------------------------------------------------------------

interface DemoLesson {
  title: string;
  objective: string;
  key_concepts: string[];
}

function demoSyllabus(input: SyllabusInput) {
  const t = input.topic.trim() || 'el tema';
  const deep = input.time_budget === 'deep';
  const minutes = deep ? 18 : 6;
  const modules: { title: string; description: string; lessons: DemoLesson[] }[] = [
    {
      title: `Mapa del territorio: qué es ${t}`,
      description: `Construir una visión global de ${t} antes de entrar en los detalles.`,
      lessons: [
        {
          title: `Panorama de ${t}: el mapa antes del viaje`,
          objective: `Al terminar podrás describir las grandes áreas de ${t} y cómo se relacionan entre sí.`,
          key_concepts: ['Visión global', 'Mapa conceptual', 'Preguntas guía'],
        },
        {
          title: `El vocabulario esencial de ${t}`,
          objective: 'Al terminar podrás construir tu glosario base y usarlo con precisión.',
          key_concepts: ['Glosario activo', 'Definición operativa', 'Ejemplos y contraejemplos'],
        },
        {
          title: `Las preguntas fundamentales de ${t}`,
          objective: `Al terminar podrás formular las preguntas que organizan el estudio de ${t}.`,
          key_concepts: ['Preguntas fundamentales', 'Problemas centrales'],
        },
      ],
    },
    {
      title: 'Comprender en profundidad',
      description: `Pasar de reconocer ideas de ${t} a poder usarlas y explicarlas.`,
      lessons: [
        {
          title: `Cómo piensan los expertos en ${t}`,
          objective: 'Al terminar podrás identificar los modelos mentales y patrones que usan los expertos.',
          key_concepts: ['Modelos mentales', 'Fragmentación (chunking)', 'Patrones de experto'],
        },
        {
          title: `Práctica deliberada aplicada a ${t}`,
          objective: 'Al terminar podrás diseñar sesiones de práctica con objetivos y retroalimentación.',
          key_concepts: ['Práctica deliberada', 'Ejemplos resueltos', 'Retroalimentación inmediata'],
        },
        {
          title: `Errores frecuentes al aprender ${t}`,
          objective: 'Al terminar podrás detectar la ilusión de competencia y corregir errores conceptuales.',
          key_concepts: ['Ilusión de competencia', 'Errores conceptuales'],
        },
      ],
    },
    {
      title: 'Consolidar y transferir',
      description: `Hacer que lo aprendido sobre ${t} dure y se pueda aplicar en situaciones nuevas.`,
      lessons: [
        {
          title: `Recordar ${t} a largo plazo`,
          objective: 'Al terminar podrás planificar repasos espaciados con recuperación activa.',
          key_concepts: ['Curva del olvido', 'Recuperación activa', 'Repaso espaciado'],
        },
        {
          title: `Explica ${t} con tus palabras`,
          objective: 'Al terminar podrás explicar el tema a un principiante y detectar tus lagunas.',
          key_concepts: ['Técnica Feynman', 'Autoexplicación', 'Transferencia'],
        },
        {
          title: `Proyecto integrador de ${t}`,
          objective: `Al terminar podrás aplicar lo aprendido de ${t} en un caso o proyecto propio.`,
          key_concepts: ['Aprendizaje por proyectos', 'Integración'],
        },
      ],
    },
  ];
  const perModule = input.focus === 'executive' ? 2 : deep ? 3 : 2;
  const moduleCount = input.focus === 'executive' ? 2 : 3;
  return {
    title: `${t}: ruta de aprendizaje (demo)`,
    description:
      `Ruta de demostración creada sin IA: una guía para estudiar ${t} con técnicas basadas en evidencia. ` +
      'Conecta un proveedor de IA en Ajustes para obtener contenido específico del tema.',
    learning_outcomes: [
      `Construir un mapa mental propio de ${t}.`,
      'Aplicar recuperación activa, repaso espaciado y la técnica Feynman.',
      `Explicar las ideas centrales de ${t} con tus propias palabras.`,
    ],
    prerequisites: [],
    modules: modules.slice(0, moduleCount).map((m) => ({
      title: m.title,
      description: m.description,
      lessons: m.lessons.slice(0, perModule).map((l) => ({ ...l, estimated_minutes: minutes })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Lecciones
// ---------------------------------------------------------------------------

const TECHNIQUES = [
  {
    name: 'Recuperación activa',
    how: 'Cierra el material e intenta recordar las ideas principales; después compruébalo.',
    why: 'Cada recuerdo exitoso fortalece la memoria más que releer (efecto test).',
  },
  {
    name: 'Repaso espaciado',
    how: 'Repasa justo antes de olvidar: 1 día, 3 días, 1 semana, 1 mes…',
    why: 'Recuperar con esfuerzo tras un intervalo consolida el recuerdo a largo plazo.',
  },
  {
    name: 'Práctica intercalada',
    how: 'Mezcla tipos de problemas en lugar de practicar por bloques.',
    why: 'Te obliga a elegir la estrategia correcta, como en un examen real.',
  },
  {
    name: 'Técnica Feynman',
    how: 'Explica la idea con palabras sencillas, como a un principiante.',
    why: 'Las lagunas aparecen justo donde no puedes explicar con sencillez.',
  },
  {
    name: 'Elaboración',
    how: 'Pregúntate «¿por qué?» y «¿cómo se relaciona con lo que ya sé?».',
    why: 'Conectar ideas crea más vías de acceso al recuerdo.',
  },
  {
    name: 'Ejemplos resueltos',
    how: 'Estudia un ejemplo paso a paso y luego resuelve uno parecido sin ayuda.',
    why: 'Reduce la carga cognitiva cuando el tema es nuevo.',
  },
];

function lessonIndex(lessonId: string): number {
  const [m, l] = lessonId.split('.').map((n) => Number(n) || 1);
  return (m - 1) * 3 + (l - 1);
}

function stripObjective(objective: string): string {
  const cleaned = objective.replace(/^al terminar podr[aá]s\s*/i, '').replace(/\.$/, '');
  return cleaned ? cleaned.charAt(0).toLowerCase() + cleaned.slice(1) : 'dominar las ideas de esta lección';
}

function demoLesson(input: LessonInput): string {
  const { lesson, course } = input;
  const topic = course.topic;
  const idx = lessonIndex(lesson.lesson_id);
  const technique = TECHNIQUES[idx % TECHNIQUES.length];
  const deep = course.time_budget === 'deep';
  const concepts = lesson.key_concepts.length ? lesson.key_concepts : ['Idea central'];

  const conceptSections = concepts
    .map(
      (c, i) => `## ${c}

**Intuición primero.** Antes de buscar una definición, escribe en una frase qué crees que significa «${c}» en el contexto de ${topic}. Equivocarte ahora es útil: cuando contrastes tu intento con una fuente fiable, recordarás mejor la versión correcta (efecto de generación).

> **Concepto clave:** ${c}. Redacta una definición operativa con tres partes: qué es, para qué sirve en ${topic} y un ejemplo concreto.

${
  i === 0
    ? `**Ejemplo resuelto (plantilla).** Supón que estudias «${c}»:
1. Busca una definición en una fuente de referencia del tema.
2. Reescríbela con tus palabras sin mirarla.
3. Añade un ejemplo y un contraejemplo (algo que *parece* ${c} pero no lo es).
4. Comprueba tu versión contra la fuente y corrige.`
    : `**Pregunta de elaboración.** ¿Cómo se relaciona «${c}» con «${concepts[0]}»? Escribe la relación en una frase del tipo «A influye en B porque…».`
}`,
    )
    .join('\n\n');

  const deepBlock = deep
    ? `
## Ejercicio guiado

Dedica 15 minutos a este ciclo:

| Paso | Qué haces | Tiempo |
|---|---|---|
| 1. Pre-test | Escribe todo lo que sabes de ${concepts.join(', ')} | 3 min |
| 2. Estudio | Consulta una fuente fiable y toma notas breves | 6 min |
| 3. Recuperación | Cierra las notas y explica cada concepto en voz alta | 4 min |
| 4. Corrección | Compara y marca lo que olvidaste para repasarlo | 2 min |
`
    : '';

  return `${DEMO_NOTICE}

En esta lección vas a ${stripObjective(lesson.objective)}. En lugar de leer pasivamente, vas a **construir** el conocimiento con una guía de estudio activa: la mejor forma de aprender ${topic} es obligarte a recordar, explicar y aplicar.

${conceptSections}
${deepBlock}
## Cómo estudiar esta lección: ${technique.name.toLowerCase()}

${technique.how} ${technique.why}

\`\`\`mermaid
flowchart LR
  A["Estudiar"] --> B["Cerrar el material"]
  B --> C["Recordar sin ayuda"]
  C --> D["Comprobar y corregir"]
  D --> E["Repasar más tarde"]
  E --> C
\`\`\`

| Técnica | Qué haces | Por qué funciona |
|---|---|---|
${TECHNIQUES.slice(0, 4)
  .map((t) => `| ${t.name} | ${t.how} | ${t.why} |`)
  .join('\n')}

La memoria decae con el tiempo de forma aproximadamente exponencial: una aproximación clásica es $R(t) = e^{-t/S}$, donde $R$ es la probabilidad de recordar, $t$ el tiempo transcurrido y $S$ la estabilidad del recuerdo. Cada repaso con esfuerzo aumenta $S$, y por eso los intervalos entre repasos pueden crecer.

Una plantilla de notas que puedes copiar:

\`\`\`markdown
## ${lesson.title}
- Pregunta clave: …
- Mi explicación (sin mirar): …
- Ejemplo / contraejemplo: …
- Lo que olvidé y repasaré: …
\`\`\`

## Errores frecuentes

- **Releer en lugar de recordar.** Releer da sensación de dominio (fluidez), pero no entrena la recuperación.
- **Subrayar todo.** Si todo está resaltado, nada lo está; mejor convertir lo importante en preguntas.
- **Estudiar en bloque la víspera.** Funciona para mañana, no para dentro de un mes.

## Resumen

- Intenta recordar antes de consultar: equivocarte primero también enseña.
- Define cada concepto con tus palabras: qué es, para qué sirve y un ejemplo.
- Usa ${technique.name.toLowerCase()} para que lo aprendido de ${topic} se quede.
- Convierte tus dudas en tarjetas de repaso.

## Para pensar

¿Qué parte de ${topic} te costaría más explicar sin mirar tus notas? ¿Por qué crees que ocurre?`;
}

// ---------------------------------------------------------------------------
// Quiz y flashcards (sobre las técnicas de estudio, que sí son contenido real)
// ---------------------------------------------------------------------------

const QUESTION_BANK = [
  {
    question:
      'Tienes una hora para preparar un tema. ¿Qué estrategia suele producir más retención a largo plazo?',
    concept: 'Recuperación activa',
    bloom_level: 'apply',
    options: [
      [
        'Leer una vez y luego hacerte preguntas sin mirar el material',
        true,
        'Correcto: recuperar la información fortalece la memoria más que volver a leer (efecto test).',
      ],
      [
        'Releer el tema tres veces seguidas',
        false,
        'Releer produce sensación de dominio, pero apenas entrena la recuperación.',
      ],
      [
        'Subrayar las ideas principales con colores',
        false,
        'Subrayar es pasivo y, por sí solo, aporta poco a la retención.',
      ],
      ['Copiar el texto completo a mano', false, 'Copiar literalmente no obliga a recordar ni a reformular.'],
    ],
  },
  {
    question: '¿Por qué conviene espaciar los repasos en lugar de concentrarlos en una sola sesión?',
    concept: 'Repaso espaciado',
    bloom_level: 'understand',
    options: [
      [
        'Porque recuperar algo que empieza a olvidarse consolida más el recuerdo',
        true,
        'Correcto: el esfuerzo de recuperar tras un intervalo aumenta la estabilidad del recuerdo.',
      ],
      [
        'Porque el cerebro solo puede aprender una vez al día',
        false,
        'No existe tal límite; la clave es el esfuerzo de recuperación tras un intervalo.',
      ],
      [
        'Porque así se estudia menos tiempo en total sin ningún coste',
        false,
        'Espaciar requiere planificación; su ventaja es retener más con el mismo tiempo.',
      ],
      [
        'Porque estudiar en bloque no funciona ni siquiera a corto plazo',
        false,
        'Estudiar en bloque sí ayuda a corto plazo; falla para el largo plazo.',
      ],
    ],
  },
  {
    question:
      'Al practicar problemas de un tema con varios tipos de ejercicio, ¿qué es la práctica intercalada?',
    concept: 'Práctica intercalada',
    bloom_level: 'understand',
    options: [
      [
        'Mezclar tipos de problemas para tener que elegir la estrategia en cada uno',
        true,
        'Correcto: intercalar entrena a discriminar qué método usar, como en un examen.',
      ],
      [
        'Hacer todos los problemas de un tipo y luego pasar al siguiente',
        false,
        'Eso es práctica en bloque, el opuesto de intercalar.',
      ],
      [
        'Alternar entre estudiar y descansar cada 10 minutos',
        false,
        'Eso describe pausas, no intercalado de tipos de problema.',
      ],
      [
        'Estudiar dos asignaturas a la vez en la misma página',
        false,
        'Intercalar se refiere a mezclar tipos de práctica, no a leer dos cosas a la vez.',
      ],
    ],
  },
  {
    question:
      'Intentas explicar un concepto con palabras sencillas y te atascas. Según la técnica Feynman, ¿qué significa?',
    concept: 'Técnica Feynman',
    bloom_level: 'analyze',
    options: [
      [
        'Que has encontrado una laguna: debes volver a la fuente y estudiar esa parte',
        true,
        'Correcto: el atasco señala exactamente lo que aún no entiendes.',
      ],
      [
        'Que el concepto no se puede explicar de forma sencilla',
        false,
        'Casi cualquier idea admite una explicación sencilla, aunque sea aproximada.',
      ],
      [
        'Que debes usar más términos técnicos para sonar preciso',
        false,
        'La jerga suele esconder las lagunas en vez de resolverlas.',
      ],
      [
        'Que ya lo dominas y puedes pasar al siguiente tema',
        false,
        'Si no puedes explicarlo con sencillez, todavía no lo dominas.',
      ],
    ],
  },
  {
    question: '¿Qué es la «ilusión de competencia» al estudiar?',
    concept: 'Ilusión de competencia',
    bloom_level: 'remember',
    options: [
      [
        'Creer que dominas algo porque te resulta familiar al releerlo',
        true,
        'Correcto: reconocer no es lo mismo que poder recordar o aplicar.',
      ],
      [
        'Sobrestimar la dificultad de un tema nuevo',
        false,
        'Eso sería subestimar tu competencia, no sobrestimarla.',
      ],
      ['Aprender rápido gracias al talento natural', false, 'No describe un sesgo al evaluar lo aprendido.'],
      [
        'Olvidar algo justo antes de un examen',
        false,
        'Olvidar es distinto de creer que sabes algo que no sabes.',
      ],
    ],
  },
  {
    question:
      'Un principiante empieza un tema muy nuevo. ¿Qué apoyo reduce mejor su carga cognitiva al principio?',
    concept: 'Ejemplos resueltos',
    bloom_level: 'apply',
    options: [
      [
        'Estudiar ejemplos resueltos paso a paso antes de resolver problemas solo',
        true,
        'Correcto: los ejemplos resueltos liberan memoria de trabajo para entender la estructura.',
      ],
      [
        'Resolver directamente los problemas más difíciles',
        false,
        'Sin base, la carga cognitiva es tan alta que se aprende poco del intento.',
      ],
      [
        'Memorizar las soluciones sin entenderlas',
        false,
        'Memorizar soluciones no transfiere a problemas nuevos.',
      ],
      [
        'Leer solo resúmenes muy breves',
        false,
        'Los resúmenes omiten justo los pasos que el principiante necesita ver.',
      ],
    ],
  },
  {
    question: '¿Qué hace la elaboración (preguntarse «¿por qué?» y «¿cómo se relaciona?»)?',
    concept: 'Elaboración',
    bloom_level: 'understand',
    options: [
      [
        'Conecta la idea nueva con lo que ya sabes, creando más vías para recordarla',
        true,
        'Correcto: las conexiones dan más rutas de acceso al recuerdo.',
      ],
      [
        'Sustituye la necesidad de practicar',
        false,
        'Ayuda a comprender, pero la práctica y la recuperación siguen siendo necesarias.',
      ],
      [
        'Sirve solo para temas de humanidades',
        false,
        'Funciona en cualquier disciplina, incluidas las técnicas.',
      ],
      [
        'Consiste en escribir resúmenes largos',
        false,
        'Elaborar es explicar relaciones y causas, no alargar resúmenes.',
      ],
    ],
  },
] as const;

const CARD_BANK = [
  [
    '¿Qué es la recuperación activa?',
    'Intentar recordar la información sin mirarla (con preguntas o tarjetas) y luego comprobarla. Fortalece la memoria más que releer.',
    'Recuperación activa',
  ],
  [
    '¿Por qué funciona el repaso espaciado?',
    'Recuperar algo cuando empieza a olvidarse exige esfuerzo, y ese esfuerzo aumenta la estabilidad del recuerdo.',
    'Repaso espaciado',
  ],
  [
    '¿Qué es la ilusión de competencia?',
    'Creer que dominas algo porque te resulta familiar al releerlo, aunque no puedas recordarlo ni aplicarlo.',
    'Ilusión de competencia',
  ],
  [
    'Pasos básicos de la técnica Feynman',
    'Elegir un concepto, explicarlo con palabras sencillas, detectar dónde te atascas, volver a la fuente y simplificar.',
    'Técnica Feynman',
  ],
  [
    '¿Qué es la práctica intercalada?',
    'Mezclar tipos de problemas en una sesión para tener que decidir qué estrategia usar en cada uno.',
    'Práctica intercalada',
  ],
  [
    '¿Qué es una definición operativa?',
    'Una definición con tus palabras que dice qué es algo, para qué sirve y cómo reconocerlo con un ejemplo.',
    'Definición operativa',
  ],
  [
    '¿Para qué sirve un contraejemplo al estudiar?',
    'Delimita un concepto mostrando algo que se le parece pero no cumple la definición.',
    'Ejemplos y contraejemplos',
  ],
  [
    '¿Qué es el efecto de generación?',
    'Producir tú mismo una respuesta (aunque falles) mejora el recuerdo frente a solo leerla.',
    'Recuperación activa',
  ],
  [
    '¿Qué es la práctica deliberada?',
    'Práctica centrada en debilidades concretas, con objetivos claros y retroalimentación inmediata.',
    'Práctica deliberada',
  ],
  [
    '¿Qué es el chunking (fragmentación)?',
    'Agrupar información en unidades con significado; los expertos ven patrones donde el novato ve piezas sueltas.',
    'Fragmentación (chunking)',
  ],
] as const;

function rotate<T>(items: readonly T[], start: number, count: number): T[] {
  return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(start + i) % items.length]);
}

function demoQuiz(input: AssessmentInput) {
  const count = Math.min(5, Math.max(3, input.count));
  const start = lessonIndex(input.lesson.lesson_id);
  return {
    questions: rotate(QUESTION_BANK, start, count).map((q) => ({
      question: q.question,
      concept: q.concept,
      bloom_level: q.bloom_level,
      options: q.options.map(([text, is_correct, explanation]) => ({ text, is_correct, explanation })),
    })),
  };
}

function demoFlashcards(input: AssessmentInput) {
  const count = Math.min(15, Math.max(3, input.count));
  const start = lessonIndex(input.lesson.lesson_id) * 2;
  return {
    cards: rotate(CARD_BANK, start, count).map(([front, back, concept]) => ({ front, back, concept })),
  };
}

// ---------------------------------------------------------------------------
// Evaluación Feynman heurística
// ---------------------------------------------------------------------------

function demoFeynman(input: FeynmanInput) {
  const text = input.explanation;
  const normalized = normalizeForSearch(text);
  const words = wordCount(text);
  const concepts = input.lesson.key_concepts;
  const covered = concepts.filter((c) =>
    normalizeForSearch(c)
      .split(/[\s()]+/)
      .filter((w) => w.length > 3)
      .some((w) => normalized.includes(w)),
  );
  const missing = concepts.filter((c) => !covered.includes(c));
  const coverage = concepts.length ? covered.length / concepts.length : 0;
  const hasExample = /(por ejemplo|es como|imagina|como cuando|piensa en|por ej)/.test(normalized);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length || 1;
  const avgSentence = words / sentences;

  const tooShort = words < 30;
  // Sin IA no se puede verificar la exactitud: la limitamos para no dar una falsa sensación de dominio.
  const accuracy = tooShort ? 10 : Math.round(18 + 12 * coverage);
  const completeness = Math.round(30 * coverage * (tooShort ? 0.5 : 1));
  const clarity = tooShort ? 6 : avgSentence <= 22 ? 18 : avgSentence <= 32 ? 13 : 8;
  const examples = hasExample ? 9 : 3;

  return {
    rubric: { accuracy, completeness, clarity, examples },
    verdict: 'partial',
    summary:
      'Evaluación de demostración (heurística, sin IA): mide la extensión, la cobertura de conceptos clave y el uso de ejemplos, ' +
      'pero no puede comprobar si lo que dices es correcto. Conecta un proveedor de IA para una evaluación real.',
    strengths: [
      ...(covered.length ? [`Mencionas: ${covered.join(', ')}.`] : []),
      ...(hasExample ? ['Usas un ejemplo o analogía, lo que facilita la comprensión.'] : []),
      ...(!tooShort && avgSentence <= 22 ? ['Tus frases son cortas y fáciles de seguir.'] : []),
    ],
    gaps: missing.map((c) => `No queda claro cómo explicarías «${c}».`),
    misconceptions: [],
    jargon: [],
    suggestions: [
      ...(tooShort ? ['Desarrolla más tu explicación: apunta a 80-200 palabras.'] : []),
      ...(!hasExample ? ['Añade un ejemplo concreto o una analogía de la vida diaria.'] : []),
      ...(missing.length ? ['Relaciona cada concepto clave con el anterior («A causa B porque…»).'] : []),
    ].slice(0, 5),
    follow_up_question: `Si tuvieras que explicar «${input.lesson.title}» en una sola frase a un niño de 10 años, ¿qué dirías?`,
  };
}

// ---------------------------------------------------------------------------
// Acciones rápidas
// ---------------------------------------------------------------------------

function demoExpansion(input: ExpansionInput): string {
  const subject = input.selection.trim()
    ? `«${input.selection.trim().slice(0, 160)}${input.selection.trim().length > 160 ? '…' : ''}»`
    : `la idea central de «${input.lesson.title}»`;
  switch (input.kind) {
    case 'simpler':
      return `${DEMO_NOTICE}

**Analogía:** piensa en ${subject} como en aprender el camino a casa de un amigo. La primera vez necesitas el mapa a cada paso; tras recorrerlo varias veces *sin mirar*, el camino queda grabado.

- **El mapa** = el material de estudio.
- **Recorrer el camino sin mapa** = la recuperación activa.
- **Volver días después** = el repaso espaciado.

*Límite de la analogía:* un camino es una secuencia fija; en ${input.course.topic} las ideas forman una red, así que conviene practicar conexiones, no solo rutas.`;
    case 'example':
      return `${DEMO_NOTICE}

**Caso práctico:** Ana estudia ${input.course.topic} 30 minutos al día.

1. **Día 1:** lee sobre ${subject} y escribe 5 preguntas.
2. **Día 2:** responde las preguntas sin mirar; acierta 3/5 y repasa las 2 falladas.
3. **Día 4:** vuelve a responder; acierta 4/5.
4. **Día 10:** acierta 5/5 y explica el tema en voz alta.

**Qué demuestra:** con el mismo tiempo total, recuperar y espaciar produce un recuerdo más duradero que leer cuatro veces seguidas.`;
    case 'deeper':
      return `${DEMO_NOTICE}

**Profundizando en ${subject}:** los modelos de memoria como FSRS describen cada recuerdo con dos variables: la **estabilidad** $S$ (cuánto tarda en olvidarse) y la **dificultad** $D$. La probabilidad de recordar tras $t$ días se aproxima con una curva de olvido decreciente $R(t, S)$, y cada repaso exitoso aumenta $S$ más cuanto menor era $R$ en ese momento.

Consecuencia práctica: repasar cuando $R \\approx 0{,}9$ equilibra el esfuerzo y la retención; repasar demasiado pronto aporta poco y demasiado tarde obliga a reaprender.`;
    case 'question':
      return `${DEMO_NOTICE}

Has preguntado: *«${input.question.trim() || 'sin pregunta'}»*.

En modo demostración no puedo responder sobre ${input.course.topic}, pero sí puedo sugerirte cómo investigarlo:
1. Formula la pregunta en una frase precisa.
2. Busca la respuesta en una fuente fiable.
3. Explícala con tus palabras y crea una tarjeta de repaso con ella.`;
  }
}

// ---------------------------------------------------------------------------
// Proveedor
// ---------------------------------------------------------------------------

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return signal?.aborted ? Promise.reject(aiError('aborted')) : Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(aiError('aborted'));
      },
      { once: true },
    );
  });
}

export class DemoProvider implements LLMProvider {
  readonly id = 'demo' as const;
  readonly model = 'plantillas';
  private readonly delay: number;

  constructor(config?: Partial<ProviderConfig>) {
    this.delay = config?.demoDelayMs ?? 12;
  }

  async generateJSON(req: JSONRequest): Promise<string> {
    await sleep(this.delay * 20, req.signal);
    let result: unknown;
    switch (req.task) {
      case 'syllabus':
        result = demoSyllabus(req.taskInput as SyllabusInput);
        break;
      case 'quiz':
        result = demoQuiz(req.taskInput as AssessmentInput);
        break;
      case 'flashcards':
        result = demoFlashcards(req.taskInput as AssessmentInput);
        break;
      case 'feynman':
        result = demoFeynman(req.taskInput as FeynmanInput);
        break;
      case 'ping':
        result = { ok: true, message: 'listo' };
        break;
      default:
        throw aiError('bad_request', { detail: `El modo demo no genera JSON para la tarea ${req.task}` });
    }
    return JSON.stringify(result);
  }

  async streamText(req: TextStreamRequest): Promise<string> {
    let text: string;
    if (req.task === 'lesson') text = demoLesson(req.taskInput as LessonInput);
    else if (req.task === 'expansion') text = demoExpansion(req.taskInput as ExpansionInput);
    else throw aiError('bad_request', { detail: `El modo demo no genera texto para la tarea ${req.task}` });

    // Simulamos el streaming en fragmentos de unas pocas palabras.
    const pieces = text.match(/\S+\s*|\s+/g) ?? [text];
    let full = '';
    for (let i = 0; i < pieces.length; i += 4) {
      await sleep(this.delay, req.signal);
      const delta = pieces.slice(i, i + 4).join('');
      full += delta;
      req.onDelta?.(delta, full);
    }
    return full;
  }

  async listModels(): Promise<string[]> {
    return ['plantillas'];
  }
}
