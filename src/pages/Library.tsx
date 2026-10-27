import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { Ellipsis, Pause, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { LessonStatusIcon } from '@/components/course/CourseOutline';
import { FlashcardEditor } from '@/components/lesson/FlashcardEditor';
import { Page, PageHeader } from '@/components/layout/AppShell';
import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Input, Segmented, Select } from '@/components/ui/forms';
import { Menu } from '@/components/ui/overlays';
import { useConfirm } from '@/components/ui/useConfirm';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui/primitives';
import { db } from '@/db/db';
import { deleteFlashcard, updateFlashcard } from '@/db/repo';
import { SRS_STATE_META } from '@/domain/labels';
import { lessonStatuses } from '@/domain/progress';
import type { Flashcard, LessonStatus } from '@/domain/schemas';
import { useCourses, useNow } from '@/hooks/useData';
import { formatRelative } from '@/lib/dates';
import { matchesQuery } from '@/lib/text';

type Tab = 'concepts' | 'cards';
type ConceptFilter = 'all' | 'learned' | 'pending';
type CardFilter = 'all' | 'due' | 'new' | 'suspended';

interface ConceptEntry {
  key: string;
  concept: string;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  status: LessonStatus;
}

function FlashcardRow({
  card,
  courseTitle,
  onEdit,
  now,
}: {
  card: Flashcard;
  courseTitle: string;
  onEdit: (card: Flashcard) => void;
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, dialog] = useConfirm();
  const due = card.srs.due <= now;
  return (
    <li className="rounded-xl border border-line bg-surface">
      {dialog}
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <div className="text-[14px] font-medium text-fg">
            <Markdown content={card.front} compact className="[&_p]:my-0" />
          </div>
          {open && (
            <div className="mt-2 border-t border-line pt-2 text-[13.5px] text-fg-muted">
              <Markdown content={card.back} compact className="[&_p]:my-1" />
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-faint">
            <span className="truncate">{courseTitle}</span>
            {card.concept && <span>· {card.concept}</span>}
            <span>
              ·{' '}
              {card.suspended
                ? 'Suspendida'
                : due
                  ? 'Para hoy'
                  : `Próximo repaso ${formatRelative(card.srs.due, now)}`}
            </span>
            {card.srs.lapses > 0 && <span>· {card.srs.lapses} olvidos</span>}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            tone={
              card.suspended
                ? 'neutral'
                : card.srs.state === 0
                  ? 'accent'
                  : card.srs.state === 3
                    ? 'warning'
                    : due
                      ? 'info'
                      : 'success'
            }
          >
            {card.suspended ? 'Suspendida' : SRS_STATE_META[card.srs.state].label}
          </Badge>
          <Menu
            trigger={(props) => (
              <button
                {...props}
                type="button"
                className="rounded-md p-1 text-fg-faint hover:bg-surface-2 hover:text-fg"
                aria-label="Acciones de la tarjeta"
              >
                <Ellipsis className="size-4" />
              </button>
            )}
            items={[
              { label: 'Editar', icon: <Pencil />, onSelect: () => onEdit(card) },
              {
                label: card.suspended ? 'Reactivar' : 'Suspender',
                icon: card.suspended ? <Play /> : <Pause />,
                onSelect: () => void updateFlashcard(card.id, { suspended: !card.suspended }),
              },
              {
                label: 'Eliminar',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (
                    await confirm({ title: '¿Eliminar la tarjeta?', confirmLabel: 'Eliminar', danger: true })
                  ) {
                    await deleteFlashcard(card.id);
                    toast.success('Tarjeta eliminada');
                  }
                },
              },
            ]}
          />
        </div>
      </div>
    </li>
  );
}

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'concepts';
  const courses = useCourses();
  const cards = useLiveQuery(() => db.flashcards.orderBy('created_at').reverse().toArray(), []);
  const now = useNow();
  const [query, setQuery] = useState('');
  const [courseId, setCourseId] = useState('');
  const [conceptFilter, setConceptFilter] = useState<ConceptFilter>('all');
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [creating, setCreating] = useState(false);

  const courseTitles = useMemo(() => new Map((courses ?? []).map((c) => [c.course_id, c.title])), [courses]);

  const concepts = useMemo<ConceptEntry[]>(() => {
    const out: ConceptEntry[] = [];
    for (const course of courses ?? []) {
      const statuses = lessonStatuses(course);
      for (const m of course.modules) {
        for (const l of m.lessons) {
          for (const concept of l.key_concepts) {
            out.push({
              key: `${course.course_id}:${l.lesson_id}:${concept}`,
              concept,
              courseId: course.course_id,
              courseTitle: course.title,
              lessonId: l.lesson_id,
              lessonTitle: l.title,
              status: statuses.get(l.lesson_id) ?? 'pending',
            });
          }
        }
      }
    }
    return out;
  }, [courses]);

  const filteredConcepts = concepts.filter(
    (c) =>
      (!courseId || c.courseId === courseId) &&
      (conceptFilter === 'all' ||
        (conceptFilter === 'learned' ? c.status === 'completed' : c.status !== 'completed')) &&
      matchesQuery(`${c.concept} ${c.lessonTitle} ${c.courseTitle}`, query),
  );

  const filteredCards = (cards ?? []).filter(
    (c) =>
      (!courseId || c.course_id === courseId) &&
      (cardFilter === 'all' ||
        (cardFilter === 'due' && !c.suspended && c.srs.due <= now) ||
        (cardFilter === 'new' && c.srs.state === 0) ||
        (cardFilter === 'suspended' && c.suspended)) &&
      matchesQuery(`${c.front} ${c.back} ${c.concept}`, query),
  );

  const learnedCount = concepts.filter((c) => c.status === 'completed').length;

  return (
    <Page>
      <PageHeader
        title="Biblioteca"
        description="Todo lo que has aprendido: conceptos clave de tus rutas y tus tarjetas de repaso."
        actions={
          tab === 'cards' && (
            <Button
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => setCreating(true)}
              disabled={!courses?.length}
            >
              Nueva tarjeta
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label="Sección"
          value={tab}
          onChange={(v) => setParams({ tab: v })}
          options={[
            { value: 'concepts', label: 'Conceptos', count: concepts.length },
            { value: 'cards', label: 'Tarjetas', count: cards?.length ?? 0 },
          ]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'concepts' ? 'Buscar conceptos…' : 'Buscar en tus tarjetas…'}
            aria-label="Buscar"
            className="pl-9"
          />
        </div>
        <div className="sm:w-56">
          <Select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            aria-label="Filtrar por ruta"
          >
            <option value="">Todas las rutas</option>
            {(courses ?? []).map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {tab === 'concepts' ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Segmented
              size="sm"
              label="Estado del concepto"
              value={conceptFilter}
              onChange={setConceptFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'learned', label: 'Aprendidos', count: learnedCount },
                { value: 'pending', label: 'Por aprender' },
              ]}
            />
            <span className="text-xs text-fg-faint">{filteredConcepts.length} resultados</span>
          </div>
          {!courses ? (
            <Spinner />
          ) : filteredConcepts.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Search className="size-5" />}
                title="Sin resultados"
                description="Prueba con otra búsqueda o filtro."
              />
            </Card>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {filteredConcepts.slice(0, 300).map((c) => (
                <Link
                  key={c.key}
                  to={`/course/${c.courseId}/lesson/${c.lessonId}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <LessonStatusIcon status={c.status} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-fg">{c.concept}</div>
                    <div className="truncate text-xs text-fg-faint">
                      {c.courseTitle} · {c.lessonId} {c.lessonTitle}
                    </div>
                  </div>
                  {c.status === 'completed' && <Badge tone="success">Aprendido</Badge>}
                </Link>
              ))}
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Segmented
              size="sm"
              label="Estado de la tarjeta"
              value={cardFilter}
              onChange={setCardFilter}
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'due', label: 'Para hoy' },
                { value: 'new', label: 'Nuevas' },
                { value: 'suspended', label: 'Suspendidas' },
              ]}
            />
            <span className="text-xs text-fg-faint">{filteredCards.length} tarjetas</span>
          </div>
          {!cards ? (
            <Spinner />
          ) : filteredCards.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Search className="size-5" />}
                title={cards.length ? 'Sin resultados' : 'Aún no tienes tarjetas'}
                description={
                  cards.length
                    ? 'Prueba con otra búsqueda o filtro.'
                    : 'Al aprobar el quiz de una lección, sus conceptos clave se convierten en tarjetas. También puedes crear las tuyas.'
                }
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {filteredCards.slice(0, 300).map((card) => (
                <FlashcardRow
                  key={card.id}
                  card={card}
                  courseTitle={courseTitles.get(card.course_id) ?? 'Ruta eliminada'}
                  onEdit={setEditing}
                  now={now}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <FlashcardEditor open={!!editing} onClose={() => setEditing(null)} card={editing} />
      <FlashcardEditor
        open={creating}
        onClose={() => setCreating(false)}
        courses={courses}
        defaultCourseId={courseId || undefined}
      />
    </Page>
  );
}
