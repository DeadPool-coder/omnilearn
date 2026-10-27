import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { exportCourse } from '@/db/backup';
import { deleteCourse, updateCourse } from '@/db/repo';
import { courseProgress } from '@/domain/progress';
import type { Course } from '@/domain/schemas';
import { downloadJson, slugify } from '@/lib/text';
import { useConfirm } from '../ui/useConfirm';

/** Acciones comunes sobre una ruta: exportar, archivar/restaurar y eliminar (con confirmación). */
export function useCourseActions() {
  const [confirm, confirmDialog] = useConfirm();
  const navigate = useNavigate();

  const exportOne = async (course: Course) => {
    downloadJson(`omnilearn-${slugify(course.title) || 'ruta'}.json`, await exportCourse(course.course_id));
    toast.success('Ruta exportada');
  };
  const toggleArchive = async (course: Course) => {
    const archived = course.status === 'archived';
    await updateCourse(course.course_id, {
      status: archived ? (courseProgress(course).percent === 100 ? 'completed' : 'active') : 'archived',
    });
    toast.success(archived ? 'Ruta restaurada' : 'Ruta archivada');
  };
  const remove = async (course: Course, redirect = false) => {
    const ok = await confirm({
      title: '¿Eliminar esta ruta?',
      description: `Se borrarán «${course.title}», sus lecciones, tarjetas e historial. No se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await deleteCourse(course.course_id);
    toast.success('Ruta eliminada');
    if (redirect) navigate('/');
  };
  return { exportOne, toggleArchive, remove, confirmDialog };
}
