import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Clock,
  Download,
  Ellipsis,
  Layers,
  Target,
  Trash2,
} from 'lucide-react';
import { LessonStatusIcon } from '@/components/course/CourseOutline';
import { useCourseActions } from '@/components/course/useCourseActions';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/forms';
import { Menu } from '@/components/ui/overlays';
import { Badge, Card, EmptyState, ProgressRing, Spinner } from '@/components/ui/primitives';
import { updateCourse } from '@/db/repo';
import { FOCUS_META, LEVEL_META, TIME_META } from '@/domain/labels';
import { courseProgress, lessonStatuses, nextLesson } from '@/domain/progress';
import { useCourse, useCourseStats } from '@/hooks/useData';
import { formatMinutes } from '@/lib/dates';
import { cn } from '@/lib/cn';

export default function CourseOverview() {
  const { courseId } = useParams();
  const course = useCourse(courseId);
  const stats = useCourseStats(course);
  const navigate = useNavigate();
  const { exportOne, toggleArchive, remove, confirmDialog } = useCourseActions();

  if (course === undefined) return <Spinner className="m-10" label="Cargando ruta…" />;
  if (course === null) {
    return (
      <Page>
        <EmptyState
          title="No encontramos esta ruta"
          description="Puede que se haya eliminado."
          action={
            <Link to="/">
              <Button variant="secondary">Volver al inicio</Button>
            </Link>
          }
        />
      </Page>
    );
  }

  const progress = courseProgress(course);
  const statuses = lessonStatuses(course);
  const next = nextLesson(course);
  const mastery = Math.round((stats?.mastery ?? 0) * 100);

  return (
    <Page>
      {confirmDialog}
      <nav className="mb-4 text-[13px] text-fg-muted" aria-label="Migas de pan">
        <Link to="/" className="hover:text-fg">
          Inicio
        </Link>{' '}
        / <span className="text-fg">Ruta</span>
      </nav>

      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="accent">{LEVEL_META[course.level].label}</Badge>
            <Badge>{FOCUS_META[course.focus].label}</Badge>
            <Badge>{TIME_META[course.time_budget].label}</Badge>
            {course.status === 'completed' && <Badge tone="success">Finalizada</Badge>}
            {course.status === 'archived' && <Badge>Archivada</Badge>}
            {course.source === 'demo' && <Badge tone="warning">Demo</Badge>}
            {course.source === 'sample' && <Badge tone="info">Curso de ejemplo</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[28px]">{course.title}</h1>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-fg-muted">{course.description}</p>
          {course.goal && (
            <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-fg-muted">
              <Target className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
              <span>
                <strong className="font-medium text-fg">Tu objetivo:</strong> {course.goal}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {next && course.status !== 'archived' && (
            <Button
              variant="primary"
              iconRight={<ArrowRight className="size-4" />}
              onClick={() => navigate(`/course/${course.course_id}/lesson/${next.lesson.lesson_id}`)}
            >
              {progress.completed === 0 && next.lesson.status === 'pending' ? 'Empezar' : 'Continuar'}
            </Button>
          )}
          <Menu
            trigger={(props) => (
              <Button {...props} variant="secondary" aria-label="Más acciones">
                <Ellipsis className="size-4" />
              </Button>
            )}
            items={[
              { label: 'Exportar JSON', icon: <Download />, onSelect: () => void exportOne(course) },
              {
                label: course.status === 'archived' ? 'Restaurar' : 'Archivar',
                icon: course.status === 'archived' ? <ArchiveRestore /> : <Archive />,
                onSelect: () => void toggleArchive(course),
              },
              {
                label: 'Eliminar',
                icon: <Trash2 />,
                danger: true,
                onSelect: () => void remove(course, true),
              },
            ]}
          />
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Progreso">
        <Card className="flex items-center gap-3 p-4">
          <ProgressRing
            value={progress.percent}
            tone={progress.percent === 100 ? 'success' : 'accent'}
            label={`Progreso ${progress.percent} %`}
          >
            <span className="text-[11px] font-semibold">{progress.percent}%</span>
          </ProgressRing>
          <div>
            <div className="text-xs text-fg-muted">Progreso</div>
            <div className="text-sm font-semibold">
              {progress.completed}/{progress.total} lecciones
            </div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <ProgressRing value={mastery} label={`Dominio ${mastery} %`}>
            <span className="text-[11px] font-semibold">{mastery}%</span>
          </ProgressRing>
          <div>
            <div className="text-xs text-fg-muted">Dominio</div>
            <div className="text-sm font-semibold">
              {mastery >= 80 ? 'Sólido' : mastery >= 50 ? 'En construcción' : 'Inicial'}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-muted">Tiempo restante</div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="size-3.5 text-fg-faint" />
            {formatMinutes(progress.minutesLeft)}
          </div>
        </Card>
        <Link to={`/review?course=${course.course_id}`} className="block">
          <Card className="h-full p-4 transition-colors hover:border-line-strong">
            <div className="text-xs text-fg-muted">Tarjetas</div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
              <Layers className="size-3.5 text-fg-faint" />
              {stats?.cards ?? 0} · {stats?.dueCards ?? 0} para hoy
            </div>
          </Card>
        </Link>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2" aria-label="Temario">
          {course.modules.map((m) => (
            <Card key={m.module_id} className="overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <div className="text-xs text-fg-faint">Módulo {m.module_id}</div>
                <h2 className="text-[15px] font-semibold">{m.title}</h2>
                <p className="mt-0.5 text-[13px] text-fg-muted">{m.description}</p>
              </div>
              <ul>
                {m.lessons.map((l) => {
                  const status = statuses.get(l.lesson_id) ?? 'pending';
                  const locked = status === 'locked';
                  const best = stats?.bestQuiz.get(l.lesson_id);
                  const inner = (
                    <div className="flex items-start gap-3 px-5 py-3">
                      <LessonStatusIcon status={status} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-[14px] font-medium', locked ? 'text-fg-faint' : 'text-fg')}>
                          <span className="mr-1.5 font-mono text-xs text-fg-faint">{l.lesson_id}</span>
                          {l.title}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-fg-muted">{l.objective}</div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-fg-faint">
                        <div>{l.estimated_minutes} min</div>
                        {best !== undefined && (
                          <div className="mt-0.5 text-fg-muted">Quiz {Math.round(best * 100)} %</div>
                        )}
                      </div>
                    </div>
                  );
                  return (
                    <li key={l.lesson_id} className="border-t border-line first:border-t-0">
                      {locked ? (
                        <div title="Aprueba el quiz de la lección anterior para desbloquearla">{inner}</div>
                      ) : (
                        <Link
                          to={`/course/${course.course_id}/lesson/${l.lesson_id}`}
                          className="block transition-colors hover:bg-surface-2"
                        >
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </section>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Al terminar podrás…</h2>
            <ul className="mt-3 space-y-2 text-[13px] text-fg-muted">
              {course.learning_outcomes.map((o) => (
                <li key={o} className="flex gap-2">
                  <Target className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
                  {o}
                </li>
              ))}
            </ul>
            {course.prerequisites.length > 0 && (
              <>
                <h2 className="mt-5 text-sm font-semibold">Prerrequisitos</h2>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-fg-muted">
                  {course.prerequisites.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <Card className="p-5">
            <Switch
              checked={course.sequential}
              onChange={async (value) => {
                await updateCourse(course.course_id, { sequential: value });
                toast.success(value ? 'Desbloqueo progresivo activado' : 'Todas las lecciones desbloqueadas');
              }}
              label="Desbloqueo progresivo"
              description="Cada lección se abre al aprobar el quiz de la anterior (aprendizaje por dominio)."
            />
          </Card>
          {course.generator && (
            <p className="px-1 text-xs text-fg-faint">
              Generada con {course.generator.provider} · {course.generator.model}
            </p>
          )}
        </aside>
      </div>
    </Page>
  );
}
