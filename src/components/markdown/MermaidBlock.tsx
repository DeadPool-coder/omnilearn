import { useEffect, useState } from 'react';
import { useResolvedTheme } from '@/hooks/useTheme';

import type mermaidDefault from 'mermaid';

type MermaidApi = typeof mermaidDefault;

let mermaidPromise: Promise<MermaidApi> | null = null;
function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import('mermaid').then((m) => m.default);
  return mermaidPromise;
}

let counter = 0;

/** Diagrama Mermaid renderizado bajo demanda. Si la sintaxis es inválida, muestra el código. */
export function MermaidBlock({ code }: { code: string }) {
  const theme = useResolvedTheme();
  const [state, setState] = useState<{ svg?: string; error?: boolean }>({});

  useEffect(() => {
    let cancelled = false;
    const id = `omni-mermaid-${++counter}`;
    (async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: theme === 'dark' ? 'dark' : 'neutral',
          fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif',
        });
        const { svg } = await mermaid.render(id, code.trim());
        if (!cancelled) setState({ svg });
      } catch {
        if (!cancelled) setState({ error: true });
      } finally {
        document.getElementById(`d${id}`)?.remove();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (state.error) {
    return (
      <div className="my-5 overflow-hidden rounded-xl border border-line bg-code-bg">
        <div className="border-b border-line px-3 py-1.5 text-[11px] text-fg-faint">
          Diagrama (no se pudo dibujar; se muestra el código)
        </div>
        <pre className="font-mono text-xs">{code}</pre>
      </div>
    );
  }
  if (!state.svg) return <div className="skeleton my-5 h-40 w-full" aria-label="Cargando diagrama" />;
  return (
    <figure
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-line bg-surface p-4 [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
