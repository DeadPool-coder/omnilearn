import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, Flame, Gauge, Layers, Plus, Repeat, Sparkles } from 'lucide-react';
import { ActivityHeatmap, CalibrationChart, StatTile } from '@/components/dashboard/charts';
import { CourseCard } from '@/components/course/CourseCard';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/forms';
import { Callout, Card, EmptyState, SectionTitle, Skeleton } from '@/components/ui/primitives';
import { courseProgress, nextLesson } from '@/domain/progress';
import { useAIConfig } from '@/hooks/useAIConfig';
import { useCourses, useDashboardStats, useNow } from '@/hooks/useData';
import { formatDate, greeting } from '@/lib/dates';
import { capitalize } from '@/lib/text';

type Tab = 'active' | 'completed' | 'archived';

export default function Dashboard() {
  const courses = useCourses();
  const stats = useDashboardStats();
  const { isDemo } = useAIConfig();
  const [tab, setTab] = useState<Tab>('active');
  const now = useNow();

  const continueCourse = courses?.find((c) => c.status === 'active' && nextLesson(c));
  const continueLesson = continueCourse ? nextLesson(continueCourse) : null;
  const filtered = (courses ?? []).filter((c) => c.status === tab);
  const counts = {
    active: courses?.filter((c) => c.status === 'active').length ?? 0,
    completed: courses?.filter((c) => c.status === 'completed').length ?? 0,
    archived: courses?.filter((c) => c.status === 'archived').length ?? 0,
  };

  return (
    <Page wide>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-fg-muted">
            {capitalize(formatDate(now, { weekday: 'long', day: 'numeric', month: 'long' }))}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {greeting(new Date(now))} 👋
          </h1>
          <p className="mt-1.5 text-[14.5px] text-fg-muted">
            Recuerda: un poco cada día vence a mucho de vez en cuando.
          </p>
        </div>
        <div className="flex gap-2">
          {!!stats?.dueCards && (
            <Link to="/review">
              <Button variant="secondary" icon={<Repeat className="size-4" />}>
                Repasar {stats.dueCards}
              </Button>
            </Link>
          )}
          <Link to="/new">
            <Button variant="primary" icon={<Plus className="size-4" />}>
              Nueva ruta
            </Button>
          </Link>
        </div>
      </header>

      {isDemo && (
        <Callout
          tone="accent"
          icon={<Sparkles className="size-4 text-accent-text" />}
          title="Estás en modo demostración"
          className="mb-6"
          action={
            <Link to="/settings">
              <Button size="sm" variant="soft">
                Conectar un proveedor de IA
              </Button>
            </Link>
          }
        >
          Puedes usar el curso de ejemplo y probar todo el flujo. Para generar rutas reales sobre cualquier
          tema, conecta Claude, OpenAI, Gemini u Ollama (local y gratuito).
        </Callout>
      )}

      {/* Fichas de resumen */}
      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats ? (
          <>
            <StatTile
              label="Racha de estudio"
              value={`${stats.streak.current} ${stats.streak.current === 1 ? 'día' : 'días'}`}
              hint={
                stats.streak.activeToday
                  ? 'Hoy ya has estudiado. ¡Sigue así!'
                  : stats.streak.current > 0
                    ? 'Estudia hoy para no perderla'
                    : `Mejor racha: ${stats.streak.longest} días`
              }
              icon={<Flame />}
              accent={stats.streak.activeToday}
            />
            <StatTile
              label="Tarjetas para hoy"
              value={stats.dueCards}
              hint={`${stats.totalCards} en total · ${stats.reviewsToday} ${stats.reviewsToday === 1 ? 'repaso' : 'repasos'} hoy`}
              icon={<Layers />}
            />
            <StatTile
              label="Lecciones completadas"
              value={stats.lessonsCompleted}
              hint="Con el quiz aprobado"
              icon={<BookOpen />}
            />
            <StatTile
              label="Dominio medio"
              value={`${Math.round(stats.avgMastery * 100)} %`}
              hint="Quiz + retención estimada"
              icon={<Gauge />}
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[106px] rounded-xl" />)
        )}
      </section>

      {/* Continuar */}
      {continueCourse && continueLesson && (
        <section className="mt-8">
          <SectionTitle>Continuar aprendiendo</SectionTitle>
          <Link
            to={`/course/${continueCourse.course_id}/lesson/${continueLesson.lesson.lesson_id}`}
            className="group flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent-line sm:flex-row sm:items-center"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
              <BookOpen className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-fg-muted">
                {continueCourse.title} · Lección {continueLesson.lesson.lesson_id}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold text-fg">{continueLesson.lesson.title}</div>
              <div className="mt-1 text-xs text-fg-faint">
                {continueLesson.lesson.estimated_minutes} min · {courseProgress(continueCourse).percent} % de
                la ruta completado
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-text">
              {continueLesson.lesson.status === 'in_progress' ? 'Continuar' : 'Empezar'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </section>
      )}

      {/* Actividad y calibración */}
      {stats && (
        <section className="mt-8 grid gap-4 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <ActivityHeatmap activityByDay={stats.activityByDay} />
          </Card>
          <Card className="p-5 lg:col-span-2">
            {stats.calibration.total >= 3 ? (
              <CalibrationChart calibration={stats.calibration} />
            ) : (
              <div className="flex h-full flex-col">
                <div className="text-sm font-semibold text-fg">Calibración de tu confianza</div>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  En cada quiz indicarás cuánta confianza tienes en tu respuesta. Con unas pocas respuestas
                  verás aquí si eres sobreconfiado o infraconfiado: una habilidad clave de los mejores
                  pensadores.
                </p>
                <div className="mt-auto pt-4 text-xs text-fg-faint">Responde algún quiz para empezar.</div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Mis rutas */}
      <section className="mt-10">
        <SectionTitle
          action={
            <Segmented
              label="Filtrar rutas"
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'active', label: 'Activas', count: counts.active },
                { value: 'completed', label: 'Finalizadas', count: counts.completed },
                { value: 'archived', label: 'Archivadas', count: counts.archived },
              ]}
            />
          }
        >
          Mis rutas de aprendizaje
        </SectionTitle>
        {!courses ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title={
                tab === 'active'
                  ? 'No tienes rutas activas'
                  : tab === 'completed'
                    ? 'Aún no has terminado ninguna ruta'
                    : 'No hay rutas archivadas'
              }
              description={
                tab === 'active'
                  ? 'Escribe cualquier tema y Omnilearn diseñará una ruta a tu medida.'
                  : undefined
              }
              action={
                tab === 'active' && (
                  <Link to="/new">
                    <Button variant="primary" icon={<Plus className="size-4" />}>
                      Crear mi primera ruta
                    </Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard
                key={course.course_id}
                course={course}
                mastery={stats?.masteryByCourse.get(course.course_id)}
              />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
