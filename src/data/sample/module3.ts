import { card, q, type SampleLesson } from './helpers';

export const MODULE_3: Record<string, SampleLesson> = {
  '3.1': {
    markdown: String.raw`
Los buenos científicos no se saben todas las respuestas. Lo que los distingue es **cómo atacan las preguntas**: descomponen el problema hasta lo básico y obtienen respuestas aproximadas muy rápido. Son dos hábitos que puedes entrenar.

## Razonar desde primeros principios

Aristóteles llamaba *primeros principios* a las proposiciones básicas de las que se deducen las demás. Razonar así consiste en:

1. **Identificar los supuestos** del problema («siempre se ha hecho así», «es caro»…).
2. **Descomponerlo en verdades básicas comprobables:** leyes físicas, definiciones, datos verificados.
3. **Reconstruir la solución** desde esas piezas, sin copiar automáticamente lo habitual.

> **Concepto clave:** razonar desde primeros principios es descomponer un problema en sus verdades más básicas y reconstruir la solución desde ahí, en lugar de razonar solo por analogía con lo que ya se hace.

**Ejemplo:** ¿cuánto cuesta recorrer 100 km en un coche eléctrico? En lugar de buscar opiniones, descompón: un coche eléctrico típico consume del orden de **15-20 kWh cada 100 km**; si el kWh cuesta 0,20 €, el coste es de **3-4 €**. Con dos datos verificables tienes una respuesta defendible y sabes exactamente de qué depende.

## Estimaciones de Fermi

**Enrico Fermi**, premio Nobel de Física en 1938, era célebre por sus estimaciones rápidas. Se cuenta que, en la primera prueba nuclear (1945), dejó caer trocitos de papel al llegar la onda expansiva y, por la distancia que recorrieron, estimó una energía de unos 10 kilotones; las mediciones posteriores dieron alrededor de 20. **Acertó el orden de magnitud** con papel y una cuenta mental.

### Ejemplo resuelto: ¿cuántos afinadores de piano hay en Chicago?

| Paso | Supuesto | Resultado |
|---|---|---|
| 1 | Chicago tiene unos 3 millones de habitantes, ≈ 2,5 por hogar | ≈ 1,2 millones de hogares |
| 2 | 1 de cada 20 hogares tiene piano | ≈ 60 000 pianos |
| 3 | Cada piano se afina una vez al año | ≈ 60 000 afinaciones al año |
| 4 | Un afinador hace 4 al día, 250 días al año | ≈ 1 000 afinaciones por afinador |
| 5 | 60 000 ÷ 1 000 | **≈ 60 afinadores** |

La cifra exacta no importa: lo valioso es que ahora sabes que son **decenas, no miles**, y qué supuesto revisar si necesitas más precisión.

¿Por qué funciona? Porque al multiplicar varios factores, **unos errores al alza y otros a la baja tienden a compensarse**. Y si solo tienes una cota inferior $a$ y una superior $b$, una buena estimación es su media geométrica:

$$\hat{x} \approx \sqrt{a \cdot b}$$

Si algo está entre 100 y 10 000, tu mejor apuesta es ≈ 1 000.

## Órdenes de magnitud

Un **orden de magnitud** es la potencia de 10 más cercana a una cantidad. Acertarlo suele bastar para decidir: ¿es viable el proyecto?, ¿tiene sentido este resultado? Para estudiantes de ciencias e ingeniería es un control de calidad imprescindible: **antes de dar por bueno un resultado, comprueba sus unidades y su orden de magnitud**.

## Errores frecuentes

- **Falsa precisión:** dar «63,7 afinadores» cuando tus supuestos solo justifican «unas decenas».
- **Supuestos ocultos:** escríbelos siempre; así sabes qué revisar.
- **No contrastar:** compara tu estimación con algún dato conocido cuando sea posible.
- **Confundir primeros principios con ignorar lo que se sabe:** se trata de verificar supuestos, no de reinventarlo todo.

## Resumen

- Primeros principios: descomponer en verdades básicas y reconstruir.
- Estimación de Fermi: factores estimables multiplicados → orden de magnitud.
- Los errores tienden a compensarse; la media geométrica combina cotas.
- Revisa unidades y órdenes de magnitud antes de aceptar un resultado.

## Para pensar

¿Cuántos litros de agua bebes en un año? Estímalo en menos de un minuto y escribe cada supuesto.
`,
    quiz: {
      questions: [
        q(
          '¿Qué caracteriza el razonamiento desde primeros principios?',
          'Primeros principios',
          'understand',
          [
            [
              'Descomponer el problema en verdades básicas comprobables y reconstruir la solución desde ellas',
              true,
              'Correcto: es la esencia del método.',
            ],
            [
              'Copiar la solución que funcionó en un caso parecido',
              false,
              'Eso es razonar por analogía, que puede arrastrar supuestos erróneos.',
            ],
            [
              'Confiar en la opinión de los expertos sin revisarla',
              false,
              'Los primeros principios implican verificar los supuestos.',
            ],
            [
              'Elegir la primera idea que se te ocurra',
              false,
              'El método exige analizar y descomponer, no improvisar.',
            ],
          ],
        ),
        q(
          'Quieres estimar cuántos litros de agua bebe una persona en un año. ¿Qué cálculo sigue el método de Fermi?',
          'Estimación de Fermi',
          'apply',
          [
            [
              'Unos 2 litros al día × 365 días ≈ 700 litros: del orden de cientos de litros',
              true,
              'Correcto: supuestos explícitos y orden de magnitud razonable.',
            ],
            [
              'Buscar la cifra exacta en internet antes de pensar nada',
              false,
              'Fermi consiste en razonar una estimación propia con supuestos explícitos.',
            ],
            [
              'Responder «imposible de saber» sin datos oficiales',
              false,
              'Siempre se puede estimar un orden de magnitud.',
            ],
            [
              'Multiplicar la población mundial por el volumen de los océanos',
              false,
              'Esos factores no tienen relación con lo que se pregunta.',
            ],
          ],
        ),
        q(
          '¿Por qué las estimaciones de Fermi suelen acertar el orden de magnitud aunque cada supuesto sea impreciso?',
          'Estimación de Fermi',
          'understand',
          [
            [
              'Porque los errores de varios factores tienden a compensarse en parte',
              true,
              'Correcto: unos supuestos pecan por exceso y otros por defecto.',
            ],
            [
              'Porque Fermi conocía todos los datos de antemano',
              false,
              'El método funciona precisamente sin conocer los datos exactos.',
            ],
            ['Porque solo se usan números exactos', false, 'Se usan aproximaciones razonables.'],
            [
              'Porque siempre se redondea hacia arriba',
              false,
              'Redondear siempre al alza acumularía error en lugar de compensarlo.',
            ],
          ],
        ),
        q(
          'Un estudiante de ingeniería calcula que una viga de un puente peatonal soporta 3 × 10¹² newtons. ¿Qué debería hacer primero?',
          'Órdenes de magnitud',
          'analyze',
          [
            [
              'Comprobar unidades y orden de magnitud: la cifra es absurda para un puente peatonal y apunta a un error',
              true,
              'Correcto: es un control de cordura imprescindible.',
            ],
            [
              'Entregar el resultado: si sale de la fórmula, es correcto',
              false,
              'Las fórmulas mal aplicadas dan resultados absurdos.',
            ],
            [
              'Añadir más decimales para que sea más preciso',
              false,
              'Más decimales no corrigen un error de orden de magnitud.',
            ],
            ['Repetir exactamente el mismo cálculo', false, 'Repetirlo igual reproduce el mismo error.'],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Qué es razonar desde primeros principios?',
        'Descomponer un problema en sus verdades básicas (leyes, definiciones, datos verificados) y reconstruir la solución desde ahí.',
        'Primeros principios',
      ),
      card(
        '¿Qué es una estimación de Fermi?',
        'Una aproximación rápida que divide una pregunta difícil en factores estimables y los multiplica para obtener el orden de magnitud.',
        'Estimación de Fermi',
      ),
      card(
        '¿Cómo combinar una cota inferior y una superior en una estimación?',
        'Con la media geométrica: √(inferior × superior). Entre 100 y 10 000, ≈ 1 000.',
        'Estimación de Fermi',
      ),
      card(
        '¿Qué es un orden de magnitud?',
        'La potencia de 10 más cercana a una cantidad; acertarlo suele bastar para decidir si algo es viable o razonable.',
        'Órdenes de magnitud',
      ),
      card(
        '¿Qué es la falsa precisión?',
        'Dar más decimales de los que justifican tus datos y supuestos (por ejemplo, «63,7 afinadores»).',
        'Órdenes de magnitud',
      ),
    ],
  },

  '3.2': {
    markdown: String.raw`
Las mentes más brillantes no solo saben cosas: **saben cuánto las saben**. Distinguen lo que es casi seguro de lo que es una corazonada, y ajustan su confianza cuando llega nueva evidencia. Esa habilidad tiene nombre y se puede medir.

## ¿Qué es la calibración?

Estás **bien calibrado** si, de todas las cosas que afirmas con un 70 % de confianza, aciertas aproximadamente el 70 %; y de las que afirmas al 90 %, el 90 %. La mayoría de las personas peca de **sobreconfianza**: en muchos experimentos, los intervalos que la gente da «con un 90 % de seguridad» contienen el valor real bastante menos del 90 % de las veces.

> **Concepto clave:** estar bien calibrado significa que tu nivel de confianza coincide con tu frecuencia real de aciertos.

## Lo que aprendimos de los superpronosticadores

El psicólogo **Philip Tetlock** siguió durante unas dos décadas miles de predicciones de cientos de expertos (*Expert Political Judgment*, 2005): en promedio, su precisión fue modesta, apenas mejor que reglas sencillas. Después, en el **Good Judgment Project** (2011-2015), un torneo de predicción financiado por la comunidad de inteligencia estadounidense, identificó a un grupo de **superpronosticadores** que acertaban de forma consistente. Sus hábitos:

- Piensan en **probabilidades matizadas** (65 % no es lo mismo que 70 %).
- **Descomponen** las preguntas difíciles en partes estimables, al estilo Fermi.
- Empiezan por la **tasa base** y luego ajustan con los detalles del caso.
- **Actualizan** su opinión con cada nueva evidencia, sin aferrarse a la primera.

## Cómo medir tu calibración: la puntuación de Brier

$$\text{Brier} = \frac{1}{N}\sum_{i=1}^{N}(p_i - o_i)^2$$

donde $p_i$ es la probabilidad que asignaste y $o_i$ vale 1 si acertaste y 0 si no. **0 es perfecto**; decir siempre «50 %» da 0,25.

| Lo que dijiste | Resultado | Penalización |
|---|---|---|
| 90 % y acertaste | 1 | (0,9 − 1)² = 0,01 |
| 90 % y fallaste | 0 | (0,9 − 0)² = 0,81 |
| 60 % y fallaste | 0 | (0,6 − 0)² = 0,36 |

Fíjate: **equivocarse con mucha seguridad sale carísimo**. La puntuación premia la honestidad sobre lo que sabes.

## Tasas base

Antes de juzgar un caso concreto, pregúntate: **¿con qué frecuencia ocurre esto en general?** Si una amiga calcula un 80 % de probabilidades de éxito para su nuevo negocio, el punto de partida razonable es la tasa base: en Estados Unidos, aproximadamente la mitad de los nuevos establecimientos sigue abierta a los cinco años. Después se ajusta según lo que haga especial ese negocio. Ignorar la tasa base es uno de los sesgos más documentados por Kahneman y Tversky.

## Cómo lo entrena Omnilearn

En los quizzes eliges tu confianza al responder (**Adivino** ≈ 33 %, **Creo que sí** ≈ 70 %, **Seguro** ≈ 95 %) y el panel principal te muestra tu calibración. Además aprovechas el **efecto de hipercorrección** (Butterfield y Metcalfe, 2001): los errores que cometes estando **muy seguro**, una vez corregidos, se recuerdan especialmente bien.

## Errores frecuentes

- **Pensar en blanco y negro:** «seguro» o «ni idea». Usa grados intermedios.
- **Ignorar la tasa base** y dejarse llevar por la historia del caso concreto.
- **No actualizar:** mantener la primera estimación aunque cambie la evidencia.
- **Confundir calibración con acertar siempre:** se trata de saber cuánto sabes.

## Resumen

- Calibración: tu confianza debe coincidir con tu frecuencia de aciertos.
- Los superpronosticadores piensan en probabilidades, parten de tasas base y actualizan.
- La puntuación de Brier castiga sobre todo los errores muy seguros.
- Registrar tu confianza al responder es un buen entrenamiento metacognitivo.

## Para pensar

¿En qué tema crees que eres más sobreconfiado? ¿Cómo podrías comprobarlo con datos?
`,
    quiz: {
      questions: [
        q('¿Qué significa estar bien calibrado?', 'Calibración', 'understand', [
          [
            'Que de lo que afirmas con un 70 % de confianza aciertas aproximadamente el 70 %',
            true,
            'Correcto: la confianza coincide con la frecuencia de aciertos.',
          ],
          [
            'Acertar siempre',
            false,
            'Se puede estar bien calibrado y fallar a menudo, si tu confianza era baja.',
          ],
          ['Estar siempre muy seguro de tus respuestas', false, 'Eso suele ser sobreconfianza.'],
          [
            'Responder siempre «50 %» para no equivocarte',
            false,
            'Eso no aporta información y no refleja lo que sabes.',
          ],
        ]),
        q(
          'Dices estar al 90 % seguro de una respuesta y fallas. ¿Cuál es tu puntuación de Brier en esa pregunta?',
          'Puntuación de Brier',
          'apply',
          [
            [
              '0,81, porque (0,9 − 0)² = 0,81',
              true,
              'Correcto: el error con mucha confianza se penaliza mucho.',
            ],
            ['0,01', false, 'Esa sería la penalización si hubieras acertado: (0,9 − 1)².'],
            ['0,10', false, 'La fórmula eleva al cuadrado la diferencia: (0,9 − 0)² = 0,81.'],
            ['0,90', false, 'Hay que elevar al cuadrado la diferencia entre probabilidad y resultado.'],
          ],
        ),
        q(
          'Una amiga calcula un 80 % de probabilidad de éxito para su nuevo negocio. ¿Qué haría primero un buen pronosticador?',
          'Tasa base',
          'apply',
          [
            [
              'Partir de la tasa base (cuántos negocios similares sobreviven) y ajustar con los detalles del caso',
              true,
              'Correcto: primero la visión general, luego los matices.',
            ],
            [
              'Aceptar el 80 % porque ella conoce su negocio',
              false,
              'Conocer el caso no evita la sobreconfianza ni sustituye la tasa base.',
            ],
            ['Redondear al 100 % para motivarla', false, 'Eso empeora la calibración.'],
            [
              'Ignorar los números y fiarse del instinto',
              false,
              'Los superpronosticadores cuantifican y contrastan con datos.',
            ],
          ],
        ),
        q(
          'Según el efecto de hipercorrección, ¿qué errores se corrigen mejor tras recibir la respuesta correcta?',
          'Calibración',
          'analyze',
          [
            [
              'Los que cometiste estando muy seguro',
              true,
              'Correcto: la sorpresa de equivocarte con confianza refuerza la corrección.',
            ],
            ['Los que respondiste al azar', false, 'Los errores de baja confianza se corrigen peor.'],
            ['Todos por igual', false, 'La confianza previa influye en cuánto se recuerda la corrección.'],
            [
              'Ninguno: corregir errores no ayuda a recordar',
              false,
              'La retroalimentación tras un error es muy eficaz.',
            ],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Qué es la calibración?',
        'Que tu confianza coincida con tu tasa real de aciertos: lo que afirmas al 70 % debería salir bien ≈70 % de las veces.',
        'Calibración',
      ),
      card(
        'Fórmula de la puntuación de Brier',
        'Media de (probabilidad − resultado)²; 0 es perfecto y 0,25 equivale a decir siempre «50 %».',
        'Puntuación de Brier',
      ),
      card(
        '¿Qué es la tasa base?',
        'La frecuencia con la que ocurre algo en general; un buen punto de partida antes de ajustar por los detalles del caso.',
        'Tasa base',
      ),
      card(
        'Hábitos de los superpronosticadores (Tetlock)',
        'Piensan en probabilidades matizadas, descomponen los problemas, parten de tasas base y actualizan con nueva evidencia.',
        'Calibración',
      ),
      card(
        '¿Qué es el efecto de hipercorrección?',
        'Los errores cometidos con mucha confianza se corrigen y recuerdan especialmente bien tras recibir la respuesta correcta.',
        'Calibración',
      ),
    ],
  },

  '3.3': {
    markdown: String.raw`
Muchas aplicaciones prometen «aumentar tu CI» con juegos de unos minutos al día. Es una promesa atractiva, así que conviene mirarla con lupa: ¿qué dice la evidencia? ¿Y qué hacen realmente las personas brillantes?

## Qué mide el CI y qué se sabe

Los tests de CI miden capacidades cognitivas generales y predicen razonablemente bien el rendimiento académico y laboral. Su resultado depende en parte de la genética, pero **no es inmutable**: durante el siglo XX, las puntuaciones medias subieron unos **3 puntos por década** en muchos países (el **efecto Flynn**), demasiado rápido para explicarse por la genética. El entorno —educación, salud, nutrición— importa.

## El entrenamiento cerebral: transferencia cercana y lejana

Cuando practicas un juego de memoria, mejoras en ese juego y en tareas muy parecidas (**transferencia cercana**). La gran pregunta es si eso mejora capacidades generales distintas, como el razonamiento (**transferencia lejana**).

> **Concepto clave:** la *transferencia lejana* (que entrenar una tarea mejore capacidades generales distintas) tiene poco respaldo científico: lo que practicas es, sobre todo, lo que mejoras.

Los metaanálisis son bastante consistentes:

- **Melby-Lervåg y Hulme (2013)**: el entrenamiento de memoria de trabajo produce mejoras en tareas similares, pero no mejoras convincentes y duraderas en capacidades generales.
- **Simons y colaboradores (2016)**, en una revisión exhaustiva: hay poca evidencia de que los programas comerciales de entrenamiento cerebral mejoren el rendimiento cotidiano.
- **Sala y Gobet (2017)**: aprender ajedrez o música tampoco muestra transferencia lejana sólida al rendimiento académico general.

En 2016, la empresa de Lumosity aceptó pagar 2 millones de dólares para cerrar una demanda de la Comisión Federal de Comercio de EE. UU. por publicidad engañosa sobre estos beneficios.

## Lo que sí tiene respaldo

| Promesa popular | Lo que dice la evidencia |
|---|---|
| Juegos para subir el CI | Mejoran el juego; poca transferencia lejana |
| Música clásica para ser más listo | El «efecto Mozart» no se sostiene como mejora duradera |
| Más años de educación | ≈ 1-5 puntos de CI por año adicional (Ritchie y Tucker-Drob, 2018) |
| Ejercicio aeróbico regular | Beneficios en salud cerebral y algunas funciones cognitivas |
| Dormir bien | Imprescindible para consolidar lo aprendido |

El dato más llamativo es el de la **educación**: un metaanálisis de **Ritchie y Tucker-Drob (2018)** estimó que cada año adicional de educación aumenta el CI en aproximadamente **1 a 5 puntos**. Aprender cosas de verdad, con esfuerzo, es lo más parecido a «entrenar la inteligencia» que conocemos.

## Lo que hacen las personas brillantes

1. **Construyen conocimiento organizado.** La pericia es una red de patrones (*chunks*) en la memoria a largo plazo.
2. **Practican deliberadamente:** al límite de su capacidad, con objetivos concretos y retroalimentación (**Ericsson y colaboradores, 1993**). Un matiz importante: un metaanálisis de **Macnamara y colaboradores (2014)** concluyó que la práctica deliberada explica una parte relevante pero no toda la diferencia de rendimiento (en promedio, en torno a un 12 %, con grandes variaciones entre campos).
3. **Piensan sobre su propio pensamiento:** se ponen a prueba, se explican las cosas y calibran su confianza.
4. **Acumulan modelos mentales de varias disciplinas** y los conectan para resolver problemas nuevos.
5. **Cuidan la base:** sueño, ejercicio y curiosidad sostenida.

${'```'}mermaid
flowchart TD
  A["Conocimiento organizado"] --> E["Mejor rendimiento intelectual en lo que practicas"]
  B["Práctica deliberada con retroalimentación"] --> E
  C["Metacognición: ponerse a prueba y calibrar"] --> E
  D["Sueño, ejercicio y curiosidad"] --> E
${'```'}

## La conclusión honesta

Omnilearn no puede prometerte puntos de CI, y desconfía de quien lo haga. Lo que sí puede hacer es entrenar lo que hace eficaces a los expertos: **conocimiento duradero** (recuperación y espaciado), **comprensión profunda** (Feynman, autoexplicación), **resolución de problemas** (primeros principios, Fermi) y **metacognición** (calibración). Es el camino lento, pero es el que funciona.

## Errores frecuentes

- **Buscar atajos** en lugar de practicar lo que quieres mejorar.
- **Creer que la inteligencia es completamente fija** (o completamente maleable): la evidencia está en medio.
- **Sacrificar sueño** para estudiar más horas.

## Resumen

- El CI predice resultados, pero el entorno y la educación influyen.
- El entrenamiento cerebral mejora lo entrenado; la transferencia lejana es escasa.
- La educación, el conocimiento organizado y la práctica deliberada sí tienen respaldo.
- Los mejores pensadores combinan conocimiento, práctica, metacognición y hábitos saludables.

## Para pensar

Si pudieras dedicar 30 minutos al día durante un año a volverte «más listo» en algo concreto, ¿en qué los invertirías y cómo medirías tu progreso?
`,
    quiz: {
      questions: [
        q(
          '¿Qué concluyen los metaanálisis sobre los juegos de «entrenamiento cerebral»?',
          'Transferencia lejana',
          'understand',
          [
            [
              'Mejoran sobre todo las tareas entrenadas y otras muy parecidas, con poca evidencia de mejora de la inteligencia general',
              true,
              'Correcto: hay transferencia cercana, pero poca transferencia lejana.',
            ],
            [
              'Aumentan el CI unos 20 puntos en un mes',
              false,
              'No hay evidencia de efectos de esa magnitud.',
            ],
            [
              'No mejoran ni siquiera la tarea entrenada',
              false,
              'Sí mejoran la tarea entrenada y tareas muy similares.',
            ],
            ['Solo funcionan en niños menores de 5 años', false, 'Los estudios no respaldan esa afirmación.'],
          ],
        ),
        q(
          'Según el metaanálisis de Ritchie y Tucker-Drob (2018), ¿qué efecto tiene un año adicional de educación sobre el CI?',
          'Educación y CI',
          'remember',
          [
            [
              'Un aumento de aproximadamente 1 a 5 puntos',
              true,
              'Correcto: es uno de los efectos ambientales mejor documentados.',
            ],
            [
              'Ninguno: el CI es fijo desde el nacimiento',
              false,
              'El efecto Flynn y este metaanálisis muestran que el entorno influye.',
            ],
            ['Un aumento de unos 30 puntos', false, 'La estimación es mucho más modesta.'],
            ['Una disminución, por el cansancio acumulado', false, 'El efecto encontrado es positivo.'],
          ],
        ),
        q('¿Qué es la transferencia lejana?', 'Transferencia lejana', 'understand', [
          [
            'Que practicar una tarea mejore capacidades distintas y generales, como el razonamiento',
            true,
            'Correcto: es lo que prometen muchas apps y lo que la evidencia apenas respalda.',
          ],
          [
            'Aprender algo a distancia por internet',
            false,
            'No tiene que ver con la modalidad de enseñanza.',
          ],
          ['Recordar algo mucho tiempo después', false, 'Eso es retención a largo plazo.'],
          [
            'Aplicar una fórmula a un problema idéntico al del ejemplo',
            false,
            'Eso sería, como mucho, transferencia muy cercana.',
          ],
        ]),
        q(
          'Quieres ser mejor resolviendo problemas de ingeniería. Según la evidencia, ¿qué plan es más prometedor?',
          'Práctica deliberada',
          'analyze',
          [
            [
              'Practicar deliberadamente problemas de ingeniería variados con retroalimentación, construir conocimiento sólido del área y cuidar el sueño',
              true,
              'Correcto: practicar lo que quieres mejorar, con retroalimentación, es lo que funciona.',
            ],
            [
              'Jugar 30 minutos diarios a una app genérica de memoria',
              false,
              'La transferencia lejana desde esos juegos es escasa.',
            ],
            [
              'Escuchar música clásica mientras estudias para «activar» el cerebro',
              false,
              'El llamado efecto Mozart no se sostiene como mejora duradera.',
            ],
            [
              'Esperar a tener más inteligencia innata antes de practicar',
              false,
              'La práctica y el conocimiento son precisamente lo que mejora el rendimiento.',
            ],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Qué es la transferencia lejana?',
        'Que entrenar una tarea mejore capacidades generales distintas; los metaanálisis encuentran poca evidencia de ello en el entrenamiento cerebral.',
        'Transferencia lejana',
      ),
      card(
        'Educación y CI (Ritchie y Tucker-Drob, 2018)',
        'Cada año adicional de educación se asocia a un aumento de ≈1-5 puntos de CI.',
        'Educación y CI',
      ),
      card(
        '¿Qué es el efecto Flynn?',
        'El aumento de las puntuaciones medias de CI (≈3 puntos por década) observado durante el siglo XX en muchos países; muestra la influencia del entorno.',
        'Educación y CI',
      ),
      card(
        '¿Qué es la práctica deliberada?',
        'Práctica concentrada en el límite de tu habilidad, con objetivos concretos y retroalimentación inmediata (Ericsson et al., 1993).',
        'Práctica deliberada',
      ),
      card(
        '¿Cuánto explica la práctica deliberada según Macnamara et al. (2014)?',
        'Una parte relevante pero no toda la diferencia de rendimiento (≈12 % en promedio), con grandes variaciones entre campos.',
        'Práctica deliberada',
      ),
    ],
  },
};
