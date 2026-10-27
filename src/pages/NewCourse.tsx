import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Braces,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Footprints,
  GraduationCap,
  Hammer,
  Hourglass,
  Lightbulb,
  Mountain,
  RefreshCw,
  Rocket,
  Sparkles,
  Sprout,
  Target,
  Timer,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { AIService } from '@/ai/AIService';
import { describeError, isAbortError } from '@/ai/errors';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Field, OptionCards, Switch, Textarea, type OptionItem } from '@/components/ui/forms';
import { Badge, Callout, Card } from '@/components/ui/primitives';
import { saveNewCourse } from '@/db/repo';
import { toContract } from '@/domain/contract';
import { FOCUS_META, LEVEL_META, TIME_META } from '@/domain/labels';
import { courseProgress } from '@/domain/progress';
import type { Course, Focus, Level, TimeBudget } from '@/domain/schemas';
import { useAI } from '@/hooks/useAI';
import { formatMinutes } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { downloadJson, slugify } from '@/lib/text';
import { useSettings } from '@/stores/settings';

const SUGGESTIONS = [
  'Física cuántica',
  'Optimización de consultas SQL',
  'Historia de Roma',
  'Acordes de guitarra',
  'Cálculo diferencial',
  'Termodinámica para ingeniería',
  'Finanzas personales',
  'Machine learning desde cero',
];

const LEVEL_ICONS: Record<Level, React.ReactNode> = {
  beginner: <Sprout className="size-4" />,
  basic: <Footprints className="size-4" />,
  intermediate: <Mountain className="size-4" />,
  advanced: <Rocket className="size-4" />,
};
const FOCUS_ICONS: Record<Focus, React.ReactNode> = {
  theoretical: <Lightbulb className="size-4" />,
  practical: <Hammer className="size-4" />,
  exam: <GraduationCap className="size-4" />,
  executive: <Zap className="size-4" />,
};
const TIME_ICONS: Record<TimeBudget, React.ReactNode> = {
  micro: <Timer className="size-4" />,
  deep: <Hourglass className="size-4" />,
};

function options<T extends string>(
  meta: Record<T, { label: string; description: string }>,
  icons: Record<T, React.ReactNode>,
): OptionItem<T>[] {
  return (Object.keys(meta) as T[]).map((value) => ({
    value,
    label: meta[value].label,
    description: meta[value].description,
    icon: icons[value],
  }));
}

const PROGRESS_MESSAGES = [
  'Analizando el tema y tu nivel…',
  'Identificando los conceptos fundamentales…',
  'Ordenando los prerrequisitos…',
  'Diseñando módulos y lecciones…',
  'Definiendo objetivos de aprendizaje…',
  'Validando la estructura del temario…',
];

function GeneratingCard({
  topic,
  onCancel,
  status,
}: {
  topic: string;
  onCancel: () => void;
  status: string | null;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_MESSAGES.length - 1)), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <Card className="animate-fade-in p-8 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-text">
        <WandSparkles className="size-6 animate-pulse" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Diseñando tu ruta sobre «{topic}»</h2>
      <p className="mt-1 text-sm text-fg-muted" aria-live="polite">
        {status ?? PROGRESS_MESSAGES[step]}
      </p>
      <div className="mx-auto mt-5 h-1 max-w-xs overflow-hidden rounded-full bg-accent-soft">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-[2000ms]"
          style={{ width: `${((step + 1) / PROGRESS_MESSAGES.length) * 92}%` }}
        />
      </div>
      <Button variant="ghost" size="sm" className="mt-6" onClick={onCancel}>
        Cancelar
      </Button>
    </Card>
  );
}

/** El temario tal como lo devuelve el motor (contrato JSON), para revisarlo, copiarlo o guardarlo. */
function ContractJson({ course }: { course: Course }) {
  const contract = useMemo(() => toContract(course), [course]);
  const json = useMemo(() => JSON.stringify(contract, null, 2), [contract]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar al portapapeles.');
    }
  };
  const toolClass =
    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg';
  return (
    <details className="group overflow-hidden rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-[13.5px] font-medium text-fg-muted select-none hover:text-fg [&::-webkit-details-marker]:hidden">
        <Braces className="size-4 shrink-0" />
        Ver el temario en JSON
        <span className="hidden font-normal text-fg-faint sm:inline">· contrato del motor</span>
        <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line bg-code-bg">
        <div className="flex h-8 items-center justify-between border-b border-line px-3">
          <span className="font-mono text-[11px] tracking-wide text-fg-faint uppercase">json</span>
          <div className="flex gap-1">
            <button type="button" onClick={copy} className={toolClass} aria-label="Copiar JSON">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={() => downloadJson(`temario-${slugify(course.topic) || 'ruta'}.json`, contract)}
              className={toolClass}
              aria-label="Descargar JSON"
            >
              <Download className="size-3.5" />
              Descargar
            </button>
          </div>
        </div>
        <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-fg-muted wrap-break-word">
          {json}
        </pre>
      </div>
    </details>
  );
}

function SyllabusPreview({
  course,
  onStart,
  onRegenerate,
  onBack,
  saving,
}: {
  course: Course;
  onStart: () => void;
  onRegenerate: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  const progress = courseProgress(course);
  return (
    <div className="animate-fade-in space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{LEVEL_META[course.level].label}</Badge>
          <Badge>{FOCUS_META[course.focus].label}</Badge>
          <Badge>{TIME_META[course.time_budget].label}</Badge>
          {course.source === 'demo' && <Badge tone="warning">Demo · sin IA</Badge>}
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{course.title}</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg-muted">
          <span>{course.modules.length} módulos</span>
          <span>{progress.total} lecciones</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {formatMinutes(progress.minutesTotal)} en total
          </span>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-[13px] font-semibold text-fg">Al terminar podrás…</h3>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-fg-muted">
              {course.learning_outcomes.map((o) => (
                <li key={o} className="flex gap-2">
                  <Target className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-fg">Prerrequisitos</h3>
            {course.prerequisites.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[13.5px] text-fg-muted">
                {course.prerequisites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13.5px] text-fg-muted">Ninguno: puedes empezar directamente.</p>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {course.modules.map((m) => (
          <Card key={m.module_id} className="p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-fg-faint">M{m.module_id}</span>
              <div>
                <h3 className="text-[15px] font-semibold">{m.title}</h3>
                <p className="mt-0.5 text-[13px] text-fg-muted">{m.description}</p>
              </div>
            </div>
            <ol className="mt-4 space-y-3 border-l border-line pl-5">
              {m.lessons.map((l) => (
                <li key={l.lesson_id} className="relative">
                  <span className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-line-strong" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[14px] font-medium text-fg">
                      <span className="mr-1.5 font-mono text-xs text-fg-faint">{l.lesson_id}</span>
                      {l.title}
                    </span>
                    <span className="text-xs text-fg-faint">{l.estimated_minutes} min</span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-fg-muted">{l.objective}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {l.key_concepts.map((k) => (
                      <Badge key={k}>{k}</Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <ContractJson course={course} />

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={onBack}>
          Ajustar opciones
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={onRegenerate}>
            Regenerar
          </Button>
          <Button variant="primary" loading={saving} onClick={onStart} icon={<Rocket className="size-4" />}>
            Comenzar ruta
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewCourse() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { ai, isDemo, meta, ready } = useAI();
  const language = useSettings((s) => s.contentLanguage);
  const sequentialDefault = useSettings((s) => s.sequentialByDefault);

  const [topic, setTopic] = useState(params.get('topic') ?? '');
  const [level, setLevel] = useState<Level>('beginner');
  const [focus, setFocus] = useState<Focus>('theoretical');
  const [time, setTime] = useState<TimeBudget>('micro');
  const [goal, setGoal] = useState('');
  const [material, setMaterial] = useState('');
  const [sequential, setSequential] = useState(sequentialDefault);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [phase, setPhase] = useState<'form' | 'generating' | 'preview'>('form');
  const [course, setCourse] = useState<Course | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<ReturnType<typeof describeError> | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  // Mismo proveedor, pero informando en pantalla si hay que reparar el formato de la respuesta.
  const generator = useMemo(() => new AIService(ai.provider, { onStatus: setStatus }), [ai]);

  const generate = async () => {
    if (!topic.trim()) {
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setStatus(null);
    setPhase('generating');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const generated = await generator.generateSyllabus(
        { topic, level, focus, time_budget: time, goal, source_material: material, language },
        { sequential, signal: controller.signal },
      );
      setCourse(generated);
      setPhase('preview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setPhase('form');
      if (isAbortError(e)) return;
      setError(describeError(e));
    }
  };

  const start = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await saveNewCourse(course);
      toast.success('¡Ruta creada! Empieza por la primera lección.');
      const first = course.modules[0]?.lessons[0];
      navigate(
        first ? `/course/${course.course_id}/lesson/${first.lesson_id}` : `/course/${course.course_id}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      {phase === 'preview' && course ? (
        <>
          <header className="mb-6">
            <p className="text-[13px] text-fg-muted">Mapa de ruta generado</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Revisa tu temario</h1>
            <p className="mt-1.5 text-[14.5px] text-fg-muted">
              Las lecciones se redactan justo cuando las abras, adaptadas a tu progreso.
            </p>
          </header>
          <SyllabusPreview
            course={course}
            saving={saving}
            onStart={start}
            onRegenerate={generate}
            onBack={() => setPhase('form')}
          />
        </>
      ) : phase === 'generating' ? (
        <div className="mx-auto max-w-xl pt-10">
          <GeneratingCard
            topic={topic}
            status={status}
            onCancel={() => {
              abortRef.current?.abort();
              setPhase('form');
            }}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <header className="mb-8 text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-text">
              <Sparkles className="size-6" />
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">
              ¿Qué quieres aprender?
            </h1>
            <p className="mt-2 text-[15px] text-fg-muted">
              Cualquier tema, habilidad o disciplina. Omnilearn diseñará una ruta adaptada a tu nivel,
              objetivo y tiempo.
            </p>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
            className="space-y-8"
          >
            <div>
              <label htmlFor="topic" className="sr-only">
                Tema
              </label>
              <textarea
                id="topic"
                ref={inputRef}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void generate();
                  }
                }}
                rows={2}
                maxLength={300}
                autoFocus
                placeholder="Ej.: Física cuántica, optimización de consultas SQL, historia de Roma…"
                className="w-full resize-none rounded-2xl border border-line-strong bg-surface px-5 py-4 text-lg text-fg shadow-[var(--shadow-card)] placeholder:text-fg-faint focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTopic(s)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[13px] transition-colors',
                      topic === s
                        ? 'border-accent bg-accent-soft text-accent-text'
                        : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Tu nivel actual</legend>
              <OptionCards
                name="level"
                label="Nivel actual"
                value={level}
                onChange={setLevel}
                columns={4}
                options={options(LEVEL_META, LEVEL_ICONS)}
              />
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Enfoque</legend>
              <OptionCards
                name="focus"
                label="Enfoque"
                value={focus}
                onChange={setFocus}
                columns={2}
                options={options(FOCUS_META, FOCUS_ICONS)}
              />
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Tiempo disponible</legend>
              <OptionCards
                name="time"
                label="Tiempo disponible"
                value={time}
                onChange={setTime}
                columns={2}
                options={options(TIME_META, TIME_ICONS)}
              />
            </fieldset>

            <div className="rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
              >
                <span>
                  Personalizar más{' '}
                  <span className="font-normal text-fg-muted">— objetivo, material propio y desbloqueo</span>
                </span>
                <ChevronDown
                  className={cn('size-4 text-fg-muted transition-transform', showAdvanced && 'rotate-180')}
                />
              </button>
              {showAdvanced && (
                <div className="animate-fade-in space-y-5 border-t border-line px-4 py-4">
                  <Field
                    label="Tu objetivo"
                    htmlFor="goal"
                    hint="Ej.: «Aprobar Física II el 15 de diciembre» o «Crear mi primera API en Python». La ruta se orientará a lograrlo."
                  >
                    <Textarea
                      id="goal"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      rows={2}
                      maxLength={500}
                    />
                  </Field>
                  <Field
                    label="Material de referencia (opcional)"
                    htmlFor="material"
                    hint="Pega tu temario oficial, apuntes o índice de un libro. La IA lo usará como guía principal, lo que reduce errores y ajusta la ruta a tu curso."
                    action={
                      <span className="text-xs text-fg-faint">
                        {material.length.toLocaleString('es')} / 20 000
                      </span>
                    }
                  >
                    <Textarea
                      id="material"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value.slice(0, 20000))}
                      rows={5}
                    />
                  </Field>
                  <Switch
                    checked={sequential}
                    onChange={setSequential}
                    label="Desbloqueo progresivo (aprendizaje por dominio)"
                    description="Cada lección se desbloquea al aprobar el quiz de la anterior. Desactívalo si prefieres explorar libremente."
                  />
                </div>
              )}
            </div>

            {error && (
              <Callout
                tone="danger"
                title={error.title}
                action={
                  error.code === 'auth' || error.code === 'not_configured' || error.code === 'bad_request' ? (
                    <Link to="/settings">
                      <Button size="sm" variant="secondary">
                        Revisar ajustes
                      </Button>
                    </Link>
                  ) : undefined
                }
              >
                {error.detail}
              </Callout>
            )}

            <div className="flex flex-col items-center gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
              <p className="text-xs text-fg-muted">
                {isDemo ? (
                  <>
                    Modo demo: se generará una guía de estudio genérica.{' '}
                    <Link to="/settings" className="text-accent-text hover:underline">
                      Conecta una IA
                    </Link>{' '}
                    para contenido real del tema.
                  </>
                ) : ready ? (
                  <>
                    Se generará con <strong className="font-medium text-fg">{meta.label}</strong>.
                  </>
                ) : (
                  <>
                    Falta configurar {meta.label}.{' '}
                    <Link to="/settings" className="text-accent-text hover:underline">
                      Ir a Ajustes
                    </Link>
                  </>
                )}
              </p>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!topic.trim()}
                icon={<WandSparkles className="size-4" />}
              >
                Generar mapa de ruta
              </Button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
