import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'soft';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-[var(--shadow-card)] disabled:opacity-60',
  secondary:
    'bg-surface-2 text-fg border border-line hover:bg-surface-3 hover:border-line-strong disabled:opacity-60',
  outline: 'border border-line-strong text-fg hover:bg-surface-2 disabled:opacity-60',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-2 disabled:opacity-50',
  soft: 'bg-accent-soft text-accent-text hover:bg-accent-soft/80 border border-accent-line/60 disabled:opacity-60',
  danger: 'bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20 disabled:opacity-60',
};

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading,
    icon,
    iconRight,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'secondary';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', variant = 'ghost', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50',
        size === 'sm' ? 'size-7' : 'size-9',
        variant === 'ghost'
          ? 'text-fg-muted hover:bg-surface-2 hover:text-fg'
          : 'border border-line bg-surface-2 text-fg hover:bg-surface-3',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
