import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CircleCheck,
  CircleHelp,
  Feather,
  Lightbulb,
  MessageCircleQuestion,
  TriangleAlert,
  Type,
} from 'lucide-react';
import type { AIService } from '@/ai/AIService';
import { courseBrief } from '@/ai/context';
import { describeError, isAbortError } from '@/ai/errors';
import { db } from '@/db/db';
import { recordFeynmanAttempt } from '@/db/repo';
import { FEYNMAN_VERDICT_META } from '@/domain/labels';
import type { Course, FeynmanAttempt, FeynmanEvaluation, LessonRef } from '@/domain/schemas';
import { formatRelative } from '@/lib/dates';
import { wordCount } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/forms';
import { Badge, Callout, ProgressBar, ProgressRing } from '../ui/primitives';

const RUBRIC: { key: keyof FeynmanEvaluation['rubric']; label: string; max: number }[] = [
  { key: 'accuracy', label: 'Exactitud', max: 40 },
  { key: 'completeness', label: 'Cobertura', max: 30 },
  { key: 'clarity', label: 'Claridad', max: 20 },
  { key: 'examples', label: 'Ejemplos', max: 10 },
];

function scoreTone(score: number): 'success' | 'accent' | 'warning' | 'danger' {
  if (score >= 90) return 'success';
  if (score >= 70) return 'accent';
  if (score >= 50) return 'warning';
  return 'danger';
}

function ListBlock({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  tone: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold', tone)}>
        {icon}
        {title}
      </div>
      <ul className="space-y-1 pl-5 text-[13.5px] text-fg-muted">
        {items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeynmanResult({ evaluation }: { evaluation: FeynmanEvaluation }) {
  const tone = scoreTone(evaluation.score);
  return (
    <div
      className="animate-fade-in space-y-5 rounded-xl border border-line bg-surface p-5"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <ProgressRing
          value={evaluation.score}
          size={64}
          stroke={5}
          tone={tone}
          label={`Puntuación ${evaluation.score} de 100`}
        >
          <span className="text-base font-semibold">{evaluation.score}</span>
        </ProgressRing>
        <div className="min-w-0">
          <Badge
            tone={
              tone === 'danger'
                ? 'danger'
                : tone === 'warning'
                  ? 'warning'
                  : tone === 'success'
                    ? 'success'
                    : 'accent'
            }
          >
            {FEYNMAN_VERDICT_META[evaluation.verdict].label}
          </Badge>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg">{evaluation.summary}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {RUBRIC.map((r) => (
          <div key={r.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-fg-muted">{r.label}</span>
              <span className="font-medium text-fg tabular-nums">
                {evaluation.rubric[r.key]}/{r.max}
              </span>
            </div>
            <ProgressBar value={(evaluation.rubric[r.key] / r.max) * 100} size="sm" label={r.label} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ListBlock
          title="Lo que entendiste bien"
          items={evaluation.strengths}
          icon={<CircleCheck className="size-3.5" />}
          tone="text-success"
        />
        <ListBlock
          title="Lo que faltó"
          items={evaluation.gaps}
          icon={<CircleHelp className="size-3.5" />}
          tone="text-warning"
        />
        <ListBlock
          title="Ideas imprecisas"
          items={evaluation.misconceptions}
          icon={<TriangleAlert className="size-3.5" />}
          tone="text-danger"
        />
        <ListBlock
          title="Jerga sin explicar"
          items={evaluation.jargon}
          icon={<Type className="size-3.5" />}
          tone="text-info"
        />
      </div>
      <ListBlock
        title="Para mejorar"
        items={evaluation.suggestions}
        icon={<Lightbulb className="size-3.5" />}
        tone="text-accent-text"
      />
      {evaluation.follow_up_question && (
        <div className="flex items-start gap-2.5 rounded-lg bg-accent-soft p-3 text-[13.5px]">
          <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-accent-text" />
          <div>
            <div className="font-medium text-fg">Pregunta para profundizar</div>
            <div className="mt-0.5 text-fg-muted">{evaluation.follow_up_question}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeynmanChallenge({
  ai,
  course,
  lesson,
  content,
}: {
  ai: AIService;
  course: Course;
  lesson: LessonRef;
  content: string;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof describeError> | null>(null);
  const [latest, setLatest] = useState<FeynmanAttempt | null>(null);
  const history = useLiveQuery(
    () =>
      db.feynmanAttempts
        .where('[course_id+lesson_id]')
        .equals([course.course_id, lesson.lesson_id])
        .reverse()
        .sortBy('created_at'),
    [course.course_id, lesson.lesson_id],
  );
  const words = wordCount(text);

  const evaluate = async () => {
    setBusy(true);
    setError(null);
    try {
      const evaluation = await ai.evaluateFeynman({
        course: courseBrief(course),
        lesson,
        content_markdown: content,
        explanation: text,
      });
      const attempt = await recordFeynmanAttempt({
        course_id: course.course_id,
        lesson_id: lesson.lesson_id,
        explanation: text,
        evaluation,
      });
      setLatest(attempt);
    } catch (e) {
      if (!isAbortError(e)) setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const previous = (history ?? []).filter((h) => h.id !== latest?.id);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text">
            <Feather className="size-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold">Explícalo con tus palabras</h3>
            <p className="mt-0.5 text-[13.5px] text-fg-muted">
              Sin mirar la lección, explica «{lesson.title}» como si se lo contaras a alguien de 12 años. Usa
              un ejemplo propio. Donde te atasques, ahí está lo que debes repasar.
            </p>
          </div>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="mt-4 text-[14.5px]"
          placeholder="Imagina que se lo explicas a un amigo…"
          aria-label="Tu explicación"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className={cn('text-xs', words >= 60 ? 'text-success' : 'text-fg-faint')}>
            {words} palabras {words < 60 && '· recomendado: 60-200'}
          </span>
          <Button variant="primary" onClick={() => void evaluate()} loading={busy} disabled={words < 5}>
            Evaluar mi explicación
          </Button>
        </div>
      </div>
      {error && (
        <Callout tone="danger" title={error.title}>
          {error.detail}
        </Callout>
      )}
      {latest && <FeynmanResult evaluation={latest.evaluation} />}
      {previous.length > 0 && (
        <details className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer text-[13px] font-medium text-fg-muted">
            Intentos anteriores ({previous.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {previous.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-center justify-between gap-3 border-t border-line pt-2 text-[13px]"
              >
                <span className="truncate text-fg-muted">{attempt.explanation.slice(0, 90)}…</span>
                <span className="shrink-0 text-xs text-fg-faint">
                  {attempt.evaluation.score}/100 · {formatRelative(attempt.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
