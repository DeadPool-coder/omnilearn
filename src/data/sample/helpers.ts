import type { BloomLevel } from '@/domain/schemas';

export interface SampleQuestion {
  question: string;
  concept: string;
  bloom_level: BloomLevel;
  options: { text: string; is_correct: boolean; explanation: string }[];
}

export interface SampleLesson {
  markdown: string;
  quiz: { questions: SampleQuestion[] };
  flashcards: { front: string; back: string; concept: string }[];
}

/**
 * Pregunta con su opción correcta en primer lugar (la interfaz baraja el orden en cada intento).
 * Formato de cada opción: [texto, ¿correcta?, explicación].
 */
export function q(
  question: string,
  concept: string,
  bloom_level: BloomLevel,
  options: [string, boolean, string][],
): SampleQuestion {
  return {
    question,
    concept,
    bloom_level,
    options: options.map(([text, is_correct, explanation]) => ({ text, is_correct, explanation })),
  };
}

export function card(front: string, back: string, concept: string) {
  return { front, back, concept };
}
