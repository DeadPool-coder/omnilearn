import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Baby, Lightbulb, MessageCircleQuestion, Microscope } from 'lucide-react';
import type { ExpansionKind } from '@/domain/schemas';

interface Position {
  top: number;
  left: number;
  text: string;
}

const ACTIONS: { kind: ExpansionKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'simpler', label: 'Más simple', icon: <Baby className="size-3.5" /> },
  { kind: 'example', label: 'Ejemplo', icon: <Lightbulb className="size-3.5" /> },
  { kind: 'deeper', label: 'Profundizar', icon: <Microscope className="size-3.5" /> },
  { kind: 'question', label: 'Preguntar', icon: <MessageCircleQuestion className="size-3.5" /> },
];

/**
 * Barra flotante sobre el texto seleccionado dentro de `containerRef`.
 * Permite pedir una explicación más simple, un ejemplo, profundizar o preguntar sobre ese fragmento.
 */
export function SelectionToolbar({
  containerRef,
  onAction,
  disabled,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onAction: (kind: ExpansionKind, selection: string) => void;
  disabled?: boolean;
}) {
  const [pos, setPos] = useState<Position | null>(null);

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      const container = containerRef.current;
      if (!sel || sel.isCollapsed || !container || sel.rangeCount === 0) {
        setPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setPos(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 3) {
        setPos(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setPos({
        top: rect.top + window.scrollY - 8,
        left: Math.min(Math.max(rect.left + rect.width / 2 + window.scrollX, 170), window.innerWidth - 170),
        text: text.slice(0, 2000),
      });
    };
    const onUp = () => setTimeout(update, 0);
    const hide = () => setPos(null);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keyup', onUp);
    document.addEventListener('touchend', onUp);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keyup', onUp);
      document.removeEventListener('touchend', onUp);
      window.removeEventListener('resize', hide);
    };
  }, [containerRef]);

  if (!pos || disabled) return null;

  // Portal al <body>: las coordenadas son de página y no dependen de contenedores posicionados.
  return createPortal(
    <div
      role="toolbar"
      aria-label="Acciones sobre el texto seleccionado"
      className="animate-pop absolute z-30 flex -translate-x-1/2 -translate-y-full gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-pop)]"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {ACTIONS.map((a) => (
        <button
          key={a.kind}
          type="button"
          onClick={() => {
            onAction(a.kind, pos.text);
            window.getSelection()?.removeAllRanges();
            setPos(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-2"
        >
          <span className="text-accent-text">{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
