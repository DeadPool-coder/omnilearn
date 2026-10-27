import { NavLink } from 'react-router';
import { CircleCheck, Circle, CircleDot, Lock } from 'lucide-react';
import { LESSON_STATUS_META } from '@/domain/labels';
import { courseProgress, lessonStatuses } from '@/domain/progress';
import type { Course, LessonStatus } from '@/domain/schemas';
import { cn } from '@/lib/cn';
import { ProgressBar } from '../ui/primitives';

export function LessonStatusIcon({ status, className }: { status: LessonStatus; className?: string }) {
  const label = LESSON_STATUS_META[status].label;
  const cls = cn('size-4 shrink-0', className);
  switch (status) {
    case 'completed':
      return <CircleCheck className={cn(cls, 'text-success')} aria-label={label} />;
    case 'in_progress':
      return <CircleDot className={cn(cls, 'text-accent-text')} aria-label={label} />;
    case 'locked':
      return <Lock className={cn(cls, 'text-fg-faint')} aria-label={label} />;
    default:
      return <Circle className={cn(cls, 'text-fg-faint')} aria-label={label} />;
  }
}

/** Árbol de módulos y lecciones con estado y barra de progreso (panel lateral de estudio). */
export function CourseOutline({
  course,
  activeLessonId,
  onNavigate,
  compact,
}: {
  course: Course;
  activeLessonId?: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const statuses = lessonStatuses(course);
  const progress = courseProgress(course);
  return (
    <div className="flex h-full flex-col">
      {!compact && (
        <div className="border-b border-line px-4 py-4">
          <NavLink
            to={`/course/${course.course_id}`}
            onClick={onNavigate}
            className="line-clamp-2 text-[13.5px] leading-snug font-semibold text-fg hover:text-accent-text"
          >
            {course.title}
          </NavLink>
          <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
            <span>
              {progress.completed} de {progress.total} lecciones
            </span>
            <span className="font-medium text-fg">{progress.percent} %</span>
          </div>
          <ProgressBar
            value={progress.percent}
            className="mt-1.5"
            tone={progress.percent === 100 ? 'success' : 'accent'}
            label="Progreso general"
          />
        </div>
      )}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Temario">
        {course.modules.map((m) => {
          const done = m.lessons.filter((l) => l.status === 'completed').length;
          return (
            <div key={m.module_id} className="mb-4">
              <div className="flex items-baseline justify-between gap-2 px-2.5 pb-1.5">
                <span className="text-[11.5px] font-semibold tracking-wide text-fg-muted uppercase">
                  {m.module_id}. {m.title}
                </span>
                <span className="shrink-0 text-[11px] text-fg-faint tabular-nums">
                  {done}/{m.lessons.length}
                </span>
              </div>
              <ul className="space-y-0.5">
                {m.lessons.map((l) => {
                  const status = statuses.get(l.lesson_id) ?? 'pending';
                  const locked = status === 'locked';
                  const active = l.lesson_id === activeLessonId;
                  const content = (
                    <>
                      <LessonStatusIcon status={status} className="mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-[13px] leading-snug',
                            active ? 'font-medium text-fg' : 'text-fg-muted',
                            locked && 'text-fg-faint',
                          )}
                        >
                          {l.title}
                        </span>
                        <span className="text-[11px] text-fg-faint">
                          {l.lesson_id} · {l.estimated_minutes} min
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={l.lesson_id}>
                      {locked ? (
                        <div
                          className="flex cursor-not-allowed gap-2.5 rounded-lg px-2.5 py-2"
                          title="Aprueba el quiz de la lección anterior para desbloquearla"
                        >
                          {content}
                        </div>
                      ) : (
                        <NavLink
                          to={`/course/${course.course_id}/lesson/${l.lesson_id}`}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                            active ? 'bg-surface-3' : 'hover:bg-surface-2',
                          )}
                        >
                          {content}
                        </NavLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
