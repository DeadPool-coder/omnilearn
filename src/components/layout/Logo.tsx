import { useId } from 'react';
import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  // ID único por instancia: un degradado con id repetido dentro de un nodo oculto no se pinta.
  const gradientId = `omni-g-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={cn('size-7', className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b7cf6" />
          <stop offset="1" stopColor="#3fb6a8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="var(--ol-surface-3)" />
      <circle cx="32" cy="32" r="15" fill="none" stroke={`url(#${gradientId})`} strokeWidth="6" />
      <circle cx="45" cy="19" r="5" fill="#f2c94c" />
    </svg>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-fg">Omnilearn</span>}
    </div>
  );
}
