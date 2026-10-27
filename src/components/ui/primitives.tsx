import type { HTMLAttributes, ReactNode } from 'react';
import { CircleAlert, Info, LoaderCircle, TriangleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-line bg-surface', className)} {...rest} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 text-fg-muted">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted border-line',
  accent: 'bg-accent-soft text-accent-text border-accent-line/50',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
  icon,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] leading-4 font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Progreso
// ---------------------------------------------------------------------------

export function ProgressBar({
  value,
  className,
  tone = 'accent',
  size = 'md',
  label,
}: {
  value: number; // 0-100
  className?: string;
  tone?: 'accent' | 'success' | 'warning';
  size?: 'sm' | 'md';
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-accent';
  // La pista es un tono suave del mismo color que el relleno (se lee como un único medidor).
  const track =
    tone === 'success' ? 'bg-success-soft' : tone === 'warning' ? 'bg-warning-soft' : 'bg-accent-soft';
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full', track, size === 'sm' ? 'h-1' : 'h-1.5', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', color)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  children,
  tone = 'accent',
  label,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  children?: ReactNode;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = {
    accent: 'var(--ol-accent)',
    success: 'var(--ol-success)',
    warning: 'var(--ol-warning)',
    danger: 'var(--ol-danger)',
  }[tone];
  const track = {
    accent: 'var(--ol-accent-soft)',
    success: 'var(--ol-success-soft)',
    warning: 'var(--ol-warning-soft)',
    danger: 'var(--ol-danger-soft)',
  }[tone];
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      aria-label={label}
      role="img"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-fg-muted', className)} role="status">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4', className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mb-3 grid size-11 place-items-center rounded-xl bg-surface-2 text-fg-muted">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const CALLOUT_STYLES = {
  info: { cls: 'border-info/30 bg-info-soft', icon: <Info className="size-4 text-info" /> },
  warning: {
    cls: 'border-warning/30 bg-warning-soft',
    icon: <TriangleAlert className="size-4 text-warning" />,
  },
  danger: { cls: 'border-danger/30 bg-danger-soft', icon: <CircleAlert className="size-4 text-danger" /> },
  success: {
    cls: 'border-success/30 bg-success-soft',
    icon: <CircleCheck className="size-4 text-success" />,
  },
  accent: { cls: 'border-accent-line/60 bg-accent-soft', icon: <Info className="size-4 text-accent-text" /> },
};

export function Callout({
  tone = 'info',
  title,
  children,
  action,
  className,
  icon,
}: {
  tone?: keyof typeof CALLOUT_STYLES;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  const style = CALLOUT_STYLES[tone];
  return (
    <div className={cn('flex gap-3 rounded-xl border p-3.5 text-sm', style.cls, className)}>
      <div className="mt-0.5 shrink-0">{icon ?? style.icon}</div>
      <div className="min-w-0 flex-1">
        {title && <div className="font-medium text-fg">{title}</div>}
        {children && <div className={cn('text-fg-muted', title ? 'mt-0.5' : undefined)}>{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-mono text-[10.5px] text-fg-muted">
      {children}
    </kbd>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[13px] font-semibold tracking-wide text-fg-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}
