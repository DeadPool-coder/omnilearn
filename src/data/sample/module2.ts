import { card, q, type SampleLesson } from './helpers';

export const MODULE_2: Record<string, SampleLesson> = {
  '2.1': {
    markdown: String.raw`
**Richard Feynman**, premio Nobel de Física en 1965, era famoso por explicar ideas complejas con palabras sencillas. Su estilo inspiró lo que hoy se conoce como **técnica Feynman**: un método para comprobar si de verdad entiendes algo. (Feynman no la formuló con ese nombre; es una síntesis popular de su forma de enseñar y aprender).

## La técnica en cuatro pasos

1. **Elige un concepto** y escribe su nombre arriba de una hoja.
2. **Explícalo por escrito como si se lo contaras a alguien sin conocimientos previos.** Nada de jerga: si usas un término técnico, explícalo.
3. **Detecta dónde te atascas.** Cuando no sabes cómo seguir, o te refugias en una palabra técnica, has encontrado una laguna. Vuelve a la fuente y estudia exactamente esa parte.
4. **Simplifica y usa analogías.** Reescribe la explicación más clara y corta. Repite hasta que fluya.

> **Concepto clave:** si no puedes explicar algo con palabras sencillas, todavía no lo entiendes del todo. El punto donde te atascas señala la laguna exacta que debes estudiar.

## Ejemplo: explicar la inflación

**Versión con jerga:** «La inflación es el incremento sostenido del nivel general de precios medido por un índice de precios al consumo».

**Versión Feynman:** «Si este año un bocadillo cuesta 4 € y el año que viene cuesta 4,20 €, con el mismo billete compras menos cosas. Cuando eso pasa con casi todo a la vez, decimos que hay inflación: tu dinero "encoge"».

Al escribir la segunda versión surge una pregunta: *¿por qué suben los precios de casi todo a la vez?* Si no sabes responderla, ya sabes qué estudiar a continuación.

## La autoexplicación

En 1989, **Michelene Chi** y su equipo observaron a estudiantes de física que aprendían con ejemplos resueltos. Los que más aprendían no leían más veces: **se explicaban a sí mismos el porqué de cada paso** («esto se hace así porque…»). Estudios posteriores (Chi y colaboradores, 1994) mostraron que pedir a los estudiantes que se autoexplicaran mejoraba su comprensión.

## La ilusión de profundidad explicativa

**Rozenblit y Keil (2002)** pidieron a personas que valoraran cuánto entendían objetos cotidianos, como una cremallera o una cisterna. Después les pidieron explicar **paso a paso** cómo funcionaban… y sus valoraciones cayeron. Todos creemos entender más de lo que entendemos, **hasta que intentamos explicarlo**. Por eso explicar es una prueba tan potente.

## En Omnilearn: el Desafío Feynman

Al final de cada lección puedes escribir tu explicación y recibir una evaluación sobre cuatro criterios: **exactitud**, **cobertura** de los conceptos clave, **claridad** y uso de **ejemplos**. Además te señala lagunas, ideas imprecisas y jerga sin explicar.

## Errores frecuentes

- **Recitar la definición del libro.** Repetir no es explicar: usa tus propias palabras.
- **Explicar solo «de cabeza».** Mentalmente es fácil saltarse pasos; escribe o habla en voz alta.
- **No volver a la fuente.** Detectar la laguna sirve de poco si no la rellenas.
- **Abusar de la jerga.** Los términos técnicos pueden esconder que no entiendes la idea.

## Resumen

- Explicar con sencillez es la mejor prueba de comprensión.
- Los atascos señalan lagunas concretas: vuelve a la fuente.
- Autoexplicarte el porqué de cada paso mejora el aprendizaje.
- Todos sobreestimamos lo que entendemos hasta que intentamos explicarlo.

## Para pensar

Elige algo que «sabes» desde hace años (por qué hay estaciones, cómo funciona una vacuna…). ¿Podrías explicarlo paso a paso sin mirar nada?
`,
    quiz: {
      questions: [
        q(
          'Según la técnica Feynman, ¿qué señala el punto en el que te atascas al explicar?',
          'Técnica Feynman',
          'understand',
          [
            [
              'Una laguna concreta en tu comprensión que debes volver a estudiar',
              true,
              'Correcto: el atasco indica exactamente qué te falta entender.',
            ],
            [
              'Que el tema es demasiado difícil para ti',
              false,
              'El atasco es información útil, no un veredicto sobre tu capacidad.',
            ],
            [
              'Que debes usar términos más técnicos',
              false,
              'La jerga suele esconder la laguna en lugar de resolverla.',
            ],
            ['Que ya puedes pasar a otro tema', false, 'Si te atascas, aún no lo dominas.'],
          ],
        ),
        q(
          '¿Cuál de estas explicaciones de «inflación» sigue mejor la técnica Feynman?',
          'Técnica Feynman',
          'apply',
          [
            [
              '«Si cada año los precios suben un 5 %, con el mismo billete compras menos cosas: tu dinero encoge»',
              true,
              'Correcto: lenguaje sencillo y un ejemplo concreto.',
            ],
            [
              '«Es el incremento sostenido del nivel general de precios medido por un índice»',
              false,
              'Es correcta, pero está llena de jerga y no muestra comprensión propia.',
            ],
            ['«Es cuando la economía va mal»', false, 'Es vaga e imprecisa: no explica el fenómeno.'],
            [
              '«Es un concepto macroeconómico complejo que estudian los bancos centrales»',
              false,
              'Describe quién lo estudia, no qué es.',
            ],
          ],
        ),
        q(
          '¿Qué mostraron Rozenblit y Keil (2002) sobre la ilusión de profundidad explicativa?',
          'Ilusión de profundidad explicativa',
          'understand',
          [
            [
              'Que creemos entender cómo funcionan las cosas mejor de lo que las entendemos, hasta que intentamos explicarlas paso a paso',
              true,
              'Correcto: al explicar, las valoraciones de comprensión cayeron.',
            ],
            [
              'Que explicar en voz alta reduce la comprensión',
              false,
              'Explicar revela lo que no entendemos; no lo reduce.',
            ],
            [
              'Que solo los expertos sufren esta ilusión',
              false,
              'Es un sesgo general que afecta a casi todo el mundo.',
            ],
            [
              'Que las personas suelen subestimar lo que saben',
              false,
              'Ocurre lo contrario: sobreestimamos nuestra comprensión.',
            ],
          ],
        ),
        q(
          'En el estudio de Chi y colaboradores (1989), ¿qué distinguía a los estudiantes de física que más aprendían de los ejemplos resueltos?',
          'Autoexplicación',
          'analyze',
          [
            [
              'Se explicaban a sí mismos el porqué de cada paso',
              true,
              'Correcto: la autoexplicación marcaba la diferencia.',
            ],
            ['Leían los ejemplos más veces', false, 'Releer no era lo que distinguía a los mejores.'],
            [
              'Memorizaban las fórmulas antes de empezar',
              false,
              'La clave era comprender los pasos, no memorizar fórmulas.',
            ],
            [
              'Estudiaban siempre en grupo',
              false,
              'El estudio se centró en el procesamiento individual de los ejemplos.',
            ],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        'Pasos de la técnica Feynman',
        '1) Elegir un concepto; 2) explicarlo con palabras sencillas; 3) detectar dónde te atascas y volver a la fuente; 4) simplificar con analogías y repetir.',
        'Técnica Feynman',
      ),
      card(
        '¿Qué es la autoexplicación?',
        'Explicarte a ti mismo por qué funciona cada paso o idea mientras estudias; mejora la comprensión (Chi et al., 1989).',
        'Autoexplicación',
      ),
      card(
        '¿Qué es la ilusión de profundidad explicativa?',
        'Creer que entendemos cómo funciona algo mejor de lo que lo entendemos, hasta que intentamos explicarlo (Rozenblit y Keil, 2002).',
        'Ilusión de profundidad explicativa',
      ),
      card(
        '¿Por qué la jerga puede ser una trampa al estudiar?',
        'Los términos técnicos dan sensación de dominio y ocultan lagunas; explicar sin jerga las revela.',
        'Técnica Feynman',
      ),
      card(
        '¿Por qué explicar por escrito o en voz alta y no solo mentalmente?',
        'Obliga a completar cada paso; en la mente es fácil saltarse huecos sin notarlo.',
        'Autoexplicación',
      ),
    ],
  },

  '2.2': {
    markdown: String.raw`
En la mayoría de los libros, los ejercicios del capítulo 5 se resuelven con el método del capítulo 5. Antes de leer el enunciado ya sabes qué hacer. En un examen, nadie te dice qué método toca. Esa diferencia explica por qué practicar «por capítulos» engaña.

## Práctica en bloque frente a práctica intercalada

- **En bloque:** todos los problemas de un tipo y luego todos los del siguiente → A A A A · B B B B · C C C C
- **Intercalada:** los tipos se mezclan en un orden imprevisible → A C B · B A C · C B A

> **Concepto clave:** la *práctica intercalada* mezcla distintos tipos de problemas en una misma sesión, de modo que en cada uno tienes que decidir qué estrategia usar.

## La evidencia

**Rohrer y Taylor (2007)** enseñaron a estudiantes a calcular volúmenes de distintos sólidos. Durante la práctica, quienes trabajaron en bloque acertaban más. Pero en la prueba **una semana después**, quienes habían intercalado acertaron alrededor del **63 %**, frente a cerca del **20 %** del grupo en bloque.

**Kornell y Bjork (2008)** pidieron a personas aprender el estilo de distintos pintores viendo cuadros. Intercalar los cuadros de varios artistas funcionó mejor para reconocer obras nuevas… y, aun así, **la mayoría creía que la práctica en bloque le había ido mejor**. La sensación de aprender no siempre coincide con el aprendizaje real.

## Por qué funciona

1. **Discriminación:** te obliga a identificar qué tipo de problema tienes delante y elegir el método. Eso es justo lo que exige un examen o un problema real.
2. **Contraste:** al ver conceptos parecidos uno junto a otro, notas mejor sus diferencias.
3. **Espaciado incluido:** al mezclar, cada tipo de problema reaparece tras un intervalo, así que también aprovechas el efecto de espaciado.

${'```'}mermaid
flowchart LR
  A["Primer contacto con un método"] --> B["Práctica en bloque breve"]
  B --> C["Práctica intercalada con otros métodos"]
  C --> D["Problemas mixtos tipo examen"]
${'```'}

## Cuándo usar cada una

| Situación | Recomendación |
|---|---|
| Acabas de conocer un método nuevo | Unos pocos ejercicios en bloque para entenderlo |
| Ya entiendes varios métodos | Mezcla los tipos de problema |
| Conceptos que se confunden entre sí | Intercálalos para contrastarlos |
| Preparación de examen | Sesiones mixtas e imprevisibles |

En Omnilearn, el **Repaso** mezcla tarjetas de todas tus rutas: es intercalado por diseño.

## Errores frecuentes

- **Abandonar porque «se siente peor».** Es una dificultad deseable: rindes menos durante la práctica y más después.
- **Intercalar antes de entender lo básico.** Primero comprende el método; después mézclalo.
- **Mezclar cosas sin relación.** El intercalado ayuda sobre todo con problemas o conceptos que se pueden confundir.

## Resumen

- En bloque: un tipo cada vez. Intercalada: tipos mezclados.
- Intercalar mejora la retención y la elección de estrategias, aunque se sienta más difícil.
- Empieza con un poco de práctica en bloque y pasa pronto a mezclar.
- Juzgar el aprendizaje por la sensación durante la práctica es engañoso.

## Para pensar

En tu materia más difícil, ¿qué tipos de problemas sueles confundir entre sí? ¿Cómo podrías mezclarlos en tu próxima sesión?
`,
    quiz: {
      questions: [
        q(
          '¿Qué diferencia la práctica intercalada de la práctica en bloque?',
          'Práctica intercalada',
          'understand',
          [
            [
              'La intercalada mezcla tipos de problemas; en bloque se practica un tipo cada vez',
              true,
              'Correcto: esa es la diferencia esencial.',
            ],
            [
              'La intercalada incluye descansos y la de bloque no',
              false,
              'Los descansos no definen el intercalado.',
            ],
            [
              'La intercalada se hace en grupo y la de bloque, a solas',
              false,
              'No tiene que ver con estudiar acompañado.',
            ],
            ['No hay diferencia: son sinónimos', false, 'Son estrategias opuestas.'],
          ],
        ),
        q(
          'En el estudio de Rohrer y Taylor (2007), ¿qué ocurrió en la prueba una semana después?',
          'Práctica intercalada',
          'understand',
          [
            [
              'Quienes intercalaron rindieron mucho mejor, aunque durante la práctica parecían ir peor',
              true,
              'Correcto: ≈63 % frente a ≈20 % en la prueba diferida.',
            ],
            [
              'Quienes practicaron en bloque rindieron mejor en todo momento',
              false,
              'Solo rindieron mejor durante la práctica.',
            ],
            ['Ambos grupos rindieron igual', false, 'La diferencia en la prueba fue grande.'],
            [
              'Solo mejoraron quienes descansaron más',
              false,
              'El estudio comparaba el orden de los problemas, no los descansos.',
            ],
          ],
        ),
        q(
          'Estudias física con tres tipos de problemas: cinemática, energía y momento. ¿Qué sesión aplica mejor el intercalado?',
          'Discriminación de problemas',
          'apply',
          [
            [
              'Una hoja con problemas de los tres tipos mezclados en orden imprevisible',
              true,
              'Correcto: tendrás que identificar el tipo de problema en cada caso.',
            ],
            [
              'Veinte problemas de cinemática, luego veinte de energía y luego veinte de momento',
              false,
              'Eso es práctica en bloque.',
            ],
            [
              'Solo problemas de energía, que es lo que más cuesta',
              false,
              'Centrarse en un solo tipo no entrena la discriminación.',
            ],
            ['Releer la teoría de los tres temas', false, 'Releer no es practicar problemas.'],
          ],
        ),
        q(
          'Kornell y Bjork (2008) vieron que la mayoría de los participantes creía que la práctica en bloque le había ido mejor, aunque no era así. ¿Qué lección se extrae?',
          'Práctica en bloque',
          'analyze',
          [
            [
              'La sensación de aprender no es un buen indicador de lo que realmente se aprende',
              true,
              'Correcto: por eso conviene fiarse de la evidencia y medir con pruebas.',
            ],
            [
              'Que hay que fiarse siempre de la intuición al estudiar',
              false,
              'El estudio muestra justo que la intuición falla.',
            ],
            [
              'Que el intercalado solo funciona con arte',
              false,
              'También se ha observado en matemáticas y otras materias.',
            ],
            [
              'Que la práctica en bloque es mejor para el largo plazo',
              false,
              'Ocurrió lo contrario en la prueba.',
            ],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Qué es la práctica intercalada?',
        'Mezclar distintos tipos de problemas o conceptos en una sesión en lugar de practicar uno cada vez.',
        'Práctica intercalada',
      ),
      card(
        '¿Por qué funciona intercalar?',
        'Obliga a discriminar qué estrategia usar y a comparar conceptos parecidos, como en un examen real.',
        'Discriminación de problemas',
      ),
      card(
        'Resultado de Rohrer y Taylor (2007)',
        'A la semana, quienes intercalaron problemas de volúmenes acertaron ≈63 % frente a ≈20 % de quienes practicaron en bloque.',
        'Práctica intercalada',
      ),
      card(
        '¿Cuándo conviene la práctica en bloque?',
        'Al principio, para entender un método nuevo; después conviene intercalar.',
        'Práctica en bloque',
      ),
      card(
        '¿Por qué intercalar se siente peor?',
        'Es más difícil durante la práctica (una dificultad deseable), aunque mejora el rendimiento a largo plazo.',
        'Práctica intercalada',
      ),
    ],
  },

  '2.3': {
    markdown: String.raw`
¿Por qué una experta absorbe información nueva de su campo sin esfuerzo, mientras que un principiante se satura en minutos? La respuesta está en un cuello de botella de la mente y en cómo los expertos lo esquivan.

## La memoria de trabajo es pequeña

La **memoria de trabajo** es el «espacio» donde manipulas información en este momento: seguir un razonamiento, hacer una cuenta mental. Su capacidad es muy limitada. El famoso «7 ± 2» de **Miller (1956)** se ha revisado a la baja: **Cowan (2001)** estimó que manejamos unos **4 elementos nuevos** a la vez. La memoria a largo plazo, en cambio, es enorme.

> **Concepto clave:** la memoria de trabajo solo puede manejar unos pocos elementos nuevos a la vez; aprender bien implica no saturarla.

## Chunking: el truco de los expertos

**Chase y Simon (1973)** mostraron a jugadores de ajedrez posiciones de partidas reales durante unos segundos. Los maestros las reproducían mucho mejor que los principiantes… pero con **piezas colocadas al azar**, su ventaja casi desaparecía. No tenían más memoria: reconocían **patrones con significado** (*chunks*) gracias a miles de horas de práctica.

Un experto ve «un enroque» donde el novato ve seis piezas sueltas. Por eso **la pericia es, en gran parte, una biblioteca de patrones** almacenada en la memoria a largo plazo, que libera la memoria de trabajo para pensar.

## Carga cognitiva y ejemplos resueltos

La **teoría de la carga cognitiva** (John Sweller, desde 1988) propone diseñar el aprendizaje para no desbordar la memoria de trabajo. Uno de sus hallazgos más útiles es el **efecto del ejemplo resuelto**: los principiantes aprenden más **estudiando ejemplos resueltos paso a paso** que intentando resolver desde cero problemas equivalentes, porque buscar a ciegas consume la memoria de trabajo que necesitan para entender la estructura.

La progresión recomendada es retirar la ayuda poco a poco (*desvanecimiento* o *fading*):

${'```'}mermaid
flowchart LR
  A["Ejemplo resuelto completo"] --> B["Ejemplo con pasos omitidos"]
  B --> C["Problema con pistas"]
  C --> D["Problema independiente"]
${'```'}

Pero atención al **efecto de inversión de la pericia** (Kalyuga y colaboradores, 2003): cuando ya dominas un tema, las guías detalladas se vuelven redundantes y **resolver problemas te aporta más** que leer ejemplos.

## Cómo reducir la carga innecesaria

| Fuente de sobrecarga | Qué hacer |
|---|---|
| Notificaciones y multitarea | Bloques de estudio sin interrupciones |
| Texto y diagrama separados | Integrar las explicaciones dentro del diagrama |
| Información redundante | Quitar lo que no aporta a la idea central |
| Demasiados conceptos nuevos de golpe | Dosificar: pocas ideas nuevas por sesión |

Combinar palabras e imágenes bien integradas también ayuda (la *codificación dual*, propuesta por Allan Paivio).

## Errores frecuentes

- **Lanzarse a problemas difíciles sin base.** La frustración no es aprendizaje: empieza por ejemplos resueltos.
- **Copiar ejemplos sin autoexplicarlos.** El ejemplo funciona cuando te preguntas el porqué de cada paso.
- **Estudiar con el móvil al lado.** Cada interrupción ocupa memoria de trabajo.

## Resumen

- La memoria de trabajo maneja unos 4 elementos nuevos; la de largo plazo, muchísimos.
- Los expertos agrupan la información en patrones (*chunks*).
- Principiantes: ejemplos resueltos y desvanecimiento. Expertos: problemas.
- Reduce la carga innecesaria para dejar sitio a lo importante.

## Para pensar

¿En qué tema ya «ves patrones» que un principiante no vería? ¿Cuánto tiempo de práctica te llevó llegar ahí?
`,
    quiz: {
      questions: [
        q(
          'Según Cowan (2001), ¿cuántos elementos nuevos puede manejar aproximadamente la memoria de trabajo?',
          'Memoria de trabajo',
          'remember',
          [
            ['Unos 4', true, 'Correcto: es una estimación más baja que el clásico 7 ± 2.'],
            ['Unos 40', false, 'Es una cifra muy superior a la capacidad estimada.'],
            ['Ilimitados si te concentras', false, 'La concentración no elimina el límite de capacidad.'],
            ['Exactamente 1', false, 'Podemos mantener varios elementos a la vez, aunque pocos.'],
          ],
        ),
        q(
          '¿Qué explicaba la ventaja de los maestros de ajedrez en el estudio de Chase y Simon (1973)?',
          'Chunking',
          'understand',
          [
            [
              'Reconocían patrones con significado gracias a su experiencia; con posiciones aleatorias su ventaja casi desaparecía',
              true,
              'Correcto: su ventaja venía de los chunks, no de una memoria general superior.',
            ],
            [
              'Tenían una memoria general muy superior para cualquier cosa',
              false,
              'Con piezas al azar no recordaban mucho más que los novatos.',
            ],
            [
              'Habían visto exactamente esas posiciones antes',
              false,
              'No las conocían; reconocían patrones típicos.',
            ],
            [
              'Calculaban más rápido todas las jugadas posibles',
              false,
              'El experimento medía memoria de posiciones, no cálculo de jugadas.',
            ],
          ],
        ),
        q(
          'Empiezas a aprender a resolver ecuaciones diferenciales desde cero. ¿Qué secuencia recomienda la teoría de la carga cognitiva?',
          'Efecto del ejemplo resuelto',
          'apply',
          [
            [
              'Estudiar ejemplos resueltos explicándote cada paso, luego ejemplos con pasos omitidos y después problemas por tu cuenta',
              true,
              'Correcto: ejemplos resueltos con desvanecimiento progresivo.',
            ],
            [
              'Empezar por los problemas más difíciles para retarte al máximo',
              false,
              'Sin base, la carga cognitiva impide aprender del intento.',
            ],
            [
              'Memorizar todas las fórmulas sin ver ejemplos',
              false,
              'Memorizar sin comprender no permite resolver problemas nuevos.',
            ],
            [
              'Resolver problemas mientras ves vídeos de otro tema',
              false,
              'La multitarea añade carga innecesaria.',
            ],
          ],
        ),
        q(
          'Una experta en estadística estudia ejemplos resueltos muy detallados de temas que ya domina y aprende poco. ¿Qué lo explica?',
          'Efecto del ejemplo resuelto',
          'analyze',
          [
            [
              'El efecto de inversión de la pericia: para quien ya sabe, la guía detallada es redundante y resolver problemas aporta más',
              true,
              'Correcto: lo que ayuda al novato puede estorbar al experto.',
            ],
            ['Que los ejemplos resueltos nunca funcionan', false, 'Funcionan muy bien con principiantes.'],
            [
              'Que la memoria de trabajo de los expertos es más pequeña',
              false,
              'No es más pequeña; los expertos la usan mejor gracias a sus chunks.',
            ],
            [
              'Que la estadística no se puede aprender con ejemplos',
              false,
              'Se puede, sobre todo al principio.',
            ],
          ],
        ),
      ],
    },
    flashcards: [
      card(
        '¿Cuál es el límite aproximado de la memoria de trabajo?',
        'Unos 4 elementos nuevos a la vez (Cowan, 2001); por eso conviene dosificar la información nueva.',
        'Memoria de trabajo',
      ),
      card(
        '¿Qué es el chunking?',
        'Agrupar información en unidades con significado; los expertos reconocen patrones que el novato ve como piezas sueltas.',
        'Chunking',
      ),
      card(
        '¿Qué es el efecto del ejemplo resuelto?',
        'Los principiantes aprenden más estudiando ejemplos resueltos paso a paso que resolviendo problemas equivalentes desde cero.',
        'Efecto del ejemplo resuelto',
      ),
      card(
        '¿Qué es el efecto de inversión de la pericia?',
        'Lo que ayuda al novato (guías detalladas) puede estorbar al experto, para quien resolver problemas es más útil.',
        'Efecto del ejemplo resuelto',
      ),
      card(
        '¿Qué es el desvanecimiento (fading)?',
        'Ir retirando pasos de los ejemplos resueltos hasta que resuelves los problemas por tu cuenta.',
        'Efecto del ejemplo resuelto',
      ),
    ],
  },
};
