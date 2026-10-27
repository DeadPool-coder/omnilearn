import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  RefreshCw,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { BLOOM_META, CONFIDENCE_META } from '@/domain/labels';
import type { Confidence, Quiz, QuizAnswer, QuizOption } from '@/domain/schemas';
import { cn } from '@/lib/cn';
import { Markdown } from '../markdown/Markdown';
import { Button } from '../ui/Button';
import { Badge, Kbd, ProgressRing } from '../ui/primitives';

/** PRNG determinista (mulberry32) para barajar igual dentro de un intento. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const rand = seeded(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export interface QuizResult {
  answers: QuizAnswer[];
  score: number;
  passed: boolean;
}

export function QuizRunner({
  quiz,
  attemptSeed,
  askConfidence,
  passThreshold,
  onFinish,
  onRetry,
  onNewQuestions,
  onContinue,
  regenerating,
}: {
  quiz: Quiz;
  attemptSeed: number;
  askConfidence: boolean;
  passThreshold: number;
  onFinish: (result: QuizResult) => void | Promise<void>;
  onRetry: () => void;
  onNewQuestions: () => void;
  onContinue?: () => void;
  regenerating?: boolean;
}) {
  const questions = useMemo(
    () =>
      quiz.questions.map((q) => ({
        ...q,
        options: shuffle(q.options, hash(q.id + q.question) + attemptSeed * 7919),
      })),
    [quiz, attemptSeed],
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const chosen = question?.options.find((o) => o.id === selected) ?? null;
  const lastAnswer = answers[answers.length - 1];

  const submit = (confidence: Confidence | null) => {
    if (!question || !chosen || revealed) return;
    setAnswers((prev) => [
      ...prev,
      {
        question_id: question.id,
        option_id: chosen.id,
        correct: chosen.is_correct,
        confidence,
        concept: question.concept,
      },
    ]);
    setRevealed(true);
  };

  const next = async () => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      return;
    }
    const correct = answers.filter((a) => a.correct).length;
    const score = answers.length ? correct / answers.length : 0;
    setFinished(true);
    await onFinish({ answers, score, passed: score >= passThreshold });
  };

  // Atajos: 1-4 elige opción; Intro comprueba (sin confianza) o avanza.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (finished || !question) return;
      const n = Number(e.key);
      if (!revealed && n >= 1 && n <= question.options.length) {
        setSelected(question.options[n - 1].id);
      } else if (e.key === 'Enter') {
        if (revealed) {
          e.preventDefault();
          void next();
        } else if (selected && !askConfidence) {
          e.preventDefault();
          submit(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    const correct = answers.filter((a) => a.correct).length;
    const score = answers.length ? correct / answers.length : 0;
    const passed = score >= passThreshold;
    const missed = answers.filter((a) => !a.correct).map((a) => a.concept);
    const confidentErrors = answers.filter((a) => !a.correct && a.confidence === 'sure').length;
    return (
      <div className="animate-fade-in rounded-xl border border-line bg-surface p-6" aria-live="polite">
        <div className="flex flex-col items-center text-center">
          <ProgressRing
            value={score * 100}
            size={84}
            stroke={6}
            tone={passed ? 'success' : 'warning'}
            label={`Puntuación ${Math.round(score * 100)} %`}
          >
            <span className="text-lg font-semibold">{Math.round(score * 100)}%</span>
          </ProgressRing>
          <h3 className="mt-4 text-lg font-semibold">
            {passed ? '¡Lección superada!' : 'Casi: repasa y vuelve a intentarlo'}
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            {correct} de {answers.length} correctas · necesitas {Math.round(passThreshold * 100)} % para
            completar la lección
          </p>
        </div>
        {missed.length > 0 && (
          <div className="mt-5 rounded-lg bg-surface-2 p-3 text-[13px]">
            <div className="font-medium text-fg">Para repasar</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[...new Set(missed)].map((c) => (
                <Badge key={c} tone="warning">
                  {c}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              Las preguntas falladas se han añadido a tus tarjetas de repaso.
            </p>
          </div>
        )}
        {confidentErrors > 0 && (
          <p className="mt-3 flex items-start gap-2 text-xs text-fg-muted">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
            Fallaste {confidentErrors === 1 ? 'una pregunta' : `${confidentErrors} preguntas`} estando
            «seguro». Esos errores, una vez corregidos, son los que mejor se recuerdan (efecto de
            hipercorrección).
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {passed ? (
            onContinue && (
              <Button variant="primary" iconRight={<ArrowRight className="size-4" />} onClick={onContinue}>
                Continuar
              </Button>
            )
          ) : (
            <>
              <Button variant="primary" icon={<RotateCcw className="size-4" />} onClick={onRetry}>
                Reintentar
              </Button>
              <Button
                variant="secondary"
                icon={<RefreshCw className="size-4" />}
                onClick={onNewQuestions}
                loading={regenerating}
              >
                Nuevas preguntas
              </Button>
            </>
          )}
          {passed && (
            <Button
              variant="ghost"
              icon={<RefreshCw className="size-4" />}
              onClick={onNewQuestions}
              loading={regenerating}
            >
              Practicar con nuevas preguntas
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!question) return null;

  const optionState = (o: QuizOption) => {
    if (!revealed) return o.id === selected ? 'selected' : 'idle';
    if (o.is_correct) return 'correct';
    if (o.id === selected) return 'wrong';
    return 'dim';
  };

  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div
          className="flex items-center gap-1.5"
          aria-label={`Pregunta ${index + 1} de ${questions.length}`}
        >
          {questions.map((q, i) => {
            const a = answers[i];
            return (
              <span
                key={q.id}
                className={cn(
                  'h-1.5 w-6 rounded-full',
                  a ? (a.correct ? 'bg-success' : 'bg-danger') : i === index ? 'bg-accent' : 'bg-surface-3',
                )}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Badge>{BLOOM_META[question.bloom_level].label}</Badge>
          <span className="tabular-nums">
            {index + 1}/{questions.length}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="text-[15.5px] font-medium text-fg">
          <Markdown content={question.question} compact className="[&_p]:my-0" />
        </div>

        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Opciones">
          {question.options.map((o, i) => {
            const state = optionState(o);
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={o.id === selected}
                disabled={revealed}
                onClick={() => setSelected(o.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[14px] transition-colors disabled:cursor-default',
                  state === 'idle' && 'border-line hover:border-line-strong hover:bg-surface-2',
                  state === 'selected' && 'border-accent bg-accent-soft',
                  state === 'correct' && 'border-success/50 bg-success-soft',
                  state === 'wrong' && 'border-danger/50 bg-danger-soft',
                  state === 'dim' && 'border-line opacity-60',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold',
                    state === 'selected' && 'border-accent bg-accent text-accent-fg',
                    state === 'correct' && 'border-success bg-success text-white',
                    state === 'wrong' && 'border-danger bg-danger text-white',
                    (state === 'idle' || state === 'dim') && 'border-line-strong text-fg-muted',
                  )}
                >
                  {state === 'correct' ? (
                    <Check className="size-3.5" />
                  ) : state === 'wrong' ? (
                    <X className="size-3.5" />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="min-w-0 flex-1 text-fg">
                  <Markdown content={o.text} compact className="[&_p]:my-0" />
                  {revealed && (state === 'correct' || state === 'wrong') && (
                    <span className="mt-1.5 block text-[13px] text-fg-muted">{o.explanation}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {revealed && lastAnswer && (
          <div
            className={cn(
              'animate-fade-in mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-[13.5px]',
              lastAnswer.correct ? 'border-success/30 bg-success-soft' : 'border-danger/30 bg-danger-soft',
            )}
            aria-live="polite"
          >
            {lastAnswer.correct ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <CircleX className="mt-0.5 size-4 shrink-0 text-danger" />
            )}
            <div className="text-fg">
              <strong className="font-semibold">
                {lastAnswer.correct ? '¡Correcto!' : 'No es correcto.'}
              </strong>{' '}
              <span className="text-fg-muted">
                {lastAnswer.correct
                  ? lastAnswer.confidence === 'guess'
                    ? 'Acertaste aunque dudabas: lee por qué es correcta para afianzarla.'
                    : 'Bien recordado.'
                  : 'La opción correcta está marcada en verde; compara su explicación con la de tu respuesta.'}
              </span>
              {!lastAnswer.correct && lastAnswer.confidence === 'sure' && (
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-fg-muted">
                  <Sparkles className="size-3.5 text-accent-text" />
                  Te equivocaste estando seguro: fíjate bien en esta explicación, la recordarás especialmente
                  bien.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
        <span className="hidden text-xs text-fg-faint sm:inline-flex sm:items-center sm:gap-1">
          <Kbd>1</Kbd>–<Kbd>4</Kbd> elegir · <Kbd>Intro</Kbd> {revealed ? 'siguiente' : 'comprobar'}
        </span>
        {revealed ? (
          <Button
            variant="primary"
            iconRight={<ArrowRight className="size-4" />}
            onClick={() => void next()}
            autoFocus
          >
            {index < questions.length - 1 ? 'Siguiente' : 'Ver resultado'}
          </Button>
        ) : askConfidence ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <span className="mr-1 text-xs text-fg-muted">¿Cuánta confianza tienes?</span>
            {(Object.keys(CONFIDENCE_META) as Confidence[]).map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === 'sure' ? 'primary' : 'secondary'}
                disabled={!selected}
                onClick={() => submit(c)}
                title={CONFIDENCE_META[c].hint}
              >
                {CONFIDENCE_META[c].label}
              </Button>
            ))}
          </div>
        ) : (
          <Button variant="primary" disabled={!selected} onClick={() => submit(null)}>
            Comprobar
          </Button>
        )}
      </div>
    </div>
  );
}
