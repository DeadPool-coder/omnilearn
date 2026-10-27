# Contrato de datos

Todas las estructuras se definen una sola vez con **Zod** en [`src/domain/schemas.ts`](../src/domain/schemas.ts). De ahí salen los tipos de TypeScript, el JSON Schema que se envía al LLM y la validación de lo que devuelve. Los campos usan `snake_case` porque forman parte de un formato JSON que se exporta e importa.

Hay dos familias de esquemas:

- **Borradores de IA** (sufijo `AI`): lo único que se pide al modelo. No llevan identificadores ni estados.
- **Dominio**: lo que guarda la app. El `AIService` convierte cada borrador en una estructura de dominio y asigna IDs, estados y metadatos.

## 1. El contrato del motor: la ruta de aprendizaje

Es el temario que se genera **antes** que cualquier lección. Puedes verlo, copiarlo y descargarlo en la vista previa (**«Ver el temario en JSON»**). Sigue el contrato del enunciado, ampliado con los campos que necesita la interfaz:

```json
{
  "course_id": "6f1c2a7e-3b9d-4c1e-9a52-0d8e4b7f2c11",
  "topic": "Física cuántica",
  "level": "beginner",
  "focus": "theoretical",
  "time_budget": "micro",
  "language": "es",
  "title": "Física cuántica desde cero",
  "description": "De la doble rendija al entrelazamiento, con intuiciones antes que fórmulas.",
  "learning_outcomes": ["Explicar la dualidad onda-partícula con un ejemplo."],
  "prerequisites": [],
  "modules": [
    {
      "module_id": 1,
      "title": "Fundamentos cuánticos",
      "description": "Las ideas que rompen con la física clásica.",
      "lessons": [
        {
          "lesson_id": "1.1",
          "title": "Dualidad onda-partícula",
          "objective": "Al terminar podrás explicar el experimento de la doble rendija.",
          "key_concepts": ["Dualidad", "Interferencia"],
          "estimated_minutes": 6,
          "status": "pending"
        }
      ]
    }
  ]
}
```

| Campo         | Valores                                            | Notas                                                                                                                 |
| ------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `level`       | `beginner` · `basic` · `intermediate` · `advanced` | Desde cero · Conocimientos básicos · Intermedio · Avanzado. Se añade `basic` porque el selector tiene cuatro niveles. |
| `focus`       | `theoretical` · `practical` · `exam` · `executive` | Teórico-conceptual · Práctico por proyectos · Preparación de examen · Resumen ejecutivo.                              |
| `time_budget` | `micro` · `deep`                                   | Micro-lecciones (~5 min) o sesiones profundas (30+ min por módulo).                                                   |
| `lesson_id`   | `"<módulo>.<lección>"`                             | Lo asigna la app, nunca el modelo.                                                                                    |
| `status`      | `pending` · `in_progress` · `completed`            | **«Bloqueada» no se guarda**: se deriva de la lección anterior cuando el avance es secuencial (`domain/progress.ts`). |

La función `toContract(course)` ([`src/domain/contract.ts`](../src/domain/contract.ts)) produce exactamente esta vista. El resultado se puede volver a importar (ver la sección 6).

## 2. La ruta guardada (`Course`)

Además de los campos del contrato, cada ruta guarda:

| Campo                                                         | Contenido                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `goal`                                                        | Objetivo personal («aprobar Física II en junio»)                               |
| `status`                                                      | `active` · `completed` · `archived`                                            |
| `sequential`                                                  | `true` si las lecciones se desbloquean al aprobar la anterior                  |
| `source`                                                      | `ai` · `demo` · `sample` · `import`                                            |
| `generator`                                                   | `{ "provider": "anthropic", "model": "claude-opus-5-5" }` o `null`             |
| `source_material`                                             | Material de referencia que pegó el estudiante (se usa al generar cada lección) |
| `created_at`, `updated_at`, `last_studied_at`, `completed_at` | Marcas de tiempo en milisegundos                                               |

## 3. Lo que produce el LLM y lo que guarda la app

| Tarea           | Borrador que devuelve el LLM                                                                                                                                               | Estructura guardada | Lo que añade la app                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Temario         | `SyllabusAI`: título, descripción, 2-8 resultados de aprendizaje, ≤ 8 prerrequisitos, 1-10 módulos con 1-8 lecciones (título, objetivo, 2-6 conceptos clave, 3-90 minutos) | `Course`            | `course_id` (UUID), `module_id`, `lesson_id`, `status`, perfil del estudiante, fechas          |
| Lección         | Markdown en _streaming_ (sin esquema)                                                                                                                                      | `LessonContent`     | Identificador `course_id:lesson_id`, proveedor y modelo                                        |
| Micro-quiz      | `QuizAI`: 3-5 preguntas con concepto, nivel de Bloom y 4 opciones (texto, `is_correct`, explicación)                                                                       | `Quiz`              | IDs `q1`, `q1-a`…; se comprueba que hay **exactamente una** opción correcta y ninguna repetida |
| Tarjetas        | `FlashcardsAI`: 3-15 tarjetas `{front, back, concept}`                                                                                                                     | `Flashcard`         | ID, ruta y lección, origen, estado FSRS; se descartan duplicadas                               |
| Desafío Feynman | `FeynmanEvaluationAI`: rúbrica, veredicto, resumen, fortalezas, lagunas, ideas erróneas, jerga, sugerencias y pregunta socrática                                           | `FeynmanEvaluation` | `score` = suma de la rúbrica; el veredicto se recalcula a partir de la nota                    |
| Expansiones     | Markdown en _streaming_                                                                                                                                                    | `Expansion`         | Tipo (`simpler`, `example`, `deeper`, `question`), fragmento seleccionado, fecha               |

Cada respuesta estructurada pasa por tres pasos ([`src/ai/normalize.ts`](../src/ai/normalize.ts)):

1. **Preparar:** arreglos benignos que no inventan nada (recortar espacios, convertir `"5"` en `5`, desenvolver `{"syllabus": {…}}`, quitar duplicados, acotar listas y números).
2. **Validar** con Zod y con reglas adicionales. Si falla, el `AIService` devuelve al modelo la lista exacta de errores para que los corrija.
3. **Construir** la estructura de dominio con los IDs y estados.

## 4. El JSON Schema que recibe el proveedor

`zodToProviderSchema` convierte cada borrador con `z.toJSONSchema` y lo sanea para que lo acepten todos los proveedores: quita las palabras clave que no todos admiten (`minItems`, `maxItems`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `format`, `$schema`…), fija `additionalProperties: false` y marca todas las propiedades como obligatorias. Los límites eliminados se explican en las descripciones y en el prompt, y Zod los comprueba después.

Este es el esquema real de una lección del temario (`LessonOutlineAI`):

```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string", "description": "Título concreto y específico de la lección (no genérico)." },
    "objective": {
      "type": "string",
      "description": "Objetivo de aprendizaje observable: \"Al terminar podrás…\"."
    },
    "key_concepts": {
      "type": "array",
      "items": { "type": "string", "description": "Concepto clave, 1-5 palabras." },
      "description": "Entre 2 y 6 conceptos clave que la lección enseña."
    },
    "estimated_minutes": { "type": "integer", "description": "Minutos estimados de estudio." }
  },
  "required": ["title", "objective", "key_concepts", "estimated_minutes"],
  "additionalProperties": false
}
```

## 5. Estructuras de estudio

### Lección (`LessonContent`)

```json
{
  "id": "6f1c2a7e-…:1.1",
  "course_id": "6f1c2a7e-…",
  "lesson_id": "1.1",
  "content_markdown": "# Dualidad onda-partícula\n\n…",
  "generated_at": 1793088000000,
  "generator": { "provider": "anthropic", "model": "claude-opus-5-5" },
  "quiz": { "generated_at": 1793088060000, "questions": ["…"] },
  "flashcards_generated": true,
  "expansions": []
}
```

Regenerar una lección borra su quiz, porque las preguntas se basan en el texto anterior.

### Intento de quiz (`QuizAttempt`)

```json
{
  "id": "…",
  "course_id": "6f1c2a7e-…",
  "lesson_id": "1.1",
  "answers": [
    {
      "question_id": "q1",
      "option_id": "q1-c",
      "correct": false,
      "confidence": "sure",
      "concept": "Interferencia"
    }
  ],
  "score": 0.67,
  "passed": false,
  "created_at": 1793088300000
}
```

- `confidence`: `guess` (Adivino, ≈ 33 %), `probable` (Creo que sí, ≈ 70 %), `sure` (Seguro, ≈ 95 %). Alimenta el gráfico de calibración.
- Las respuestas falladas se convierten en tarjetas con `source: "quiz_error"` (pregunta en el anverso; respuesta correcta y explicación en el reverso).

### Tarjeta (`Flashcard`) y estado de repaso (`SrsState`)

```json
{
  "id": "…",
  "course_id": "6f1c2a7e-…",
  "lesson_id": "1.1",
  "front": "¿Qué produce el experimento de la doble rendija con electrones?",
  "back": "Un patrón de interferencia: se comportan como ondas.",
  "concept": "Interferencia",
  "source": "ai",
  "suspended": false,
  "created_at": 1793088400000,
  "updated_at": 1793088400000,
  "srs": {
    "due": 1793347600000,
    "stability": 3.2,
    "difficulty": 5.1,
    "elapsed_days": 0,
    "scheduled_days": 3,
    "learning_steps": 0,
    "reps": 1,
    "lapses": 0,
    "state": 2,
    "last_review": 1793088500000
  }
}
```

- `source`: `ai` (generada), `quiz_error` (cuaderno de errores), `user` (creada a mano), `sample` (curso de ejemplo).
- `srs.state`: 0 nueva, 1 aprendiendo, 2 repaso, 3 reaprendiendo. Los campos son los de FSRS; `due` está indexado para encontrar las tarjetas pendientes.
- Cada repaso deja un `ReviewLogEntry` con la nota (`rating` 1 Otra vez, 2 Difícil, 3 Bien, 4 Fácil), el estado previo, el intervalo programado y la duración.

### Desafío Feynman (`FeynmanAttempt`)

Guarda la explicación del estudiante y la evaluación completa (`FeynmanEvaluation`): `rubric` (`accuracy` 0-40, `completeness` 0-30, `clarity` 0-20, `examples` 0-10), `score` (0-100), `verdict` (`needs_work` · `partial` · `solid` · `excellent`), `summary`, `strengths`, `gaps`, `misconceptions`, `jargon`, `suggestions` y `follow_up_question`.

### Actividad (`ActivityEvent`)

Eventos `course_created`, `lesson_started`, `lesson_completed`, `quiz_attempt`, `review`, `feynman` y `course_completed`, con el día local (`"2026-10-27"`) para calcular la racha y el mapa de calor.

## 6. Exportar e importar

**Copia de seguridad** (Ajustes → «Exportar todo», o «Exportar JSON» en el menú de una ruta):

```json
{
  "app": "omnilearn",
  "format_version": 1,
  "exported_at": "2026-10-27T18:00:00.000Z",
  "courses": [],
  "lessons": [],
  "flashcards": [],
  "reviewLogs": [],
  "quizAttempts": [],
  "feynmanAttempts": [],
  "activity": []
}
```

**Importar** (Ajustes → «Importar JSON») acepta dos formatos:

1. **Una copia de Omnilearn.** Se fusiona con lo que ya tienes: los elementos con el mismo ID se sobrescriben y el resto se conserva. Cada elemento se valida por separado; los que no cumplen el esquema se omiten y se informa de cuántos.
2. **Un temario suelto con el contrato del motor**, como el de la sección 1. Solo son obligatorios `topic` y el título de cada módulo y de cada lección; el resto toma valores por defecto (nivel `basic`, enfoque `theoretical`, `micro`, 10 minutos por lección, español). La app asigna IDs nuevos y marca todas las lecciones como pendientes. Sirve para compartir rutas, para que un profesor escriba el temario a mano o para crearlo con otra herramienta:

```json
{
  "topic": "Historia de Roma",
  "level": "intermediate",
  "focus": "exam",
  "modules": [
    {
      "title": "La República",
      "lessons": [
        { "title": "El Senado y los cónsules", "key_concepts": ["Senado", "Cónsules", "Cursus honorum"] }
      ]
    }
  ]
}
```

## 7. Versionado

- Las copias llevan `format_version` (ahora `1`). Añadir campos opcionales no cambia la versión; un cambio incompatible la sube y el importador migrará las versiones anteriores.
- La base de datos local tiene su propia versión de esquema (Dexie, `db.version(1)`); los cambios de índices se hacen con una nueva versión y una función de migración.
- Los borradores de IA pueden evolucionar sin romper los datos guardados: basta con que el paso de construcción siga produciendo las mismas estructuras de dominio.
