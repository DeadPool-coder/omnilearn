import { useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers, Plus, Repeat } from 'lucide-react';
import { db } from '@/db/db';
import type { Flashcard } from '@/domain/schemas';
import { cn } from '@/lib/cn';
import { Markdown } from '../markdown/Markdown';
import { Button } from '../ui/Button';
import { Badge, Spinner } from '../ui/primitives';
import { FlashcardEditor } from './FlashcardEditor';

const SOURCE_LABEL: Record<Flashcard['source'], string> = {
  ai: 'Generada',
  quiz_error: 'Error del quiz',
  user: 'Tuya',
  sample: 'Ejemplo',
};

function CardItem({ card }: { card: Flashcard }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'w-full rounded-xl border px-4 py-3 text-left transition-colors',
          open ? 'border-accent-line bg-accent-soft/40' : 'border-line bg-surface hover:border-line-strong',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[14px] font-medium text-fg">
            <Markdown content={card.front} compact className="[&_p]:my-0" />
          </div>
          <Badge tone={card.source === 'quiz_error' ? 'warning' : 'neutral'}>
            {SOURCE_LABEL[card.source]}
          </Badge>
        </div>
        {open ? (
          <div className="mt-2 border-t border-line pt-2 text-[13.5px] text-fg-muted">
            <Markdown content={card.back} compact className="[&_p]:my-1" />
          </div>
        ) : (
          <div className="mt-1 text-xs text-fg-faint">Piensa la respuesta y pulsa para comprobarla</div>
        )}
      </button>
    </li>
  );
}

export function LessonFlashcards({
  courseId,
  lessonId,
  generating,
}: {
  courseId: string;
  lessonId: string;
  generating: boolean;
}) {
  const cards = useLiveQuery(
    () =>
      db.flashcards
        .where('lesson_id')
        .equals(lessonId)
        .filter((c) => c.course_id === courseId)
        .sortBy('created_at'),
    [courseId, lessonId],
  );
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-fg-muted">
          Estas tarjetas ya están en tu mazo. Omnilearn te las mostrará justo antes de que las olvides.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Plus className="size-4" />}
            onClick={() => setEditorOpen(true)}
          >
            Añadir
          </Button>
          <Link to={`/review?course=${courseId}`}>
            <Button size="sm" variant="secondary" icon={<Repeat className="size-4" />}>
              Repasar ahora
            </Button>
          </Link>
        </div>
      </div>
      {generating && <Spinner label="Extrayendo los conceptos clave en tarjetas…" />}
      {cards && cards.length === 0 && !generating && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line p-4 text-[13px] text-fg-muted">
          <Layers className="size-4" /> Aún no hay tarjetas para esta lección.
        </div>
      )}
      {cards && cards.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {cards.map((c) => (
            <CardItem key={c.id} card={c} />
          ))}
        </ul>
      )}
      <FlashcardEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        defaultCourseId={courseId}
        lessonId={lessonId}
      />
    </div>
  );
}
