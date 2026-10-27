# Motor pedagógico

Omnilearn no intenta que leas más, sino que **recuerdes, comprendas y apliques** más. Cada función responde a una técnica con respaldo en investigación sobre aprendizaje.

## 1. Los tres principios y dónde están

| Principio               | Qué significa                                                 | Cómo se implementa                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Andamiaje cognitivo** | De lo simple a lo complejo; cada idea se apoya en la anterior | El temario se ordena por prerrequisitos (_Ruta → Módulos → Lecciones → Conceptos clave_); cada lección conoce las anteriores y las siguientes para no adelantar contenido; desbloqueo progresivo por dominio |
| **Adaptabilidad**       | Lenguaje, profundidad y analogías según el perfil             | Guías de redacción por nivel, enfoque y tiempo (`src/ai/prompts/guides.ts`); objetivo personal y material propio en el prompt; repaso automático de los conceptos fallados                                   |
| **Aprendizaje activo**  | No basta con leer                                             | Micro-quiz obligatorio para completar; confianza declarada; errores → tarjetas; repaso espaciado; Desafío Feynman; acciones rápidas sobre fragmentos                                                         |

## 2. Técnicas y evidencia

| Técnica                                     | Evidencia (resumen)                                                                                                                               | En Omnilearn                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Práctica de recuperación** (efecto test)  | Ponerse a prueba retiene más que releer a largo plazo (Roediger y Karpicke, 2006). Dunlosky y colaboradores (2013) la califican de utilidad alta. | Micro-quiz por lección, tarjetas, opción «Escribir respuesta» en el repaso                                                                          |
| **Repaso espaciado**                        | Distribuir el estudio supera a concentrarlo (metaanálisis de Cepeda et al., 2006)                                                                 | Repaso diario con FSRS, retención deseada configurable                                                                                              |
| **Aprendizaje por dominio**                 | No avanzar hasta dominar lo previo (Bloom)                                                                                                        | La siguiente lección se desbloquea al aprobar el quiz (nota mínima configurable, 70 % por defecto)                                                  |
| **Retroalimentación inmediata y elaborada** | Explicar por qué una respuesta es correcta o incorrecta corrige concepciones erróneas                                                             | Cada opción del quiz trae su explicación                                                                                                            |
| **Hipercorrección**                         | Los errores cometidos con mucha confianza se corrigen especialmente bien tras la retroalimentación (Butterfield y Metcalfe, 2001)                 | Botones de confianza; aviso específico cuando fallas estando «seguro»                                                                               |
| **Calibración (metacognición)**             | Los mejores pronosticadores ajustan su confianza a su acierto real (Tetlock)                                                                      | Gráfico de calibración y diagnóstico de sobre/infraconfianza en el panel                                                                            |
| **Autoexplicación y técnica Feynman**       | Explicarse el porqué mejora la comprensión (Chi et al., 1989); explicar revela la ilusión de profundidad explicativa (Rozenblit y Keil, 2002)     | Desafío Feynman con rúbrica; «Para pensar» al final de cada lección                                                                                 |
| **Elaboración y ejemplos concretos**        | Conectar con lo que ya sabes y ver casos concretos favorece la transferencia                                                                      | «Ejemplo práctico», «Más simple (analogía)», «Profundizar», también sobre texto seleccionado                                                        |
| **Práctica intercalada**                    | Mezclar tipos de problemas mejora la discriminación (Rohrer y Taylor, 2007)                                                                       | El repaso mezcla tarjetas de todas las rutas y conceptos                                                                                            |
| **Carga cognitiva y ejemplos resueltos**    | Los principiantes aprenden más con ejemplos resueltos (Sweller); el efecto se invierte con la pericia (Kalyuga et al., 2003)                      | Las guías por nivel piden intuición → definición → ejemplo para principiantes y rigor y casos límite para avanzados; lecciones con ejemplo resuelto |
| **Codificación dual**                       | Palabras + imágenes bien integradas                                                                                                               | Diagramas Mermaid cuando aportan                                                                                                                    |
| **Efecto de generación**                    | Producir una respuesta (aunque falles) mejora el recuerdo                                                                                         | Escribir la respuesta antes de verla en el repaso; Desafío Feynman                                                                                  |

## 3. Diseño del temario

El prompt de syllabus (`buildSyllabusMessages`) exige:

- Orden por prerrequisitos: ningún concepto se usa antes de enseñarse.
- Tamaño según el tiempo y el enfoque: micro-lecciones (3-5 módulos de 2-4 lecciones de 5-8 min), sesiones profundas (3-6 módulos de 2-4 lecciones de 12-25 min, al menos 30 min por módulo) o resumen ejecutivo (2-4 módulos de 2-3 lecciones).
- Primer módulo adecuado al nivel (intuición para «desde cero», repaso riguroso para «avanzado»).
- Cada lección con título concreto, **objetivo observable** («Al terminar podrás…») y 2-5 conceptos clave, sin solapamientos.
- Regla según el enfoque: práctica al final de cada módulo (práctico), problemas tipo y repaso integrador (examen), ruta corta (ejecutivo), integración del modelo completo (teórico).
- Orientación al objetivo personal (examen, proyecto, fecha) y, si lo hay, al material de referencia del estudiante, que reduce las alucinaciones y alinea la ruta con su curso real.

## 4. Estructura de cada lección

| Parte                                                            | Para qué                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| Gancho de 2-3 frases                                             | Motivación: por qué importa, conectado con tu objetivo |
| Un apartado por concepto clave: intuición → definición → ejemplo | Andamiaje y ejemplos concretos                         |
| `> **Concepto clave:** …`                                        | Señalización de lo esencial (se muestra destacado)     |
| Ejemplo resuelto paso a paso                                     | Reducir la carga cognitiva                             |
| «Errores frecuentes»                                             | Prevenir concepciones erróneas                         |
| Diagrama Mermaid (solo si aporta)                                | Codificación dual                                      |
| Fórmulas LaTeX, código, tablas                                   | Rigor en temas técnicos                                |
| «Resumen» y «Para pensar»                                        | Consolidación y elaboración                            |

Extensión: 350-650 palabras (micro) o 1200-2000 (profunda). Si fallaste en quizzes anteriores conceptos relacionados con la lección, empieza con un repaso de 2-3 frases que los aclare.

## 5. Evaluación

### Micro-quiz

- 3 preguntas (micro o ejecutivo) o 5 (profundo), **solo** sobre el contenido de la lección.
- Reparto de niveles de Bloom: al menos una de comprender y una de aplicar o analizar; como mucho una de recordar. Se priorizan escenarios nuevos (transferencia).
- 4 opciones, exactamente una correcta (se valida y se repara si no), distractores basados en errores típicos, explicación por opción.
- El orden de las opciones se baraja en cada intento (evita sesgos de posición del modelo).
- «Reintentar» baraja de nuevo; «Nuevas preguntas» genera otro quiz.

### Tarjetas

- Principio de información mínima: una idea por tarjeta, pregunta concreta, respuesta de menos de 40 palabras, tipos variados (definición, causa, procedimiento, diferencia, aplicación).
- Se crean al aprobar el quiz; cada pregunta fallada también se convierte en tarjeta («cuaderno de errores»).

### Repaso con FSRS

- Cada tarjeta guarda dificultad, estabilidad y estado. FSRS programa el repaso cuando la probabilidad estimada de recordarla baja a la **retención deseada** (90 % por defecto, ajustable entre 80 % y 97 %).
- Botones: Otra vez / Difícil / Bien / Fácil, con el intervalo resultante a la vista. Las tarjetas que vuelven en menos de 20 minutos reaparecen en la misma sesión.
- Límite de tarjetas nuevas por sesión (20 por defecto) para evitar avalanchas.

### Desafío Feynman

Rúbrica de 100 puntos: exactitud (40), cobertura de conceptos clave (30), claridad para un principiante (20) y uso de ejemplos o analogías (10). La nota es la suma y el veredicto se deriva de ella (necesita trabajo < 50 ≤ parcial < 70 ≤ sólida < 90 ≤ excelente). Devuelve fortalezas, lagunas, ideas imprecisas, jerga sin explicar, sugerencias y una pregunta socrática. En modo demo la evaluación es heurística y lo indica.

## 6. Métricas

- **Dominio de una lección** = 60 % mejor nota del quiz + 40 % retención estimada actual de sus tarjetas (si aún no hay repasos, solo el quiz; sin completar, como mucho la mitad). Como la retención decae con el tiempo, **el dominio también baja si no repasas**: refleja memoria real, no solo progreso.
- **Dominio de la ruta** = media del dominio de sus lecciones.
- **Calibración:** acierto real por nivel de confianza (Adivino ≈ 33 %, Creo que sí ≈ 70 %, Seguro ≈ 95 %), puntuación de Brier y sesgo (confianza media − acierto medio).
- **Racha:** días seguidos con actividad (sigue viva hasta el final del día aunque aún no hayas estudiado hoy).

## 7. Límites honestos

- Un LLM puede equivocarse. Lo mitigan el esquema estricto, la validación, el material de referencia del estudiante y las preguntas basadas solo en el texto de la lección, pero conviene contrastar los datos críticos (ver la hoja de ruta: citas y verificación).
- Las técnicas mejoran la retención y la comprensión de lo que estudias. **No hay evidencia de que ninguna app aumente la inteligencia general**; el curso de ejemplo dedica una lección a ello (ver [VIABILIDAD_Y_ROADMAP.md](VIABILIDAD_Y_ROADMAP.md)).
