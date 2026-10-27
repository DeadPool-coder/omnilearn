import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router';
import { Menu as MenuIcon, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSettings } from '@/stores/settings';
import { Spinner } from '../ui/primitives';
import { Logo } from './Logo';
import { Sidebar } from './Sidebar';

export function PageFallback() {
  return (
    <div className="grid h-[60vh] place-items-center">
      <Spinner label="Cargando…" />
    </div>
  );
}

export function AppShell() {
  const collapsedPref = useSettings((s) => s.sidebarCollapsed);
  const inLesson = !!useMatch('/course/:courseId/lesson/:lessonId');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  // En la vista de lección la barra global se reduce a iconos para dejar sitio al temario.
  const collapsed = collapsedPref || inLesson;

  // Cerrar el menú móvil al cambiar de página (ajuste de estado durante el render, patrón recomendado por React).
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-dvh bg-canvas text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      {/* Escritorio */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 border-r border-line bg-surface transition-[width] duration-200 lg:block',
          collapsed ? 'w-[60px]' : 'w-[248px]',
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      {/* Móvil */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-fg-muted hover:bg-surface-2"
          aria-label="Abrir menú"
        >
          <MenuIcon className="size-5" />
        </button>
        <Logo />
        <div className="w-9" />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-[280px] border-r border-line bg-surface">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 rounded-lg p-1.5 text-fg-muted hover:bg-surface-2"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
            <Sidebar collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main id="main" className="min-w-0 flex-1 pt-14 lg:pt-0">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/** Contenedor estándar de página con márgenes y ancho máximo. */
export function Page({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10',
        wide ? 'max-w-7xl' : 'max-w-5xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] text-fg-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
