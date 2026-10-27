# Viabilidad y hoja de ruta

Este documento responde a dos preguntas: **qué hace falta para que Omnilearn funcione de verdad** (que la gente aprenda, vuelva y que el proyecto se sostenga) y **qué construir después**. En cada apartado se separa lo que ya está hecho de lo que se propone.

## 1. Sobre «tener un mejor IQ»: lo que dice la evidencia

La aspiración es pensar como los científicos y las personas más brillantes. Conviene saber qué se puede entrenar y qué no:

- **Los juegos de «entrenamiento cerebral» no suben la inteligencia general.** Mejoran la tarea practicada y otras muy parecidas, pero no se transfieren a capacidades generales. Así lo concluyen los metaanálisis sobre memoria de trabajo (Melby-Lervåg y Hulme, 2013), la revisión de los programas comerciales (Simons et al., 2016) y el análisis de ajedrez, música y memoria de trabajo (Sala y Gobet, 2017). En 2016, la FTC de Estados Unidos multó a Lumosity con 2 millones de dólares por anunciar lo contrario.
- **La educación sí eleva el CI medido:** entre 1 y 5 puntos por cada año adicional de escolarización (metaanálisis de Ritchie y Tucker-Drob, 2018). Lo que funciona es aprender contenido exigente durante mucho tiempo.
- **Lo que distingue a los expertos es, sobre todo, conocimiento bien organizado y hábitos de pensamiento.** Los maestros de ajedrez recuerdan posiciones reales porque las perciben en bloques con significado, pero no posiciones al azar (Chase y Simon, 1973). La práctica deliberada importa (Ericsson et al., 1993), aunque explica solo una parte de las diferencias, un 12 % de media según Macnamara et al. (2014). Y los mejores pronosticadores destacan por cómo razonan con la incertidumbre (Tetlock).

**La promesa de Omnilearn, por tanto, no es «subir tu CI»**, sino lo que sí se puede entrenar: **saber más, recordarlo durante años, entenderlo a fondo y pensar con las herramientas de los científicos** (primeros principios, estimación, calibración, buscar el fallo en tus propias ideas). Con el tiempo, eso es lo que hace a alguien más capaz en su campo. Ser honestos en esto es también una condición de viabilidad: evita prometer lo que no se puede cumplir y los riesgos legales que conlleva.

El curso de ejemplo incluido dedica su última lección a este tema.

## 2. Lo que hace falta para que funcione

| Condición                  | Si falla…                                    | Ya incluido                                                                                                      | Siguiente paso                                                               |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Volver cada día**        | Se abandona, y sin repaso no hay memoria     | Repaso diario con FSRS, racha, mapa de calor, lecciones de 5 minutos                                             | App instalable (PWA) con recordatorios; objetivo con fecha                   |
| **Contenido correcto**     | Una alucinación enseña algo falso con aplomo | Esquemas estrictos, validación y reparación, material de referencia propio, preguntas basadas solo en la lección | Citas y fuentes, verificador automático, «Reportar error», rutas verificadas |
| **Aprender, no solo leer** | Ilusión de competencia                       | Quiz obligatorio, confianza declarada, cuaderno de errores, Desafío Feynman                                      | Problemas con respuesta verificable, pretest, exámenes intercalados          |
| **Coste sostenible**       | Cada usuario cuesta más de lo que aporta     | Generación justo a tiempo, sin servidores (local-first), clave propia, Ollama gratis                             | Modelo barato para tareas ligeras, rutas compartidas en caché                |
| **Aprendizaje medible**    | No saber si funciona                         | Dominio por lección y por ruta, calibración, historial                                                           | Pruebas diferidas, piloto con grupo de control                               |

## 3. Ideas por perfil

### 3.1 Para recordar y aprender cosas

**Ya incluido:** repaso espaciado con FSRS, tarjetas automáticas, cuaderno de errores, biblioteca con buscador.

**Propuestas:**

- **Captura rápida:** pegar un texto, un enlace o unas notas y obtener tarjetas con su fuente, sin crear una ruta. Más adelante, importar subrayados de libros y transcripciones de vídeos.
- **Tarjetas de huecos (cloze) y de imagen con zonas ocultas**, para listas, fechas, anatomía o mapas.
- **«Ayúdame a recordarlo»:** mnemotecnias bajo demanda (palacio de la memoria, palabra clave, acrónimos) para datos sin estructura. En personas sin experiencia, seis semanas de práctica con el método de los loci duplicaron con creces las palabras recordadas (Dresler et al., 2017).
- **Modo audio:** lecciones leídas en voz alta y preguntas orales para el transporte o el gimnasio.
- **Recordatorio con contenido:** una notificación con las 5 tarjetas que tocan hoy, que se responde en un minuto.
- **Resumen semanal:** «esta semana aprendiste…» con 3 preguntas de semanas anteriores.

### 3.2 Para estudiantes de ingeniería

**Ya incluido:** fórmulas en LaTeX, código resaltado, diagramas, enfoque «Preparación de examen», material de referencia (pega el temario de tu asignatura) y un ejemplo resuelto en cada lección.

**Propuestas, de más a menos impacto:**

1. **Problemas con respuesta numérica verificada por código, no por el LLM.** El modelo propone el problema; un motor matemático (mathjs o SymPy) calcula la solución y comprueba la del estudiante con tolerancia y **unidades** («tu resultado está en J/s; se pedía J»). Así los errores de cálculo del modelo no llegan al estudiante.
2. **Ejemplos resueltos que se desvanecen:** primero un problema resuelto paso a paso, después uno con pasos en blanco y por último uno sin ayuda. Mejora la transferencia frente a resolver problemas desde el principio (Renkl et al., 2002; Atkinson et al., 2003).
3. **Laboratorio en el navegador:** Python con NumPy, SymPy y Matplotlib mediante Pyodide (métodos numéricos, señales, control), y SQL real con DuckDB-WASM o sql.js; en la ruta «Optimización de consultas SQL», ejecutar `EXPLAIN` sobre una base de datos de ejemplo.
4. **Gráficas interactivas** con deslizadores: ver cómo cambia una respuesta en frecuencia, una trayectoria o una curva de tensión-deformación al mover un parámetro.
5. **Importar PDF** del temario, los apuntes y exámenes de años anteriores, para que la ruta siga la asignatura real y las preguntas imiten el estilo del examen.
6. **Modo examen:** problemas cronometrados y mezclados de varios módulos (práctica intercalada), con corrección paso a paso al final.
7. **Pretest al empezar cada módulo:** intentar responder antes de estudiar mejora el aprendizaje posterior, incluso cuando se falla (Richland, Kornell y Kao, 2009).
8. **Tarjetas de fórmulas con contexto:** además de la fórmula, «¿de dónde sale?», «¿qué significa cada término?» y «¿cuándo no se puede usar?».
9. **Plan inverso desde la fecha del examen:** con los días y las horas disponibles, la app reparte lecciones y repasos, y sube la retención deseada en la última semana.
10. **Cuaderno de errores por tipo:** conceptual, algebraico, de unidades, de signo o de lectura del enunciado, para practicar justo lo que falla.
11. **Estimación y orden de magnitud antes de calcular:** preguntarse «¿tiene sentido este resultado?» detecta muchos errores antes de entregar.

### 3.3 Para estudiar cualquier cosa

**Ya incluido:** cualquier tema, cuatro niveles, cuatro enfoques, dos ritmos, objetivo personal, material propio y cinco motores de IA.

**Propuestas:**

- **Actividades según el tipo de conocimiento.** El temario puede etiquetar cada lección como _declarativa_ (hechos: tarjetas), _conceptual_ (modelos: Feynman y diagramas) o _procedimental_ (habilidades: práctica guiada con lista de comprobación). En «Acordes de guitarra», la lección propondría una rutina con metrónomo, diagramas de acordes y una autoevaluación después de practicar, en lugar de solo un quiz.
- **Fuentes para temas que cambian:** búsqueda web con citas (las herramientas de búsqueda de Claude o Gemini) para actualidad, legislación o tecnología reciente.
- **Rutas encadenadas:** al terminar una ruta, proponer la siguiente («Ya sabes SQL básico: índices y planes de ejecución») y permitir prerrequisitos entre rutas.
- **Idiomas:** un tipo de ruta propio con vocabulario en contexto, frases y práctica de producción (escrita y, más adelante, oral).

### 3.4 Para pensar como los científicos

**Ya incluido:** el curso de ejemplo enseña primeros principios, estimación de Fermi, calibración y la técnica Feynman; cada respuesta del quiz lleva confianza declarada; el panel muestra tu calibración; y cada lección tiene su Desafío Feynman.

**Propuesta: un «gimnasio de pensamiento» diario de 5-10 minutos.**

| Ejercicio                      | Qué entrena                                          | Cómo funcionaría                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problema de Fermi del día      | Descomponer y estimar                                | «¿Cuántos litros de agua usa tu ciudad al día?»: comparas tu descomposición con una de referencia y ves tu error en órdenes de magnitud                                      |
| Juego de calibración           | Saber cuánto sabes                                   | Intervalos del 90 % y probabilidades; puntuación de Brier y curva de calibración semana a semana                                                                             |
| Biblioteca de modelos mentales | Ideas útiles en muchos campos                        | Tasa base, coste de oportunidad, retroalimentación, cuellos de botella, regresión a la media, efectos de segundo orden…, cada uno con tarjetas y casos de dominios distintos |
| Transferencia                  | Reconocer la misma estructura en problemas distintos | «¿Dónde más aparece esta idea?»; comparar dos casos con la misma estructura ayuda a extraer el principio (Gentner, Loewenstein y Thompson, 2003)                             |
| _Steelman_                     | Honestidad intelectual                               | El tutor presenta el mejor argumento contra tu postura; lo rebates o cambias de opinión                                                                                      |
| Predecir antes de ver          | Modelos mentales que se ponen a prueba               | Antes de mostrar un resultado, la app pide tu predicción y después la contrasta                                                                                              |
| Leer un artículo científico    | Juzgar la evidencia                                  | Lectura guiada: pregunta, método, resultado, limitaciones y qué lo refutaría                                                                                                 |
| Resolver como Pólya            | Un método para problemas nuevos                      | Entender, planificar, ejecutar y revisar, con pistas graduadas en lugar de la solución                                                                                       |
| Feynman semanal                | Comprensión profunda                                 | Explicar el tema de la semana a alguien de 12 años; la rúbrica señala lagunas y jerga                                                                                        |

## 4. Calidad: cómo controlar las alucinaciones

**Ya incluido:**

- JSON Schema estricto, validación con Zod y reparación guiada.
- Las preguntas se basan solo en el texto de la lección y las tarjetas se extraen de él; si la lección se regenera, su quiz se descarta.
- El material de referencia del estudiante se incluye en cada lección.
- Regenerar una lección o unas preguntas con un clic.

**Propuestas:**

1. **Citas y fuentes:** búsqueda web o documentos del usuario, con la referencia visible junto a cada afirmación importante.
2. **Verificador automático:** un segundo modelo, más barato, revisa cada lección y la respuesta correcta de cada pregunta y marca lo dudoso antes de mostrarlo.
3. **Cálculo determinista:** números, unidades y código comprobados con mathjs, SymPy o ejecución real (apartado 3.2).
4. **«Reportar error»** en lecciones, preguntas y tarjetas: regenera el elemento y, con un servidor, acumula estadísticas por tema y proveedor.
5. **Rutas verificadas** por profesores o expertos (apartado 6).
6. **Evaluaciones automáticas de prompts y modelos:** un conjunto fijo de temas y niveles con una rúbrica, para comparar proveedores y cambios de prompt antes de publicarlos.

## 5. Costes

Medición con los prompts reales sobre las 9 lecciones del curso de ejemplo (~590 palabras por lección, quiz de 3 preguntas y 5 tarjetas por lección): una ruta micro completa consume unos **40 000-46 000 tokens de entrada y 19 000-22 000 de salida visible**. Los modelos Claude 5.5 razonan antes de responder y ese razonamiento se factura como salida, así que el extremo alto de la tabla supone el doble de salida.

| Modelo            | Entrada / salida (por millón de tokens) | Por ruta de 9 lecciones | Por lección |
| ----------------- | --------------------------------------- | ----------------------- | ----------- |
| Claude Opus 5.5   | 4 $ / 20 $                              | 0,62-1,06 $             | 0,07-0,12 $ |
| Claude Sonnet 5.5 | 2 $ / 10 $                              | 0,31-0,53 $             | 0,03-0,06 $ |
| Claude Haiku 5.5  | 0,10 $ / 0,50 $                         | 0,02-0,03 $             | < 0,01 $    |
| Ollama (local)    | —                                       | 0                       | 0           |

Precios de lista de Anthropic en octubre de 2026; compruébalos antes de fijar tarifas, y mide el consumo real (`usage`) en las primeras rutas. Para OpenAI y Gemini, aplica el mismo cálculo con sus precios. Las expansiones, el Desafío Feynman y las regeneraciones suman algo más.

**Palancas para reducirlo:**

- **Generación justo a tiempo** (ya incluida): solo se paga lo que se abre. Una ruta abandonada en la lección 3 cuesta un tercio.
- **Un modelo por tarea:** Opus para el temario y las lecciones, Haiku o Sonnet para quizzes y tarjetas. Con Haiku para esas tareas, la ruta con Opus baja a ≈ 0,30-0,55 $.
- **Esfuerzo de razonamiento** (ya configurable en Ajustes): `low` reduce los tokens de razonamiento.
- **Caché de prompts** cuando el material de referencia es largo: se envía en cada lección y su relectura desde caché cuesta una fracción del precio normal.
- **Rutas compartidas:** los temas populares («SQL básico», «Cálculo I») se generan y revisan una vez y se sirven a muchos usuarios; con la API de lotes (Batch), además, a mitad de precio.
- **Modelos locales** con Ollama: coste marginal cero para quien tenga el equipo.

## 6. Modelo de sostenibilidad

| Modelo                            | Para quién                         | Cómo funciona                                                                                                                                                   |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gratis con clave propia**       | Usuarios técnicos                  | Como ahora: cada uno usa su clave o Ollama. Coste para el proyecto: el alojamiento estático (gratis o casi).                                                    |
| **Freemium con proxy gestionado** | Público general                    | Algunas rutas al mes gratis con un modelo económico; suscripción Pro con mejores modelos, sincronización, importación de PDF y laboratorio.                     |
| **Centros educativos**            | Universidades, academias, colegios | Licencia por estudiante: rutas alineadas con el temario oficial, panel docente (dominio por concepto y errores frecuentes del grupo) y despliegue con el proxy. |
| **Formación en empresas**         | Incorporación y formación interna  | El mismo motor con los documentos de la empresa como material de referencia.                                                                                    |
| **Mercado de rutas verificadas**  | Expertos y estudiantes             | Rutas revisadas por profesores, con reparto de ingresos.                                                                                                        |

**Ejemplo ilustrativo (hipótesis, no datos):** un usuario Pro que empieza 4 rutas al mes y completa la mitad consume el equivalente a unas 2 rutas completas, más un 30 % de extras: ≈ 0,8-1,4 $ al mes con Sonnet 5.5, o ≈ 1,6-2,8 $ con Opus 5.5. Una cuota de 5-8 € al mes cubriría el coste con margen incluso con el modelo más caro. Antes de fijar precios hay que validar estas hipótesis con datos reales de uso.

## 7. Métricas

| Tipo                  | Métrica                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Métrica principal** | Conceptos retenidos a 30 días (tarjetas con retención estimada ≥ 90 % un mes después de crearlas) por usuario activo                         |
| Hábito                | Retención de usuarios a 1, 7 y 30 días; días activos por semana; porcentaje de repasos hechos a tiempo                                       |
| Aprendizaje           | Lecciones completadas; aprobados al primer intento; resultado en pruebas diferidas (1 y 4 semanas después); mejora de la puntuación de Brier |
| Calidad               | Errores reportados por cada 100 lecciones; tasa de regeneración; salidas inválidas o reparadas por proveedor                                 |
| Coste                 | Coste por lección completada y por usuario activo                                                                                            |

## 8. Plan de validación

1. **Uso propio y 5-10 personas (2 semanas):** entrevistas y observación; telemetría solo con consentimiento y anónima.
2. **Piloto con estudiantes de ingeniería en una asignatura (6-8 semanas):** diseño _dentro de sujetos_ y contrabalanceado: cada estudiante prepara la mitad de los temas con Omnilearn y la otra mitad con su método habitual (las mitades se intercambian entre grupos). Se mide la nota en las preguntas de cada tema y una prueba diferida a las 4 semanas. Este diseño necesita menos participantes que dos grupos separados.
3. **Pruebas A/B de diseño:** quiz obligatorio u opcional; con o sin confianza declarada; lecciones micro o profundas; con o sin pretest.
4. **Ética y privacidad:** consentimiento informado, datos mínimos y derecho a borrarlos (la app ya permite exportar y borrar todo).

## 9. Riesgos y cómo mitigarlos

| Riesgo                                 | Mitigación                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alucinaciones                          | Anclaje en el material del estudiante, verificador, cálculo determinista, citas, «Reportar error», rutas verificadas                                                  |
| Abandono                               | Sesiones cortas, recordatorios con contenido, racha con días de descanso, objetivo con fecha, progreso visible                                                        |
| Coste de la API                        | Generación justo a tiempo, un modelo por tarea, rutas en caché, modelos locales, límites por plan                                                                     |
| Claves expuestas                       | Proxy con las claves en el servidor; en uso personal, la clave no sale del navegador salvo hacia el proveedor                                                         |
| Dependencia de un proveedor            | `AIService` desacoplado con cinco adaptadores intercambiables                                                                                                         |
| Privacidad (RGPD y leyes equivalentes) | Local-first, exportar y borrar todo, solo se envía al proveedor lo necesario; con menores, consentimiento parental según cada país (en España, por debajo de 14 años) |
| Promesas exageradas                    | Mensajes basados en evidencia: retención y comprensión, nunca «aumenta tu CI»                                                                                         |
| Calidad desigual entre modelos         | Evaluaciones por proveedor y modelos mínimos recomendados                                                                                                             |
| Avalancha de tarjetas                  | Límite de tarjetas nuevas por día, suspender tarjetas y FSRS ajustable                                                                                                |

## 10. Hoja de ruta

| Fase                                      | Objetivo                                     | Entregables                                                                                                                                                                                                            |
| ----------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Hábito** (0-2 meses)                 | Que la gente vuelva cada día                 | PWA instalable y sin conexión · recordatorios de repaso · tarjetas de huecos · captura rápida de texto · modelo para tareas ligeras · «Reportar error»                                                                 |
| **2. Ingeniería y ciencias** (2-4 meses)  | Que sirva para aprobar asignaturas difíciles | Importar PDF · problemas con respuesta y unidades verificadas · ejemplos que se desvanecen · Python y SQL en el navegador · gráficas interactivas · modo examen intercalado · pretest · plan desde la fecha del examen |
| **3. Pensamiento científico** (4-6 meses) | Entrenar hábitos de pensamiento              | Problema de Fermi diario · juego de calibración · biblioteca de modelos mentales · _steelman_ · lectura guiada de artículos · retos de transferencia                                                                   |
| **4. Social y escala** (6-12 meses)       | Crecer y sostenerse                          | Cuentas y sincronización opcionales · compartir rutas por enlace · rutas verificadas · panel docente · citas con búsqueda web · verificador automático · evaluaciones de calidad por proveedor                         |

Cada fase se valida con las métricas del apartado 7 antes de pasar a la siguiente.
