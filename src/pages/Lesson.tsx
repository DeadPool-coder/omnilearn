import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock,
  Ellipsis,
  Feather,
  Layers,
  ListChecks,
  Lock,
  PanelLeftOpen,
  RefreshCw,
  Send,
  Square,
  X,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { assessmentSizes } from '@/ai/AIService';
import { courseBrief, lessonInput } from '@/ai/context';
import { describeError, isAbortError } from '@/ai/errors';
import { CourseOutline, LessonStatusIcon } from '@/components/course/CourseOutline';
import { ExpansionCard } from '@/components/lesson/ExpansionCard';
import { EXPANSION_ICONS } from '@/components/lesson/expansionIcons';
import { FeynmanChallenge } from '@/components/lesson/FeynmanChallenge';
import { LessonFlashcards } from '@/components/lesson/LessonFlashcards';
import { QuizRunner, type QuizResult } from '@/components/lesson/QuizRunner';
import { SelectionToolbar } from '@/components/lesson/SelectionToolbar';
import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/overlays';
import { useConfirm } from '@/components/ui/useConfirm';
import { Badge, Callout, EmptyState, Spinner } from '@/components/ui/primitives';
import { db } from '@/db/db';
import {
  addExpansion,
  addFlashcards,
  recordQuizAttempt,
  removeExpansion,
  saveLessonContent,
  saveQuiz,
  setLessonStatus,
  touchCourse,
  updateCourse,
} from '@/db/repo';
import { sampleFlashcards } from '@/db/seed';
import { EXPANSION_META, LESSON_STATUS_META } from '@/domain/labels';
import { displayStatus, findLesson } from '@/domain/progress';
import type { Course, ExpansionKind, LessonContent, LessonRef } from '@/domain/schemas';
import { weakConcepts } from '@/domain/stats';
import { useAI } from '@/hooks/useAI';
import { useCourse, useLessonContent } from '@/hooks/useData';
import { useStreamText } from '@/hooks/useStreamText';
import { cn } from '@/lib/cn';
import { uid } from '@/lib/id';
import { useSettings } from '@/stores/settings';

type ErrorInfo = ReturnType<typeof describeError>;

interface PendingExpansion {
  id: string;
  kind: ExpansionKind;
  selection: string;
  question: string;
  text: string;
  error: string | null;
}

const SECTIONS = [
  { id: 'leccion', label: 'Lección', icon: <BookOpen className="size-3.5" /> },
  { id: 'quiz', label: 'Quiz', icon: <ListChecks className="size-3.5" /> },
  { id: 'tarjetas', label: 'Tarjetas', icon: <Layers className="size-3.5" /> },
  { id: 'feynman', label: 'Feynman', icon: <Feather className="size-3.5" /> },
];

function lessonPlain(lesson: LessonRef) {
  return {
    lesson_id: lesson.lesson_id,
    title: lesson.title,
    objective: lesson.objective,
    key_concepts: lesson.key_concepts,
    estimated_minutes: lesson.estimated_minutes,
  };
}

function SectionHeading({
  id,
  step,
  title,
  done,
  children,
}: {
  id: string;
  step: number;
  title: string;
  done?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-4 scroll-mt-28 border-t border-line pt-10">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid size-6 place-items-center rounded-full text-xs font-semibold',
            done ? 'bg-success text-white' : 'bg-surface-3 text-fg-muted',
          )}
        >
          {done ? <CircleCheck className="size-3.5" /> : step}
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children && <div className="mt-1.5 pl-[34px] text-[13.5px] text-fg-muted">{children}</div>}
    </div>
  );
}

export default function LessonPage() {
  const { courseId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const course = useCourse(courseId);
  const content = useLessonContent(courseId, lessonId);
  const { ai, ready, isDemo, meta } = useAI();
  const passThreshold = useSettings((s) => s.quizPassThreshold);
  const askConfidence = useSettings((s) => s.askConfidence);
  const errorsToCards = useSettings((s) => s.errorsToCards);
  const [confirm, confirmDialog] = useConfirm();

  const location = course ? findLesson(course, lessonId) : null;
  const status = course && location ? displayStatus(course, lessonId) : 'pending';
  const locked = status === 'locked';

  // Referencias "vivas" para usar dentro de tareas asíncronas sin cierres obsoletos.
  const courseRef = useRef<Course | null>(null);
  courseRef.current = course ?? null;
  const contentRef = useRef<LessonContent | null>(null);
  contentRef.current = content ?? null;

  const [outlineOpen, setOutlineOpen] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);
  const expansionsRef = useRef<HTMLDivElement>(null);

  // --- Generación de la lección -------------------------------------------
  const { text: streamText, push: pushStream, reset: resetStream } = useStreamText();
  const [genState, setGenState] = useState<'idle' | 'streaming' | 'error'>('idle');
  const [genError, setGenError] = useState<ErrorInfo | null>(null);
  const runRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // --- Quiz -----------------------------------------------------------------
  const [quizState, setQuizState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [quizError, setQuizError] = useState<ErrorInfo | null>(null);
  const [attemptSeed, setAttemptSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const quizAutoFor = useRef<string | null>(null);

  // --- Tarjetas y expansiones ----------------------------------------------
  const [cardsState, setCardsState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pending, setPending] = useState<PendingExpansion | null>(null);
  const [question, setQuestion] = useState('');
  const [askAbout, setAskAbout] = useState('');
  const questionRef = useRef<HTMLInputElement>(null);
  const expansionAbort = useRef<AbortController | null>(null);

  const attempts = useLiveQuery(
    () => db.quizAttempts.where('[course_id+lesson_id]').equals([courseId, lessonId]).toArray(),
    [courseId, lessonId],
  );
  const passedBefore = (attempts ?? []).some((a) => a.passed) || location?.lesson.status === 'completed';
  const feynmanCount =
    useLiveQuery(
      () => db.feynmanAttempts.where('[course_id+lesson_id]').equals([courseId, lessonId]).count(),
      [courseId, lessonId],
    ) ?? 0;

  // Marcar la lección como "en curso" al abrirla.
  useEffect(() => {
    if (!courseRef.current || !location || locked) return;
    if (location.lesson.status === 'pending') void setLessonStatus(courseId, lessonId, 'in_progress');
    else void touchCourse(courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de lección o desbloquearse
  }, [courseId, lessonId, locked, !!location]);

  // Al cambiar de lección: cancelar lo pendiente y reiniciar estados locales.
  useEffect(() => {
    setGenState('idle');
    setGenError(null);
    setQuizState('idle');
    setQuizError(null);
    setCardsState('idle');
    setPending(null);
    setQuestion('');
    setAskAbout('');
    quizAutoFor.current = null;
    resetStream();
    return () => {
      abortRef.current?.abort();
      expansionAbort.current?.abort();
    };
  }, [courseId, lessonId, resetStream]);

  const generateQuiz = useCallback(
    async (markdown?: string) => {
      const c = courseRef.current;
      const md = markdown ?? contentRef.current?.content_markdown;
      const loc = c ? findLesson(c, lessonId) : null;
      if (!c || !md || !loc) return;
      setQuizState('loading');
      setQuizError(null);
      try {
        const quiz = await ai.generateQuiz({
          course: courseBrief(c),
          lesson: lessonPlain(loc.lesson),
          content_markdown: md,
          count: assessmentSizes(c).quiz,
        });
        await saveQuiz(c.course_id, lessonId, quiz);
        setAttemptSeed((s) => s + 1);
        setQuizState('idle');
      } catch (e) {
        if (isAbortError(e)) return setQuizState('idle');
        setQuizState('error');
        setQuizError(describeError(e));
      }
    },
    [ai, lessonId],
  );

  const generateLesson = useCallback(
    async (signal: AbortSignal) => {
      const c = courseRef.current;
      if (!c) return;
      const run = ++runRef.current;
      setGenState('streaming');
      setGenError(null);
      resetStream();
      try {
        const attemptsForCourse = await db.quizAttempts.where('course_id').equals(c.course_id).toArray();
        const input = lessonInput(
          c,
          lessonId,
          weakConcepts(attemptsForCourse.filter((a) => a.lesson_id !== lessonId)),
        );
        if (!input) return;
        const markdown = await ai.streamLesson(
          input,
          (_delta, full) => run === runRef.current && pushStream(full),
          signal,
        );
        if (run !== runRef.current) return;
        await saveLessonContent(c.course_id, lessonId, markdown, ai.generator);
        setGenState('idle');
        resetStream();
        quizAutoFor.current = `${c.course_id}:${lessonId}`;
        void generateQuiz(markdown);
      } catch (e) {
        if (run !== runRef.current) return;
        if (isAbortError(e)) {
          setGenState('idle');
          return;
        }
        setGenState('error');
        setGenError(describeError(e));
      }
    },
    [ai, lessonId, pushStream, resetStream, generateQuiz],
  );

  const startGeneration = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    void generateLesson(controller.signal);
    return controller;
  }, [generateLesson]);

  // Generación automática "justo a tiempo" al abrir una lección sin contenido.
  const needsContent = content === null && !!course && !!location && !locked && ready;
  useEffect(() => {
    if (!needsContent) return;
    const controller = startGeneration();
    return () => controller.abort();
  }, [needsContent, startGeneration]);

  // Si hay contenido pero no quiz (p. ej. falló antes), generarlo una vez.
  useEffect(() => {
    if (!content || content.quiz || locked || !ready || genState === 'streaming') return;
    const key = `${courseId}:${lessonId}`;
    if (quizAutoFor.current === key) return;
    quizAutoFor.current = key;
    void generateQuiz();
  }, [content, courseId, lessonId, locked, ready, genState, generateQuiz]);

  const regenerateLesson = async () => {
    const ok = await confirm({
      title: '¿Regenerar la lección?',
      description: 'Se reescribirá el contenido y su quiz. Tus tarjetas y tu progreso se conservan.',
      confirmLabel: 'Regenerar',
    });
    if (ok) startGeneration();
  };

  // --- Tarjetas al aprobar ---------------------------------------------------
  const generateFlashcards = useCallback(async () => {
    const c = courseRef.current;
    const lesson = contentRef.current;
    const loc = c ? findLesson(c, lessonId) : null;
    if (!c || !lesson || !loc) return;
    setCardsState('loading');
    try {
      const drafts =
        c.source === 'sample'
          ? await sampleFlashcards(lessonId)
          : await ai.generateFlashcards({
              course: courseBrief(c),
              lesson: lessonPlain(loc.lesson),
              content_markdown: lesson.content_markdown,
              count: assessmentSizes(c).cards,
            });
      await addFlashcards(drafts, {
        courseId: c.course_id,
        lessonId,
        source: c.source === 'sample' ? 'sample' : 'ai',
      });
      setCardsState('idle');
    } catch (e) {
      setCardsState('error');
      toast.error(describeError(e).title);
    }
  }, [ai, lessonId]);

  const onQuizFinish = async (result: QuizResult) => {
    const c = courseRef.current;
    const quiz = contentRef.current?.quiz;
    if (!c || !quiz) return;
    const { becameComplete, errorCards } = await recordQuizAttempt(
      {
        course_id: c.course_id,
        lesson_id: lessonId,
        answers: result.answers,
        score: result.score,
        passed: result.passed,
      },
      { quiz, errorsToCards },
    );
    if (errorCards.length)
      toast.info(
        `${errorCards.length === 1 ? '1 pregunta fallada' : `${errorCards.length} preguntas falladas`} → tarjetas de repaso`,
      );
    if (result.passed) {
      toast.success('¡Lección completada!');
      if (!contentRef.current?.flashcards_generated) void generateFlashcards();
      if (becameComplete)
        toast.success('🎉 ¡Has completado toda la ruta! Mantén vivo lo aprendido con el repaso diario.');
    }
  };

  // --- Acciones rápidas (expansiones) ----------------------------------------
  const runExpansion = async (kind: ExpansionKind, selection = '', q = '') => {
    const c = courseRef.current;
    const lesson = contentRef.current;
    const loc = c ? findLesson(c, lessonId) : null;
    if (!c || !lesson || !loc) return;
    expansionAbort.current?.abort();
    const controller = new AbortController();
    expansionAbort.current = controller;
    const id = uid();
    setPending({ id, kind, selection, question: q, text: '', error: null });
    requestAnimationFrame(() => expansionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    try {
      const markdown = await ai.streamExpansion(
        {
          course: courseBrief(c),
          lesson: lessonPlain(loc.lesson),
          content_markdown: lesson.content_markdown,
          kind,
          selection,
          question: q,
        },
        (_d, full) => setPending((p) => (p && p.id === id ? { ...p, text: full } : p)),
        controller.signal,
      );
      await addExpansion(c.course_id, lessonId, {
        id,
        kind,
        selection,
        question: q,
        content_markdown: markdown,
        created_at: Date.now(),
      });
      setPending((p) => (p && p.id === id ? null : p));
    } catch (e) {
      if (isAbortError(e)) return setPending(null);
      setPending((p) => (p && p.id === id ? { ...p, error: describeError(e).title } : p));
    }
  };

  const onSelectionAction = (kind: ExpansionKind, selection: string) => {
    if (kind === 'question') {
      setAskAbout(selection);
      requestAnimationFrame(() => questionRef.current?.focus());
      return;
    }
    void runExpansion(kind, selection);
  };

  const askTutor = () => {
    if (!question.trim()) return;
    void runExpansion('question', askAbout, question.trim());
    setQuestion('');
    setAskAbout('');
  };

  // --- Render ---------------------------------------------------------------
  if (course === undefined) return <Spinner className="m-10" label="Cargando lección…" />;
  if (course === null || !location) {
    return (
      <EmptyState
        className="mt-10"
        title="No encontramos esta lección"
        action={
          <Link to="/">
            <Button variant="secondary">Volver al inicio</Button>
          </Link>
        }
      />
    );
  }

  const { lesson, module, prev, next, index, total } = location;
  const nextStatus = next ? displayStatus(course, next.lesson.lesson_id) : null;
  const streaming = genState === 'streaming';
  const markdown = streaming ? streamText : (content?.content_markdown ?? '');
  const hasContent = !!content && !streaming;
  const quiz = content?.quiz ?? null;
  const flashcardsReady = !!content?.flashcards_generated;
  const feynmanDone = feynmanCount > 0;

  const stepDone: Record<string, boolean> = {
    leccion: hasContent,
    quiz: passedBefore,
    tarjetas: flashcardsReady,
    feynman: feynmanDone,
  };

  return (
    <div className="flex min-h-dvh">
      {confirmDialog}
      {/* Temario lateral */}
      <aside className="sticky top-0 hidden h-dvh w-[288px] shrink-0 border-r border-line bg-surface xl:block">
        <CourseOutline course={course} activeLessonId={lessonId} />
      </aside>
      {outlineOpen && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="Temario">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOutlineOpen(false)} />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-[300px] max-w-[85vw] border-r border-line bg-surface">
            <button
              type="button"
              onClick={() => setOutlineOpen(false)}
              className="absolute top-3 right-3 z-10 rounded-lg p-1.5 text-fg-muted hover:bg-surface-2"
              aria-label="Cerrar temario"
            >
              <X className="size-4" />
            </button>
            <CourseOutline
              course={course}
              activeLessonId={lessonId}
              onNavigate={() => setOutlineOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Barra superior de la lección */}
        <div className="sticky top-14 z-20 border-b border-line bg-canvas/90 backdrop-blur lg:top-0">
          <div className="mx-auto flex h-12 max-w-[820px] items-center gap-2 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOutlineOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg xl:hidden"
            >
              <PanelLeftOpen className="size-4" /> Temario
            </button>
            <Link
              to={`/course/${course.course_id}`}
              className="hidden min-w-0 truncate text-[13px] text-fg-muted hover:text-fg xl:block"
            >
              {course.title}
            </Link>
            <nav className="ml-auto flex items-center gap-0.5" aria-label="Secciones de la lección">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-surface-2',
                    stepDone[s.id] ? 'text-success' : 'text-fg-muted',
                  )}
                >
                  {stepDone[s.id] ? <CircleCheck className="size-3.5" /> : s.icon}
                  <span className="hidden sm:inline">{s.label}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-[820px] px-4 pt-8 pb-24 sm:px-6">
          {/* Cabecera */}
          <header id="leccion" className="scroll-mt-28">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-fg-muted">
              <span>
                Módulo {module.module_id} · Lección {lesson.lesson_id} de {total}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {lesson.estimated_minutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <LessonStatusIcon status={status} className="size-3.5" /> {LESSON_STATUS_META[status].label}
              </span>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-[30px]">
                {lesson.title}
              </h1>
              {hasContent && !locked && course.source !== 'sample' && (
                <Menu
                  trigger={(props) => (
                    <button
                      {...props}
                      type="button"
                      className="mt-1 rounded-md p-1.5 text-fg-faint hover:bg-surface-2 hover:text-fg"
                      aria-label="Opciones de la lección"
                    >
                      <Ellipsis className="size-4" />
                    </button>
                  )}
                  items={[
                    {
                      label: 'Regenerar lección',
                      icon: <RefreshCw />,
                      onSelect: () => void regenerateLesson(),
                    },
                  ]}
                />
              )}
            </div>
            <p className="mt-2 text-[15px] text-fg-muted">{lesson.objective}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lesson.key_concepts.map((k) => (
                <Badge key={k} tone="accent">
                  {k}
                </Badge>
              ))}
            </div>
          </header>

          {/* Contenido */}
          <div className="mt-8">
            {locked ? (
              <div className="rounded-xl border border-line bg-surface p-8 text-center">
                <Lock className="mx-auto size-6 text-fg-faint" />
                <h2 className="mt-3 text-base font-semibold">Lección bloqueada</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">
                  Aprueba el quiz de «{prev?.lesson.title}» para desbloquearla. Así cada idea se apoya en una
                  base sólida (aprendizaje por dominio).
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {prev && (
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/course/${course.course_id}/lesson/${prev.lesson.lesson_id}`)}
                    >
                      Ir a la lección anterior
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await updateCourse(course.course_id, { sequential: false });
                      toast.success('Desbloqueo progresivo desactivado para esta ruta');
                    }}
                  >
                    Desbloquear todas
                  </Button>
                </div>
              </div>
            ) : !content && !streaming && !ready ? (
              <Callout
                tone="warning"
                title={`Falta configurar ${meta.label}`}
                action={
                  <Link to="/settings">
                    <Button size="sm" variant="secondary">
                      Ir a Ajustes
                    </Button>
                  </Link>
                }
              >
                Para redactar esta lección necesito un proveedor de IA. También puedes usar el modo Demo.
              </Callout>
            ) : genState === 'error' && genError ? (
              <Callout
                tone="danger"
                title={genError.title}
                action={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RefreshCw className="size-3.5" />}
                      onClick={() => startGeneration()}
                    >
                      Reintentar
                    </Button>
                    {(genError.code === 'auth' ||
                      genError.code === 'bad_request' ||
                      genError.code === 'not_configured') && (
                      <Link to="/settings">
                        <Button size="sm" variant="ghost">
                          Revisar ajustes
                        </Button>
                      </Link>
                    )}
                  </div>
                }
              >
                {genError.detail}
              </Callout>
            ) : !markdown ? (
              <div className="space-y-3" aria-label="Preparando la lección">
                <Spinner label={streaming ? 'Redactando tu lección a medida…' : 'Cargando…'} />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-11/12" />
                <div className="skeleton h-4 w-9/12" />
              </div>
            ) : (
              <>
                {streaming && (
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent-line/60 bg-accent-soft px-3 py-2 text-[13px]">
                    <Spinner label={`Redactando con ${isDemo ? 'plantillas (demo)' : meta.label}…`} />
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={<Square className="size-3" />}
                      onClick={() => abortRef.current?.abort()}
                    >
                      Detener
                    </Button>
                  </div>
                )}
                <div ref={articleRef} className={cn(streaming && 'stream-caret')}>
                  <Markdown content={markdown} streaming={streaming} />
                </div>
                {hasContent && (
                  <SelectionToolbar
                    containerRef={articleRef}
                    onAction={onSelectionAction}
                    disabled={!!pending && !pending.error}
                  />
                )}
              </>
            )}
          </div>

          {/* Acciones rápidas y tutor */}
          {hasContent && (
            <section
              className="mt-10 rounded-xl border border-line bg-surface p-4"
              aria-label="Acciones rápidas"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[13px] font-medium text-fg-muted">¿No te ha quedado claro?</span>
                {(['simpler', 'example', 'deeper'] as const).map((kind) => (
                  <Button
                    key={kind}
                    size="sm"
                    variant="secondary"
                    icon={EXPANSION_ICONS[kind]}
                    disabled={!!pending && !pending.error}
                    onClick={() => void runExpansion(kind)}
                  >
                    {EXPANSION_META[kind].action}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-fg-faint">
                Consejo: selecciona cualquier fragmento del texto para aplicar estas acciones solo a esa
                parte.
              </p>
              <form
                className="mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  askTutor();
                }}
              >
                {askAbout && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg-muted">
                    <span className="min-w-0 flex-1 truncate">Sobre: «{askAbout}»</span>
                    <button
                      type="button"
                      onClick={() => setAskAbout('')}
                      aria-label="Quitar fragmento"
                      className="text-fg-faint hover:text-fg"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={questionRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Pregunta al tutor sobre esta lección…"
                    aria-label="Pregunta al tutor"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    icon={<Send className="size-4" />}
                    disabled={!question.trim() || (!!pending && !pending.error)}
                  >
                    <span className="hidden sm:inline">Preguntar</span>
                  </Button>
                </div>
              </form>
            </section>
          )}

          {/* Expansiones guardadas + la que está en curso */}
          {(content?.expansions.length || pending) && (
            <div ref={expansionsRef} className="mt-6 space-y-3">
              {content?.expansions.map((exp) => (
                <ExpansionCard
                  key={exp.id}
                  kind={exp.kind}
                  selection={exp.selection}
                  question={exp.question}
                  content={exp.content_markdown}
                  onRemove={() => void removeExpansion(course.course_id, lessonId, exp.id)}
                />
              ))}
              {pending && (
                <ExpansionCard
                  kind={pending.kind}
                  selection={pending.selection}
                  question={pending.question}
                  content={pending.text}
                  streaming={!pending.error}
                  error={pending.error}
                  onRemove={() => setPending(null)}
                  onRetry={() => void runExpansion(pending.kind, pending.selection, pending.question)}
                />
              )}
            </div>
          )}

          {/* Quiz */}
          {hasContent && (
            <section className="mt-12" aria-label="Comprueba tu comprensión">
              <SectionHeading id="quiz" step={2} title="Comprueba tu comprensión" done={passedBefore}>
                Recuperar lo aprendido lo fija mucho mejor que releerlo. Necesitas un{' '}
                {Math.round(passThreshold * 100)} % para completar la lección.
              </SectionHeading>
              {quiz ? (
                <QuizRunner
                  key={`${quiz.generated_at}-${attemptSeed}`}
                  quiz={quiz}
                  attemptSeed={attemptSeed}
                  askConfidence={askConfidence}
                  passThreshold={passThreshold}
                  onFinish={onQuizFinish}
                  onRetry={() => setAttemptSeed((s) => s + 1)}
                  onNewQuestions={() => void generateQuiz()}
                  regenerating={quizState === 'loading'}
                  onContinue={() =>
                    document.getElementById('tarjetas')?.scrollIntoView({ behavior: 'smooth' })
                  }
                />
              ) : quizState === 'error' && quizError ? (
                <Callout
                  tone="danger"
                  title={quizError.title}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RefreshCw className="size-3.5" />}
                      onClick={() => void generateQuiz()}
                    >
                      Reintentar
                    </Button>
                  }
                >
                  {quizError.detail}
                </Callout>
              ) : (
                <div className="rounded-xl border border-line bg-surface p-5">
                  <Spinner label="Preparando preguntas a partir de la lección…" />
                </div>
              )}
            </section>
          )}

          {/* Tarjetas */}
          {hasContent && (
            <section className="mt-4" aria-label="Tarjetas de repaso">
              <SectionHeading id="tarjetas" step={3} title="Tarjetas de repaso" done={flashcardsReady} />
              {passedBefore || flashcardsReady ? (
                <>
                  <LessonFlashcards
                    courseId={course.course_id}
                    lessonId={lessonId}
                    generating={cardsState === 'loading'}
                  />
                  {passedBefore && !flashcardsReady && cardsState !== 'loading' && (
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="secondary"
                      onClick={() => void generateFlashcards()}
                    >
                      Generar tarjetas de esta lección
                    </Button>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-line p-4 text-[13.5px] text-fg-muted">
                  Al aprobar el quiz, los conceptos clave se convertirán en tarjetas de repaso espaciado.
                </p>
              )}
            </section>
          )}

          {/* Desafío Feynman */}
          {hasContent && content && (
            <section className="mt-4" aria-label="Desafío Feynman">
              <SectionHeading id="feynman" step={4} title="Desafío Feynman (opcional)" done={feynmanDone}>
                Si puedes explicarlo con sencillez, lo has entendido. Recibirás una evaluación de lo que
                dominas y lo que falta.
              </SectionHeading>
              <FeynmanChallenge ai={ai} course={course} lesson={lesson} content={content.content_markdown} />
            </section>
          )}

          {/* Navegación */}
          <nav
            className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2"
            aria-label="Navegación entre lecciones"
          >
            {prev ? (
              <Link
                to={`/course/${course.course_id}/lesson/${prev.lesson.lesson_id}`}
                className="group rounded-xl border border-line p-4 transition-colors hover:border-line-strong"
              >
                <div className="flex items-center gap-1 text-xs text-fg-muted">
                  <ArrowLeft className="size-3.5" /> Anterior
                </div>
                <div className="mt-1 truncate text-sm font-medium">{prev.lesson.title}</div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              nextStatus === 'locked' ? (
                <div
                  className="rounded-xl border border-dashed border-line p-4 text-right"
                  title="Aprueba el quiz para desbloquearla"
                >
                  <div className="flex items-center justify-end gap-1 text-xs text-fg-faint">
                    Siguiente <Lock className="size-3.5" />
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-fg-faint">{next.lesson.title}</div>
                </div>
              ) : (
                <Link
                  to={`/course/${course.course_id}/lesson/${next.lesson.lesson_id}`}
                  className="group rounded-xl border border-line p-4 text-right transition-colors hover:border-accent-line"
                >
                  <div className="flex items-center justify-end gap-1 text-xs text-fg-muted">
                    Siguiente <ArrowRight className="size-3.5" />
                  </div>
                  <div className="mt-1 truncate text-sm font-medium">{next.lesson.title}</div>
                </Link>
              )
            ) : (
              <Link
                to={`/course/${course.course_id}`}
                className="rounded-xl border border-line p-4 text-right transition-colors hover:border-line-strong"
              >
                <div className="text-xs text-fg-muted">Fin de la ruta</div>
                <div className="mt-1 text-sm font-medium">Ver resumen de la ruta</div>
              </Link>
            )}
          </nav>
          <p className="mt-4 text-center text-xs text-fg-faint">
            Lección {index + 1} de {total}
          </p>
        </div>
      </div>
    </div>
  );
}
