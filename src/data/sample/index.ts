/**
 * Curso de ejemplo integrado: "Aprender a aprender".
 * Contenido real (no generado por IA) basado en investigación sobre memoria, aprendizaje y pensamiento.
 */
import type { Course } from '@/domain/schemas';
import type { SampleLesson } from './helpers';
import { MODULE_1 } from './module1';
import { MODULE_2 } from './module2';
import { MODULE_3 } from './module3';

export { SAMPLE_COURSE_ID } from './id';

type SampleCourse = Pick<
  Course,
  | 'topic'
  | 'title'
  | 'description'
  | 'level'
  | 'focus'
  | 'time_budget'
  | 'language'
  | 'goal'
  | 'learning_outcomes'
  | 'prerequisites'
> & {
  modules: {
    title: string;
    description: string;
    lessons: { title: string; objective: string; key_concepts: string[]; estimated_minutes: number }[];
  }[];
};

export const SAMPLE_COURSE: SampleCourse = {
  topic: 'Aprender a aprender',
  title: 'Aprender a aprender: memoria, comprensión y pensamiento científico',
  description:
    'Una ruta basada en evidencia para estudiar cualquier tema mejor: cómo funciona la memoria, qué técnicas tienen más respaldo, ' +
    'cómo comprender en profundidad y qué hábitos de pensamiento comparten los científicos. Incluye una revisión honesta de lo que se ' +
    'sabe sobre aumentar la inteligencia.',
  level: 'beginner',
  focus: 'theoretical',
  time_budget: 'micro',
  language: 'es',
  goal: 'Estudiar cualquier tema de forma más eficaz y pensar con más claridad.',
  learning_outcomes: [
    'Explicar por qué olvidamos y cómo la recuperación activa y el repaso espaciado lo contrarrestan.',
    'Diseñar sesiones de estudio con técnicas de alta utilidad: recuperación, espaciado e intercalado.',
    'Usar la técnica Feynman y la autoexplicación para detectar lagunas de comprensión.',
    'Aplicar primeros principios, estimaciones de Fermi y calibración de la confianza.',
    'Distinguir qué mejora el rendimiento intelectual según la evidencia y qué no.',
  ],
  prerequisites: [],
  modules: [
    {
      title: 'Cómo funciona la memoria',
      description: 'Entender por qué olvidamos y qué hace que un recuerdo dure.',
      lessons: [
        {
          title: 'La curva del olvido: por qué olvidamos',
          objective: 'Al terminar podrás explicar cómo decae la memoria y qué la hace más estable.',
          key_concepts: [
            'Curva del olvido',
            'Codificación, consolidación y recuperación',
            'Estabilidad del recuerdo',
          ],
          estimated_minutes: 7,
        },
        {
          title: 'Recuperación activa: el efecto test',
          objective: 'Al terminar podrás sustituir la relectura por práctica de recuperación.',
          key_concepts: ['Efecto test', 'Ilusión de fluidez', 'Dificultades deseables'],
          estimated_minutes: 7,
        },
        {
          title: 'Repaso espaciado: estudiar justo antes de olvidar',
          objective: 'Al terminar podrás planificar repasos espaciados y aprovechar el modo Repaso.',
          key_concepts: ['Efecto de espaciado', 'Intervalos crecientes', 'Algoritmo FSRS'],
          estimated_minutes: 7,
        },
      ],
    },
    {
      title: 'Comprender en profundidad',
      description: 'Pasar de memorizar a entender, explicar y transferir.',
      lessons: [
        {
          title: 'La técnica Feynman y la autoexplicación',
          objective: 'Al terminar podrás detectar tus lagunas explicando con palabras sencillas.',
          key_concepts: ['Técnica Feynman', 'Autoexplicación', 'Ilusión de profundidad explicativa'],
          estimated_minutes: 7,
        },
        {
          title: 'Intercalar y variar la práctica',
          objective: 'Al terminar podrás organizar la práctica mezclando tipos de problemas.',
          key_concepts: ['Práctica intercalada', 'Práctica en bloque', 'Discriminación de problemas'],
          estimated_minutes: 6,
        },
        {
          title: 'Carga cognitiva, chunking y ejemplos resueltos',
          objective:
            'Al terminar podrás dosificar la información nueva para no saturar la memoria de trabajo.',
          key_concepts: ['Memoria de trabajo', 'Chunking', 'Efecto del ejemplo resuelto'],
          estimated_minutes: 7,
        },
      ],
    },
    {
      title: 'Pensar como un científico',
      description: 'Hábitos de pensamiento de los mejores científicos y pronosticadores.',
      lessons: [
        {
          title: 'Primeros principios y estimaciones de Fermi',
          objective: 'Al terminar podrás descomponer problemas y estimar órdenes de magnitud.',
          key_concepts: ['Primeros principios', 'Estimación de Fermi', 'Órdenes de magnitud'],
          estimated_minutes: 8,
        },
        {
          title: 'Calibración: saber cuánto sabes',
          objective: 'Al terminar podrás expresar tu confianza con probabilidades y medir tu calibración.',
          key_concepts: ['Calibración', 'Puntuación de Brier', 'Tasa base'],
          estimated_minutes: 7,
        },
        {
          title: '¿Se puede aumentar la inteligencia? Lo que dice la evidencia',
          objective:
            'Al terminar podrás distinguir qué mejora de verdad el rendimiento intelectual y qué no.',
          key_concepts: ['Transferencia lejana', 'Educación y CI', 'Práctica deliberada'],
          estimated_minutes: 8,
        },
      ],
    },
  ],
};

export const SAMPLE_LESSONS: Record<string, SampleLesson> = { ...MODULE_1, ...MODULE_2, ...MODULE_3 };
