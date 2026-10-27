import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, CircleCheck, PenLine, Repeat, Shuffle } from 'lucide-react';
import { Page, PageHeader } from '@/components/layout/AppShell';
import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Select, Switch } from '@/components/ui/forms';
import { Badge, Card, EmptyState, Kbd, ProgressBar, Spinner } from '@/components/ui/primitives';
import { db } from '@/db/db';
import { reviewFlashcard } from '@/db/repo';
import { SRS_STATE_META } from '@/domain/labels';
import type { Course, Flashcard } from '@/domain/schemas';
import { previewIntervals, RATING_LABELS, type ReviewRating } from '@/domain/srs';
import { useCourses, useNow } from '@/hooks/useData';
import { formatInterval, formatRelative } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { useSettings } from '@/stores/settings';

const RATING_STYLES: Record<ReviewRating, string> = {
  1: 'border-danger/40 hover:bg-danger-soft',
  2: 'border-warning/40 hover:bg-warning-soft',
  3: 'border-success/40 hover:bg-success-soft',
  4: 'border-info/40 hover:bg-info-soft',
};

/** Requeue en la misma sesión si el próximo repaso cae en menos de 20 minutos. */
const SAME_SESSION_MS = 20 * 60 * 1000;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function buildQueue(courseId: string | null, newLimit: number): Promise<Flashcard[]> {
  const now = Date.now();
  const due = (await db.flashcards.where('srs.due').belowOrEqual(now).toArray()).filter(
    (c) => !c.suspended && (!courseId || c.course_id === courseId),
  );
  const reviews = due.filter((c) => c.srs.state !== 0);
  const fresh = due
    .filter((c) => c.srs.state === 0)
    .sort((a, b) => a.created_at - b.created_at)
    .slice(0, newLimit);
  // Intercalado: mezclamos tarjetas de distintas rutas y conceptos.
  return shuffle([...reviews, ...fresh]);
}

interface SessionStats {
  reviewed: number;
  good: number;
  /** Tiempo dedicado (suma de lo que tardaste en cada tarjeta). */
  timeMs: number;
}

const EMPTY_STATS: SessionStats = { reviewed: 0, good: 0, timeMs: 0 };

export default function Review() {
  const [params, setParams] = useSearchParams();
  const courseFilter = params.get('course');
  const courses = useCourses();
  const retention = useSettings((s) => s.desiredRetention);
  const newLimit = useSettings((s) => s.newCardsPerSession);
  const courseById = useMemo(
    () => new Map((courses ?? []).map((c) => [c.course_id, c] as [string, Course])),
    [courses],
  );

  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [typeAnswer, setTypeAnswer] = useState(false);
  const [typed, setTyped] = useState('');
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const shownAt = useRef(0);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(0);
  const now = useNow(30_000);

  const nextDue = useLiveQuery(async () => {
    const upcoming = await db.flashcards
      .orderBy('srs.due')
      .filter((c) => !c.suspended && (!courseFilter || c.course_id === courseFilter))
      .first();
    return upcoming?.srs.due ?? null;
  }, [courseFilter, queue?.length]);

  // Nueva sesión al entrar, al cambiar de filtro o al pedir más tarjetas.
  useEffect(() => {
    let cancelled = false;
    void buildQueue(courseFilter, newLimit).then((q) => {
      if (cancelled) return;
      setQueue(q);
      setRevealed(false);
      setTyped('');
      setStats(EMPTY_STATS);
      shownAt.current = performance.now();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el límite de nuevas se aplica en la próxima sesión
  }, [courseFilter, session]);

  const card = queue?.[0] ?? null;
  const intervals = useMemo(
    () => (card ? previewIntervals(card.srs, now, retention) : null),
    [card, now, retention],
  );

  const rate = async (rating: ReviewRating) => {
    if (!card || !revealed || busy) return;
    setBusy(true);
    try {
      const durationMs = Math.round(performance.now() - shownAt.current);
      const updatedSrs = await reviewFlashcard(card, rating, { durationMs, retention });
      const updated: Flashcard = { ...card, srs: updatedSrs };
      setQueue((q) => {
        if (!q) return q;
        const rest = q.slice(1);
        return updatedSrs.due - Date.now() < SAME_SESSION_MS ? [...rest, updated] : rest;
      });
      setStats((s) => ({
        reviewed: s.reviewed + 1,
        good: s.good + (rating >= 3 ? 1 : 0),
        timeMs: s.timeMs + Math.min(durationMs, 5 * 60_000),
      }));
      setRevealed(false);
      setTyped('');
      shownAt.current = performance.now();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (!card) return;
      if (!revealed && (e.key === ' ' || (e.key === 'Enter' && !typing))) {
        if (typing && e.key === ' ') return;
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && !typing && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        void rate(Number(e.key) as ReviewRating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const total = (queue?.length ?? 0) + stats.reviewed;
  const course = card ? courseById.get(card.course_id) : undefined;

  return (
    <Page>
      <PageHeader
        title="Repaso espaciado"
        description="Recuerda antes de mirar. Cada tarjeta vuelve justo cuando estás a punto de olvidarla."
        actions={
          <div className="w-60">
            <Select
              aria-label="Filtrar por ruta"
              value={courseFilter ?? ''}
              onChange={(e) => setParams(e.target.value ? { course: e.target.value } : {})}
            >
              <option value="">Todas las rutas (intercalado)</option>
              {(courses ?? []).map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {queue === null ? (
        <Spinner label="Preparando tu sesión…" />
      ) : !card ? (
        <Card>
          {stats.reviewed > 0 ? (
            <EmptyState
              icon={<CircleCheck className="size-5 text-success" />}
              title="¡Sesión completada!"
              description={`Has repasado ${stats.reviewed} ${stats.reviewed === 1 ? 'tarjeta' : 'tarjetas'} en ${Math.max(1, Math.round(stats.timeMs / 60000))} min. Recordaste bien el ${Math.round((stats.good / stats.reviewed) * 100)} %.${nextDue ? ` Próximo repaso ${formatRelative(nextDue)}.` : ''}`}
              action={
                <div className="flex gap-2">
                  <Link to="/">
                    <Button variant="secondary">Volver al inicio</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    icon={<Repeat className="size-4" />}
                    onClick={() => setSession((n) => n + 1)}
                  >
                    Buscar más
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title="¡Todo al día!"
              description={
                nextDue
                  ? `No tienes tarjetas pendientes. La próxima vence ${formatRelative(nextDue)}.`
                  : 'Aún no tienes tarjetas. Aprueba el quiz de una lección y sus conceptos clave se añadirán aquí.'
              }
              action={
                <Link to="/">
                  <Button variant="secondary">Ir a mis rutas</Button>
                </Link>
              }
            />
          )}
        </Card>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Shuffle className="size-3.5" /> {queue.length}{' '}
              {queue.length === 1 ? 'pendiente' : 'pendientes'} · {stats.reviewed} repasadas
            </span>
            <Switch
              checked={typeAnswer}
              onChange={setTypeAnswer}
              label={
                <span className="inline-flex items-center gap-1 text-xs">
                  <PenLine className="size-3.5" /> Escribir respuesta
                </span>
              }
            />
          </div>
          <ProgressBar
            value={total ? (stats.reviewed / total) * 100 : 0}
            size="sm"
            className="mb-5"
            label="Progreso de la sesión"
          />

          <Card className="animate-fade-in overflow-hidden" key={card.id + card.srs.reps}>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-5 py-3">
              {course && (
                <Link
                  to={`/course/${course.course_id}`}
                  className="truncate text-xs text-fg-muted hover:text-fg"
                >
                  {course.title}
                </Link>
              )}
              <span className="ml-auto flex gap-1.5">
                {card.concept && <Badge>{card.concept}</Badge>}
                <Badge tone={card.srs.state === 0 ? 'accent' : card.srs.state === 3 ? 'warning' : 'neutral'}>
                  {SRS_STATE_META[card.srs.state].label}
                </Badge>
              </span>
            </div>
            <div className="px-6 py-8">
              <div className="text-center text-[17px] font-medium">
                <Markdown content={card.front} className="mx-auto [&_p]:my-1" />
              </div>
              {typeAnswer && !revealed && (
                <textarea
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Escribe lo que recuerdes y pulsa «Mostrar respuesta»…"
                  aria-label="Tu respuesta"
                  className="mt-6 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none"
                />
              )}
              {revealed && (
                <div className="animate-fade-in mt-6 border-t border-line pt-6">
                  {typeAnswer && typed.trim() && (
                    <div className="mb-4 rounded-lg bg-surface-2 p-3 text-[13.5px]">
                      <div className="text-xs font-medium text-fg-muted">Tu respuesta</div>
                      <div className="mt-1 whitespace-pre-wrap text-fg">{typed}</div>
                    </div>
                  )}
                  <div className="text-[15px] text-fg">
                    <Markdown content={card.back} className="mx-auto [&_p]:my-1" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-line bg-surface-2/50 px-5 py-4">
              {!revealed ? (
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => setRevealed(true)}
                  >
                    Mostrar respuesta
                  </Button>
                  <span className="hidden text-xs text-fg-faint sm:block">
                    <Kbd>Espacio</Kbd> para mostrar
                  </span>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-center text-xs text-fg-muted">
                    ¿Qué tal lo recordaste? Sé sincero: así el algoritmo acierta.
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([1, 2, 3, 4] as ReviewRating[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={busy}
                        onClick={() => void rate(r)}
                        className={cn(
                          'rounded-xl border bg-surface px-3 py-2.5 text-center transition-colors disabled:opacity-60',
                          RATING_STYLES[r],
                        )}
                      >
                        <div className="text-sm font-medium text-fg">{RATING_LABELS[r]}</div>
                        <div className="mt-0.5 text-xs text-fg-muted">
                          {intervals ? formatInterval(intervals[r]) : ''} ·{' '}
                          <span className="font-mono">{r}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
