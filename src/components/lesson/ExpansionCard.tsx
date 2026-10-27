import { RotateCcw, Trash2 } from 'lucide-react';
import { EXPANSION_META } from '@/domain/labels';
import type { ExpansionKind } from '@/domain/schemas';
import { cn } from '@/lib/cn';
import { Markdown } from '../markdown/Markdown';
import { Button, IconButton } from '../ui/Button';
import { EXPANSION_ICONS } from './expansionIcons';

export function ExpansionCard({
  kind,
  selection,
  question,
  content,
  streaming,
  error,
  onRemove,
  onRetry,
}: {
  kind: ExpansionKind;
  selection: string;
  question: string;
  content: string;
  streaming?: boolean;
  error?: string | null;
  onRemove?: () => void;
  onRetry?: () => void;
}) {
  return (
    <article className="animate-fade-in rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-fg">
          <span className="text-accent-text">{EXPANSION_ICONS[kind]}</span>
          {EXPANSION_META[kind].label}
        </div>
        {onRemove && !streaming && (
          <IconButton label="Quitar" size="sm" onClick={onRemove}>
            <Trash2 className="size-3.5" />
          </IconButton>
        )}
      </header>
      <div className="px-4 py-3">
        {(selection || question) && (
          <blockquote className="mb-3 border-l-2 border-accent-line pl-3 text-[13px] text-fg-muted italic">
            {question
              ? `«${question}»`
              : `«${selection.length > 280 ? `${selection.slice(0, 280)}…` : selection}»`}
          </blockquote>
        )}
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-danger">
            {error}
            {onRetry && (
              <Button
                size="xs"
                variant="secondary"
                icon={<RotateCcw className="size-3.5" />}
                onClick={onRetry}
              >
                Reintentar
              </Button>
            )}
          </div>
        ) : content ? (
          <div className={cn(streaming && 'stream-caret')}>
            <Markdown content={content} streaming={streaming} compact />
          </div>
        ) : (
          <div className="space-y-2" aria-label="Generando">
            <div className="skeleton h-3.5 w-11/12" />
            <div className="skeleton h-3.5 w-9/12" />
            <div className="skeleton h-3.5 w-10/12" />
          </div>
        )}
      </div>
    </article>
  );
}
