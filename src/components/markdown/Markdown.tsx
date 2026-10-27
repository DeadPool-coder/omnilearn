/**
 * Renderizador de Markdown enriquecido para lecciones:
 * GFM (tablas, listas de tareas), LaTeX con KaTeX, código con resaltado, diagramas Mermaid
 * (cargados bajo demanda) y "callouts" para los conceptos clave.
 *
 * Seguridad: no se interpreta HTML crudo del modelo (sin rehype-raw); los enlaces se abren en
 * pestaña nueva con rel="noopener"; Mermaid se renderiza con securityLevel "strict".
 */
import { memo, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSettings } from '@/stores/settings';
import { MermaidBlock } from './MermaidBlock';

interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function hastText(node: HastNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(hastText).join('');
}

function CodeBlock({ lang, raw, children }: { lang: string; raw: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // portapapeles no disponible
    }
  };
  return (
    <div className="not-prose group my-5 overflow-hidden rounded-xl border border-line bg-code-bg">
      <div className="flex h-8 items-center justify-between border-b border-line px-3">
        <span className="font-mono text-[11px] tracking-wide text-fg-faint uppercase">
          {lang || 'código'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label="Copiar código"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

function calloutKind(text: string): string | undefined {
  const start = text.trim().slice(0, 40).toLowerCase();
  if (start.startsWith('concepto clave') || start.startsWith('key concept') || start.startsWith('definición'))
    return 'concept';
  if (start.startsWith('nota') || start.startsWith('modo demostración') || start.startsWith('dato'))
    return 'note';
  if (start.startsWith('atención') || start.startsWith('cuidado') || start.startsWith('advertencia'))
    return 'warning';
  return undefined;
}

function buildComponents(streaming: boolean): Components {
  return {
    pre({ node, children }) {
      const code = (node as HastNode | undefined)?.children?.[0];
      const classes = (code?.properties?.className as string[] | undefined) ?? [];
      const lang = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length) ?? '';
      const raw = hastText(code).replace(/\n$/, '');
      if (lang === 'mermaid') {
        return streaming ? (
          <div className="my-5 rounded-xl border border-dashed border-line p-4 text-center text-xs text-fg-faint">
            El diagrama se mostrará al terminar de generar la lección…
          </div>
        ) : (
          <MermaidBlock code={raw} />
        );
      }
      return (
        <CodeBlock lang={lang} raw={raw}>
          {children}
        </CodeBlock>
      );
    },
    table({ children }) {
      return (
        <div className="table-wrap">
          <table>{children}</table>
        </div>
      );
    },
    blockquote({ node, children }) {
      return <blockquote data-callout={calloutKind(hastText(node as HastNode))}>{children}</blockquote>;
    },
    a({ href, children }) {
      const external = !!href && /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    },
  };
}

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [
  [rehypeKatex, { throwOnError: false, strict: 'ignore' }],
  [rehypeHighlight, { plainText: ['mermaid', 'text', 'txt', 'plaintext'] }],
] as const;

export const Markdown = memo(function Markdown({
  content,
  streaming = false,
  compact = false,
  className,
}: {
  content: string;
  streaming?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const readingFont = useSettings((s) => s.readingFont);
  const textSize = useSettings((s) => s.textSize);
  const components = useMemo(() => buildComponents(streaming), [streaming]);
  return (
    <div
      className={cn('prose-ol', className)}
      data-font={readingFont}
      data-size={textSize}
      data-compact={compact || undefined}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- las tuplas de plugins no encajan con el tipo de unified
        rehypePlugins={rehypePlugins as any}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
