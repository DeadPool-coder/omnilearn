import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const FIELD =
  'w-full rounded-lg border border-line bg-surface-2 text-sm text-fg placeholder:text-fg-faint transition-colors ' +
  'hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(FIELD, 'h-9 px-3', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea ref={ref} className={cn(FIELD, 'min-h-24 px-3 py-2 leading-relaxed', className)} {...rest} />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(FIELD, 'h-9 appearance-none pr-8 pl-3', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-faint" />
    </div>
  );
});

export function Field({
  label,
  hint,
  children,
  htmlFor,
  className,
  action,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-fg-faint">{hint}</p>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[13.5px] font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-3',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
  description,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: ReactNode;
  format: (value: number) => string;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13.5px] font-medium text-fg">
          {label}
        </label>
        <span className="font-mono text-xs text-accent-text">{format(value)}</span>
      </div>
      {description && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--ol-accent)]"
      />
    </div>
  );
}

export interface OptionItem<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

/** Grupo de opciones tipo "tarjeta" (radio accesible). */
export function OptionCards<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 2,
  label,
}: {
  name: string;
  value: T;
  options: OptionItem<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  label: string;
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns];
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid grid-cols-1 gap-2', cols)}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <label
            key={opt.value}
            className={cn(
              'group relative flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
              selected
                ? 'border-accent bg-accent-soft ring-1 ring-accent/40'
                : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.icon && (
              <div
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg',
                  selected ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted',
                )}
              >
                {opt.icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-fg">{opt.label}</div>
              {opt.description && (
                <div className="mt-0.5 text-xs leading-relaxed text-fg-muted">{opt.description}</div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

/** Control segmentado (pestañas compactas). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; count?: number }[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'bg-canvas text-fg shadow-[var(--shadow-card)]' : 'text-fg-muted hover:text-fg',
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'rounded px-1 text-[11px]',
                  active ? 'bg-surface-2 text-fg-muted' : 'text-fg-faint',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
