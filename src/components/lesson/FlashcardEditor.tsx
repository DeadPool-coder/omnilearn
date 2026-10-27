import { useState } from 'react';
import { toast } from 'sonner';
import { addFlashcards, updateFlashcard } from '@/db/repo';
import type { Course, Flashcard } from '@/domain/schemas';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/forms';
import { Dialog } from '../ui/overlays';

interface EditorProps {
  onClose: () => void;
  card?: Flashcard | null;
  courses?: Course[];
  defaultCourseId?: string;
  lessonId?: string | null;
}

/** Formulario: se monta al abrir el diálogo, así su estado parte siempre de la tarjeta recibida. */
function EditorForm({ onClose, card, courses, defaultCourseId, lessonId = null }: EditorProps) {
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [concept, setConcept] = useState(card?.concept ?? '');
  const [courseId, setCourseId] = useState(
    card?.course_id ?? defaultCourseId ?? courses?.[0]?.course_id ?? '',
  );
  const [saving, setSaving] = useState(false);
  const valid = !!front.trim() && !!back.trim() && !!courseId;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      if (card) {
        await updateFlashcard(card.id, { front: front.trim(), back: back.trim(), concept: concept.trim() });
        toast.success('Tarjeta actualizada');
      } else {
        const created = await addFlashcards([{ front, back, concept }], {
          courseId,
          lessonId,
          source: 'user',
        });
        if (created.length) toast.success('Tarjeta añadida a tu repaso');
        else toast.info('Ya existe una tarjeta con esa pregunta');
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-4"
    >
      {!card && courses && !defaultCourseId && (
        <Field label="Ruta" htmlFor="card-course">
          <Select id="card-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Pregunta (anverso)" htmlFor="card-front">
        <Textarea
          id="card-front"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={2}
          className="min-h-0"
          autoFocus
        />
      </Field>
      <Field label="Respuesta (reverso)" htmlFor="card-back">
        <Textarea
          id="card-back"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={3}
          className="min-h-0"
        />
      </Field>
      <Field label="Concepto (opcional)" htmlFor="card-concept">
        <Input id="card-concept" value={concept} onChange={(e) => setConcept(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!valid}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

/** Diálogo para crear o editar una tarjeta. */
export function FlashcardEditor({ open, ...props }: EditorProps & { open: boolean }) {
  return (
    <Dialog
      open={open}
      onClose={props.onClose}
      title={props.card ? 'Editar tarjeta' : 'Nueva tarjeta'}
      description="Una sola idea por tarjeta. Pregunta concreta, respuesta breve."
    >
      {open && <EditorForm key={props.card?.id ?? 'new'} {...props} />}
    </Dialog>
  );
}
