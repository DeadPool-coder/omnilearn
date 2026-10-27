import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

/** Diálogo modal accesible basado en <dialog> nativo (foco atrapado y Escape incluidos). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-pop)] backdrop:bg-black/50',
        size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="animate-pop">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <IconButton label="Cerrar" size="sm" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </div>
          {children && <div className={cn('px-5 pt-4', !footer && 'pb-5')}>{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 px-5 pt-5 pb-5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Menú desplegable sencillo (cierra al hacer clic fuera o con Escape). */
export function Menu({
  trigger,
  items,
  align = 'end',
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode;
  items: { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; hidden?: boolean }[];
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ onClick: () => setOpen((v) => !v), 'aria-expanded': open })}
      {open && (
        <div
          role="menu"
          className={cn(
            'animate-pop absolute z-30 mt-1 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-pop)]',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items
            .filter((i) => !i.hidden)
            .map((item) => (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
                  item.danger ? 'text-danger hover:bg-danger-soft' : 'text-fg hover:bg-surface-2',
                )}
              >
                {item.icon && <span className="text-fg-muted [&>svg]:size-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
