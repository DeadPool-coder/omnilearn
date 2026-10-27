import { Link } from 'react-router';
import { Archive, ArchiveRestore, Download, Ellipsis, Trash2 } from 'lucide-react';
import { FOCUS_META, LEVEL_META } from '@/domain/labels';
import { courseProgress, nextLesson } from '@/domain/progress';
import type { Course } from '@/domain/schemas';
import { formatRelative } from '@/lib/dates';
import { Badge, ProgressBar } from '../ui/primitives';
import { Menu } from '../ui/overlays';
import { useCourseActions } from './useCourseActions';

export function CourseCard({ course, mastery }: { course: Course; mastery?: number }) {
  const progress = courseProgress(course);
  const next = nextLesson(course);
  const { exportOne, toggleArchive, remove, confirmDialog } = useCourseActions();
  const target = next
    ? `/course/${course.course_id}/lesson/${next.lesson.lesson_id}`
    : `/course/${course.course_id}`;

  return (
    <div className="group relative flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      {confirmDialog}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{LEVEL_META[course.level].label}</Badge>
          <Badge>{FOCUS_META[course.focus].label}</Badge>
          {course.source === 'demo' && <Badge tone="warning">Demo</Badge>}
          {course.source === 'sample' && <Badge tone="info">Ejemplo</Badge>}
        </div>
        <Menu
          trigger={(props) => (
            <button
              type="button"
              {...props}
              className="-mt-1 -mr-1 rounded-md p-1 text-fg-faint opacity-70 hover:bg-surface-2 hover:text-fg group-hover:opacity-100"
              aria-label={`Acciones de ${course.title}`}
            >
              <Ellipsis className="size-4" />
            </button>
          )}
          items={[
            { label: 'Exportar JSON', icon: <Download />, onSelect: () => void exportOne(course) },
            {
              label: course.status === 'archived' ? 'Restaurar' : 'Archivar',
              icon: course.status === 'archived' ? <ArchiveRestore /> : <Archive />,
              onSelect: () => void toggleArchive(course),
            },
            { label: 'Eliminar', icon: <Trash2 />, danger: true, onSelect: () => void remove(course) },
          ]}
        />
      </div>
      <Link to={`/course/${course.course_id}`} className="mt-3 block">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-fg after:absolute after:inset-0 after:content-['']">
          {course.title}
        </h3>
      </Link>
      <p className="mt-1 line-clamp-2 text-[13px] text-fg-muted">{course.description}</p>
      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-fg-muted">
          <span>
            {progress.completed}/{progress.total} lecciones
          </span>
          <span>
            {mastery !== undefined ? `Dominio ${Math.round(mastery * 100)} %` : `${progress.percent} %`}
          </span>
        </div>
        <ProgressBar
          value={progress.percent}
          tone={progress.percent === 100 ? 'success' : 'accent'}
          label="Progreso de la ruta"
        />
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="text-fg-faint">
            {course.last_studied_at ? `Estudiado ${formatRelative(course.last_studied_at)}` : 'Sin empezar'}
          </span>
          {course.status === 'active' && next && (
            <Link to={target} className="relative z-10 font-medium text-accent-text hover:underline">
              {next.lesson.status === 'in_progress' ? 'Continuar' : 'Empezar'} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
