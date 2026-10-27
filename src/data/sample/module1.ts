import { card, q, type SampleLesson } from './helpers';

export const MODULE_1: Record<string, SampleLesson> = {
  '1.1': {
    markdown: String.raw`
Estudias algo con atención y, una semana después, apenas recuerdas nada. No es un defecto tuyo: le pasa a todo el mundo. La buena noticia es que el olvido sigue patrones conocidos, y quien los conoce puede estudiar mucho mejor con el mismo tiempo.

## La curva del olvido

En 1885, el psicólogo alemán **Hermann Ebbinghaus** hizo un experimento sobre sí mismo: memorizó listas de sílabas sin sentido («DAX», «BOK»…) y midió cuánto le costaba volver a aprenderlas tras distintos intervalos. Descubrió que **el olvido es muy rápido al principio y después se frena**. Un estudio de 2015 (Murre y Dros) replicó el experimento y encontró una curva muy parecida.

> **Concepto clave:** la *curva del olvido* describe cómo la probabilidad de recordar algo cae deprisa justo después de aprenderlo y luego cada vez más despacio, si no lo repasamos.

Estos son los datos aproximados de Ebbinghaus (el «ahorro» es cuánto tiempo se ahorraba al reaprender la lista):

| Tiempo desde el estudio | Ahorro al reaprender |
|---|---|
| 20 minutos | ≈ 58 % |
| 1 hora | ≈ 44 % |
| 1 día | ≈ 34 % |
| 6 días | ≈ 25 % |
| 1 mes | ≈ 21 % |

Ojo: eran sílabas sin significado. El material que entiendes y conectas con lo que ya sabes se olvida más despacio, pero la forma de la curva es la misma.

## Tres fases: codificar, consolidar y recuperar

Recordar algo implica tres procesos, y el olvido puede fallar en cualquiera:

1. **Codificación:** prestas atención y das sentido a la información. Si estudias distraído, el recuerdo nace débil.
2. **Consolidación:** después de aprender, el cerebro estabiliza el recuerdo, en buena parte **durante el sueño**.
3. **Recuperación:** cuando lo necesitas, lo buscas. Muchas veces el recuerdo existe pero no das con él (como cuando tienes una palabra «en la punta de la lengua»).

## La estabilidad del recuerdo

Los modelos modernos de memoria distinguen dos cosas: lo **accesible** que está un recuerdo ahora mismo y lo **estable** que es (cuánto tarda en olvidarse). Una forma sencilla de expresarlo:

$$R(t) \approx e^{-t/S}$$

donde $R$ es la probabilidad de recordar, $t$ el tiempo transcurrido y $S$ la **estabilidad**. Cuanto mayor es $S$, más plana es la curva. Y aquí está la clave: **cada vez que recuperas un recuerdo con cierto esfuerzo, su estabilidad aumenta**.

${'```'}mermaid
flowchart LR
  A["Aprendes"] --> B["Olvido rápido"]
  B --> C["Repaso con esfuerzo"]
  C --> D["Olvido más lento"]
  D --> E["Nuevo repaso"]
  E --> F["Recuerdo estable"]
${'```'}

Por eso, más que estudiar «mucho de una vez», importa **cuándo y cómo** repasas, que es lo que verás en las próximas lecciones.

## Errores frecuentes

- **Pensar que olvidar significa que «no sirves para estudiar».** Olvidar es lo normal; la solución es repasar de forma inteligente.
- **Confundir «me suena» con «lo sé».** Reconocer algo cuando lo ves es mucho más fácil que recordarlo sin pistas.
- **Recortar horas de sueño para estudiar más.** Sin consolidación, parte de ese esfuerzo se pierde.

## Resumen

- Sin repaso, olvidamos rápido al principio y más despacio después.
- La memoria tiene tres fases: codificar, consolidar (sueño) y recuperar.
- Cada recuperación con esfuerzo aumenta la estabilidad del recuerdo.
- Estudiar bien consiste en gestionar el olvido, no en evitarlo.

## Para pensar

¿Qué aprendiste en el último año que ya has olvidado casi por completo? ¿Lo repasaste alguna vez después de estudiarlo?
`,
    quiz: {
      questions: [
        q(
          'Según la curva del olvido, ¿cuándo se pierde la mayor parte de lo aprendido si no se repasa?',
          'Curva del olvido',
          'understand',
          [
            [
              'En las primeras horas y días después de aprenderlo',
              true,
              'Correcto: el olvido es rápido al principio y luego se frena.',
            ],
            [
              'De forma uniforme a lo largo de los años',
              false,
              'La curva no es una línea recta: cae deprisa al principio.',
            ],
            [
              'Solo después de varios meses',
              false,
              'Los datos de Ebbinghaus muestran pérdidas grandes en horas y días.',
            ],
            [
              'Nunca: lo aprendido se conserva intacto aunque no se use',
              false,
              'Sin repaso, la probabilidad de recordar disminuye con el tiempo.',
            ],
          ],
        ),
        q(
          'María estudia biología el lunes y no vuelve a mirarla hasta el examen del viernes. ¿Qué predice la curva del olvido?',
          'Curva del olvido',
          'apply',
          [
            [
              'Habrá olvidado buena parte; un repaso a mitad de semana habría frenado la caída',
              true,
              'Correcto: un repaso intermedio aumenta la estabilidad y aplana la curva.',
            ],
            [
              'Lo recordará todo porque solo han pasado cuatro días',
              false,
              'En cuatro días el olvido ya es considerable sin repaso.',
            ],
            [
              'Recordará más que el lunes porque el cerebro consolida solo',
              false,
              'La consolidación ayuda, pero no impide el olvido sin repaso.',
            ],
            [
              'El olvido solo afecta a sílabas sin sentido, no a la biología',
              false,
              'El material con sentido se olvida más despacio, pero también se olvida.',
            ],
          ],
        ),
        q(
          '¿Qué ocurre durante la consolidación?',
          'Codificación, consolidación y recuperación',
          'understand',
          [
            [
              'El recuerdo se estabiliza tras el aprendizaje, en parte durante el sueño',
              true,
              'Correcto: la consolidación ocurre después de aprender y el sueño la favorece.',
            ],
            ['Prestas atención a la información por primera vez', false, 'Eso es la codificación.'],
            ['Buscas el recuerdo cuando lo necesitas', false, 'Eso es la recuperación.'],
            [
              'El cerebro borra a propósito toda la información nueva',
              false,
              'La consolidación estabiliza recuerdos, no los borra.',
            ],
          ],
        ),
        q(
          'Hoy, Ana y Bruno recuerdan el 90 % de un tema. Ana lo repasó con esfuerzo varias veces a lo largo de semanas; Bruno lo leyó todo ayer. ¿Quién lo recordará mejor dentro de un mes?',
          'Estabilidad del recuerdo',
          'analyze',
          [
            [
              'Ana, porque sus recuerdos son más estables aunque hoy recuerden lo mismo',
              true,
              'Correcto: el mismo nivel hoy puede esconder estabilidades muy distintas.',
            ],
            [
              'Bruno, porque lo estudió más recientemente',
              false,
              'Lo reciente se olvida rápido si no se ha consolidado con repasos.',
            ],
            [
              'Los dos igual, porque hoy tienen el mismo nivel',
              false,
              'La estabilidad determina la velocidad del olvido futuro.',
            ],
            [
              'Ninguno: en un mes todo se olvida por completo',
              false,
              'Los recuerdos estables pueden durar meses o años.',
            ],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Qué describe la curva del olvido de Ebbinghaus?',
        'Que la probabilidad de recordar cae rápido justo después de aprender y luego más despacio, si no se repasa.',
        'Curva del olvido',
      ),
      card(
        '¿Cuáles son las tres fases de la memoria?',
        'Codificación (aprender), consolidación (estabilizar, en parte durante el sueño) y recuperación (acceder al recuerdo).',
        'Codificación, consolidación y recuperación',
      ),
      card(
        '¿Qué es la estabilidad de un recuerdo?',
        'Cuánto tarda en olvidarse. Cada recuperación con esfuerzo la aumenta y aplana la curva del olvido.',
        'Estabilidad del recuerdo',
      ),
      card(
        '¿Por qué «me suena» no significa «lo sé»?',
        'Reconocer algo cuando lo ves es más fácil que recordarlo sin pistas; la familiaridad no garantiza poder recuperarlo.',
        'Codificación, consolidación y recuperación',
      ),
      card(
        '¿Qué papel tiene el sueño en la memoria?',
        'Favorece la consolidación: dormir bien después de estudiar ayuda a estabilizar lo aprendido.',
        'Codificación, consolidación y recuperación',
      ),
    ],
  },

  '1.2': {
    markdown: String.raw`
La técnica de estudio más popular, **releer**, es de las menos eficaces. Y una de las más eficaces es algo que solemos ver como un simple examen: **ponerse a prueba**. Resulta que preguntarte no solo mide lo que sabes: hace que lo sepas mejor.

## El efecto test

En un estudio clásico, **Roediger y Karpicke (2006)** pidieron a estudiantes que aprendieran textos breves. Unos los estudiaron varias veces; otros los estudiaron una vez y después intentaron **recordarlos por escrito** sin mirar.

- A los 5 minutos, quienes releyeron recordaban un poco más.
- **Una semana después, la situación se invirtió:** quienes practicaron recordando retenían bastante más (en uno de los experimentos, aproximadamente un 61 % frente a un 40 %).

> **Concepto clave:** la *recuperación activa* (practicar sacando la información de tu memoria) fortalece el recuerdo mucho más que volver a estudiar durante el mismo tiempo.

El hallazgo se ha replicado cientos de veces. Una revisión muy citada (**Dunlosky y colaboradores, 2013**) calificó la práctica con preguntas como técnica de **utilidad alta**, mientras que releer y subrayar obtuvieron **utilidad baja**. Incluso para aprender a razonar, recuperar funciona: Karpicke y Blunt (2011) vieron que superaba a hacer mapas conceptuales.

## La ilusión de fluidez

¿Por qué releer parece tan útil? Porque, a la segunda lectura, el texto fluye: todo te resulta familiar. Esa **fluidez** se confunde con dominio, pero solo indica que **reconoces** el texto, no que puedas **recordarlo** ni usarlo cuando no lo tengas delante.

## Dificultades deseables

El psicólogo **Robert Bjork** acuñó el término *dificultades deseables*: condiciones que hacen que estudiar se sienta más costoso, pero que mejoran el aprendizaje a largo plazo. Recuperar de memoria es una de ellas. La condición es que la dificultad sea **superable**: si no consigues recordar nada, consulta la respuesta y vuelve a intentarlo más tarde.

## Cómo practicarlo

| Técnica | Cómo se hace |
|---|---|
| Hoja en blanco | Cierra el material y escribe todo lo que recuerdes; después compara. |
| Tarjetas | Pregunta en una cara, respuesta en la otra. Responde antes de girar. |
| Preguntas propias | Al terminar un apartado, escribe 3 preguntas y respóndelas al día siguiente. |
| Explicar en voz alta | Cuenta lo aprendido sin mirar, como si dieras una clase. |

En Omnilearn, cada lección termina con un **micro-quiz**, sus ideas se convierten en **tarjetas de repaso** y, si fallas una pregunta, esa pregunta pasa a tu mazo: así practicas justo lo que más te cuesta.

## Errores frecuentes

- **Mirar la respuesta demasiado pronto.** Concédete unos segundos de esfuerzo real antes de comprobar.
- **No comprobar las respuestas.** La retroalimentación evita que consolides un error.
- **Usar solo preguntas de reconocimiento.** Recordar sin pistas entrena más que elegir entre opciones.

## Resumen

- Ponerse a prueba es una de las técnicas de estudio con más respaldo científico.
- Releer produce fluidez y una falsa sensación de dominio.
- Un esfuerzo moderado al recordar es una dificultad deseable.
- Comprueba siempre tus respuestas para corregir errores.

## Para pensar

Piensa en tu forma habitual de estudiar. ¿Qué porcentaje del tiempo dedicas a leer y cuánto a intentar recordar sin mirar?
`,
    quiz: {
      questions: [
        q(
          'En el estudio de Roediger y Karpicke (2006), ¿qué ocurrió una semana después?',
          'Efecto test',
          'understand',
          [
            [
              'Quienes practicaron recordando retenían bastante más que quienes releyeron',
              true,
              'Correcto: la ventaja de la recuperación aparece a largo plazo.',
            ],
            [
              'Quienes releyeron retenían más, igual que a los 5 minutos',
              false,
              'A los 5 minutos ganaba la relectura, pero a la semana se invirtió el resultado.',
            ],
            [
              'Ambos grupos recordaban exactamente lo mismo',
              false,
              'Hubo una diferencia clara a favor de la recuperación.',
            ],
            [
              'Nadie recordaba nada del texto',
              false,
              'Ambos grupos recordaban parte; la diferencia estaba en cuánto.',
            ],
          ],
        ),
        q(
          'Preparas un examen de historia. ¿Qué actividad aprovecha mejor el efecto test?',
          'Efecto test',
          'apply',
          [
            [
              'Escribir de memoria lo que recuerdas de un tema y luego comprobarlo',
              true,
              'Correcto: recuperar y después contrastar es práctica de recuperación con retroalimentación.',
            ],
            [
              'Subrayar el libro con tres colores',
              false,
              'Subrayar es pasivo y tiene poca utilidad según las revisiones.',
            ],
            [
              'Releer los apuntes hasta que te resulten familiares',
              false,
              'La familiaridad produce ilusión de fluidez, no recuerdo duradero.',
            ],
            ['Copiar a mano el resumen del profesor', false, 'Copiar no obliga a recuperar la información.'],
          ],
        ),
        q('¿Qué es la ilusión de fluidez?', 'Ilusión de fluidez', 'understand', [
          [
            'Confundir la facilidad de procesar un material conocido con saberlo de verdad',
            true,
            'Correcto: reconocer el texto no es lo mismo que poder recordarlo o usarlo.',
          ],
          ['Hablar con soltura sobre un tema que dominas', false, 'Eso sería fluidez real, no una ilusión.'],
          [
            'La capacidad de leer muy rápido sin perder comprensión',
            false,
            'No describe un sesgo al evaluar lo aprendido.',
          ],
          [
            'Un trastorno de la memoria a largo plazo',
            false,
            'Es un sesgo cognitivo común, no un trastorno.',
          ],
        ]),
        q(
          'Un compañero dice: «Si me cuesta recordar algo, es que estoy estudiando mal». ¿Qué responderías según la idea de dificultades deseables?',
          'Dificultades deseables',
          'analyze',
          [
            [
              'Que cierto esfuerzo al recuperar es justo lo que fortalece la memoria, siempre que acabes respondiendo o compruebes la respuesta',
              true,
              'Correcto: el esfuerzo superable es una dificultad deseable.',
            ],
            [
              'Que tiene razón: aprender bien siempre se siente fácil',
              false,
              'La facilidad inmediata suele ser mala señal para el largo plazo.',
            ],
            [
              'Que el esfuerzo solo importa en el deporte, no al estudiar',
              false,
              'Las dificultades deseables se estudian precisamente en el aprendizaje académico.',
            ],
            [
              'Que no debe ponerse a prueba hasta dominar el tema',
              false,
              'Ponerse a prueba es parte de cómo se llega a dominarlo.',
            ],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Qué es la recuperación activa?',
        'Practicar sacando la información de la memoria (preguntas, tarjetas, escribir de memoria) en lugar de volver a leerla.',
        'Efecto test',
      ),
      card(
        '¿Qué mostraron Roediger y Karpicke (2006)?',
        'Releer gana a los 5 minutos, pero a la semana quienes practicaron recordando retenían mucho más (≈61 % frente a ≈40 %).',
        'Efecto test',
      ),
      card(
        '¿Qué son las dificultades deseables?',
        'Condiciones que hacen el estudio más costoso a corto plazo pero mejoran la retención: recuperar, espaciar, intercalar (Bjork).',
        'Dificultades deseables',
      ),
      card(
        '¿Por qué releer engaña?',
        'Produce familiaridad (fluidez), que se confunde con dominio aunque no entrena la recuperación.',
        'Ilusión de fluidez',
      ),
      card(
        '¿Por qué conviene comprobar la respuesta después de recordar?',
        'La retroalimentación corrige errores y evita consolidar respuestas equivocadas.',
        'Efecto test',
      ),
    ],
  },

  '1.3': {
    markdown: String.raw`
Imagina dos estudiantes que dedican cuatro horas a un tema. Uno las concentra la noche antes del examen; el otro reparte cuatro sesiones de una hora a lo largo de dos semanas. Dentro de un mes, el segundo recordará mucho más. Esa diferencia tiene nombre.

## El efecto de espaciado

Ya Ebbinghaus observó que **repartir los repasos en el tiempo** produce recuerdos más duraderos que concentrarlos. Hoy es uno de los hallazgos más sólidos de la psicología: un metaanálisis de **Cepeda y colaboradores (2006)**, con cientos de experimentos, lo confirmó con claridad.

> **Concepto clave:** con el mismo tiempo total de estudio, distribuir los repasos en varias sesiones separadas produce más retención a largo plazo que concentrarlos en una sola («atracón»).

¿Cuánto espaciar? Un estudio posterior (**Cepeda y colaboradores, 2008**) encontró que el intervalo ideal depende de cuánto tiempo quieres recordar. Como regla aproximada, conviene separar los repasos alrededor de un **10-20 % del tiempo que quieres retener** la información: para un examen dentro de una semana, repasos con un día de diferencia; para recordar algo un año, repasos separados por semanas.

## Intervalos crecientes

Como cada repaso con éxito aumenta la estabilidad del recuerdo, el siguiente puede llegar **más tarde**. Un plan típico se parece a esto:

| Repaso | Cuándo |
|---|---|
| 1.º | Al día siguiente |
| 2.º | A los 3 días |
| 3.º | A la semana |
| 4.º | A las 3 semanas |
| 5.º | A los 2 meses |

Si en un repaso fallas, el intervalo vuelve a acortarse: es la señal de que ese recuerdo necesitaba más práctica.

## Cómo lo hace Omnilearn: FSRS

Omnilearn programa tus tarjetas con **FSRS** (*Free Spaced Repetition Scheduler*), un algoritmo de código abierto que también usa Anki desde 2023. FSRS estima para cada tarjeta su **dificultad**, su **estabilidad** y la **probabilidad de que la recuerdes** hoy, y la programa para cuando esa probabilidad baje a tu **retención deseada** (por defecto, el 90 %).

Al repasar, calificas tu recuerdo:

- **Otra vez:** no la recordabas. Volverá pronto.
- **Difícil:** la recordaste con mucho esfuerzo.
- **Bien:** la recordaste con un esfuerzo razonable.
- **Fácil:** la recordaste sin esfuerzo. El siguiente intervalo será largo.

Además, el repaso **mezcla tarjetas de todas tus rutas**, lo que añade práctica intercalada (lo verás en el módulo 2).

## Errores frecuentes

- **Estudiar todo la víspera.** Sirve para mañana, no para dentro de un mes.
- **Repasar demasiado pronto.** Si aún lo recuerdas sin esfuerzo, el repaso aporta poco.
- **Saltarse días y acumular cientos de tarjetas.** Mejor 10-15 minutos diarios que dos horas un domingo.
- **Calificar con poca sinceridad.** El algoritmo solo es tan bueno como la información que le das.

## Resumen

- Repartir el estudio en el tiempo multiplica la retención.
- El intervalo ideal crece con lo que quieres recordar (≈ 10-20 % del plazo).
- Cada repaso con éxito permite esperar más hasta el siguiente.
- FSRS programa cada tarjeta para cuando estés a punto de olvidarla.

## Para pensar

Si tuvieras que recordar dentro de un año lo que estudias hoy, ¿cómo cambiaría tu forma de organizar el estudio esta semana?
`,
    quiz: {
      questions: [
        q('¿Qué afirma el efecto de espaciado?', 'Efecto de espaciado', 'understand', [
          [
            'Con el mismo tiempo total, repartir el estudio en varias sesiones produce mejor retención a largo plazo',
            true,
            'Correcto: distribuir supera a concentrar para el largo plazo.',
          ],
          [
            'Estudiar todo de golpe es mejor si se duerme bien después',
            false,
            'El sueño ayuda, pero no compensa la falta de espaciado.',
          ],
          ['Solo funciona para aprender idiomas', false, 'Se ha observado en muchísimos tipos de material.'],
          [
            'Cuanto más corto el intervalo entre repasos, mejor',
            false,
            'Intervalos demasiado cortos aportan poco: el repaso debe exigir algo de esfuerzo.',
          ],
        ]),
        q(
          'Quieres recordar un tema durante un año. Según Cepeda y colaboradores (2008), ¿qué intervalo entre repasos es razonable?',
          'Intervalos crecientes',
          'apply',
          [
            [
              'Varias semanas: alrededor de un 10-20 % del tiempo que quieres recordarlo',
              true,
              'Correcto: para un año, intervalos del orden de semanas.',
            ],
            ['Diez minutos', false, 'Un intervalo tan corto apenas exige recuperar.'],
            ['Exactamente un año', false, 'Esperar todo el plazo significa olvidar antes de repasar.'],
            [
              'No importa el intervalo, solo el número de repasos',
              false,
              'El intervalo es precisamente lo que estudia el efecto de espaciado.',
            ],
          ],
        ),
        q(
          'En el repaso de Omnilearn (FSRS), ¿cuándo vuelve a aparecer una tarjeta?',
          'Algoritmo FSRS',
          'understand',
          [
            [
              'Cuando se estima que tu probabilidad de recordarla ha bajado hasta la retención deseada (p. ej., 90 %)',
              true,
              'Correcto: FSRS programa el repaso según la probabilidad estimada de recuerdo.',
            ],
            [
              'Cada día a la misma hora, siempre',
              false,
              'Los intervalos se adaptan a cada tarjeta y a tus respuestas.',
            ],
            ['Solo cuando la fallas', false, 'También vuelven las que aciertas, cada vez más espaciadas.'],
            [
              'Al azar, para que no la esperes',
              false,
              'La programación no es aleatoria: sigue un modelo de memoria.',
            ],
          ],
        ),
        q(
          'Una tarjeta te resultó fácil, pero pulsas «Otra vez» por precaución. ¿Qué consecuencia tiene?',
          'Algoritmo FSRS',
          'analyze',
          [
            [
              'La verás mucho antes de lo necesario y gastarás tiempo en algo que ya dominas',
              true,
              'Correcto: calificar con sinceridad permite intervalos eficientes.',
            ],
            [
              'Ninguna: el algoritmo ignora la calificación',
              false,
              'La calificación es la principal información que usa el algoritmo.',
            ],
            [
              'La memorizarás mejor sin ningún coste',
              false,
              'Repasar algo que ya dominas aporta poco y consume tiempo.',
            ],
            ['Se borrará de tu mazo', false, 'Las tarjetas no se borran por calificarlas.'],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Qué es el efecto de espaciado?',
        'Repartir el estudio en el tiempo produce más retención a largo plazo que concentrarlo en una sola sesión.',
        'Efecto de espaciado',
      ),
      card(
        'Regla aproximada para el intervalo entre repasos (Cepeda et al., 2008)',
        'Alrededor del 10-20 % del tiempo durante el que quieres recordar (para un año, semanas).',
        'Intervalos crecientes',
      ),
      card(
        '¿Qué es FSRS?',
        'Un algoritmo de repaso espaciado que modela dificultad, estabilidad y probabilidad de recuerdo para programar cada tarjeta.',
        'Algoritmo FSRS',
      ),
      card(
        '¿Qué es la retención deseada en FSRS?',
        'La probabilidad de recordar a la que se programa el repaso (por defecto, 90 %).',
        'Algoritmo FSRS',
      ),
      card(
        '¿Por qué calificar con sinceridad al repasar?',
        'El algoritmo ajusta los intervalos a tus respuestas; si no eres sincero, repasarás demasiado o demasiado poco.',
        'Algoritmo FSRS',
      ),
    ],
  },
};
