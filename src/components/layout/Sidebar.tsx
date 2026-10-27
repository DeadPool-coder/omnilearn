import { NavLink, Link } from 'react-router';
import {
  LayoutDashboard,
  Library,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Repeat,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { courseProgress } from '@/domain/progress';
import { useAIConfig } from '@/hooks/useAIConfig';
import { useCourses, useDueCount } from '@/hooks/useData';
import { useResolvedTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { useSettings } from '@/stores/settings';
import { Logo } from './Logo';

function NavItem({
  to,
  icon,
  label,
  collapsed,
  badge,
  end,
  onNavigate,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  badge?: number;
  end?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
          isActive ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <span className="[&>svg]:size-[17px]">{icon}</span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!!badge && (
        <span
          className={cn(
            'rounded-full bg-accent px-1.5 text-[10.5px] leading-[18px] font-semibold text-accent-fg',
            collapsed && 'absolute -top-1 -right-1 px-1 leading-4',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar({
  collapsed,
  onNavigate,
  mobile,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const courses = useCourses();
  const due = useDueCount();
  const { meta, config, isDemo } = useAIConfig();
  const theme = useResolvedTheme();
  const setTheme = useSettings((s) => s.setTheme);
  const setPreference = useSettings((s) => s.setPreference);
  const active = (courses ?? []).filter((c) => c.status === 'active').slice(0, 8);

  return (
    <nav className="flex h-full flex-col" aria-label="Navegación principal">
      <div className={cn('flex h-14 items-center px-3', collapsed ? 'justify-center' : 'justify-between')}>
        <Link to="/" onClick={onNavigate} aria-label="Omnilearn, inicio">
          <Logo collapsed={collapsed} />
        </Link>
        {!collapsed && !mobile && (
          <button
            type="button"
            onClick={() => setPreference('sidebarCollapsed', true)}
            className="rounded-md p-1 text-fg-faint hover:bg-surface-2 hover:text-fg"
            aria-label="Contraer barra lateral"
            title="Contraer barra lateral"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <div className="space-y-0.5 px-2">
        <NavItem
          to="/"
          end
          icon={<LayoutDashboard />}
          label="Inicio"
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavItem to="/new" icon={<Plus />} label="Nueva ruta" collapsed={collapsed} onNavigate={onNavigate} />
        <NavItem
          to="/review"
          icon={<Repeat />}
          label="Repaso"
          collapsed={collapsed}
          badge={due}
          onNavigate={onNavigate}
        />
        <NavItem
          to="/library"
          icon={<Library />}
          label="Biblioteca"
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavItem
          to="/settings"
          icon={<Settings />}
          label="Ajustes"
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>

      {!collapsed && (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-2">
          <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-fg-faint uppercase">
            Mis rutas
          </div>
          {active.length === 0 && (
            <p className="px-2.5 py-1 text-xs text-fg-faint">Aún no tienes rutas activas.</p>
          )}
          <div className="space-y-0.5">
            {active.map((course) => {
              const p = courseProgress(course);
              return (
                <NavLink
                  key={course.course_id}
                  to={`/course/${course.course_id}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-2.5 py-1.5 transition-colors',
                      isActive ? 'bg-surface-3' : 'hover:bg-surface-2',
                    )
                  }
                >
                  <div className="truncate text-[13px] text-fg">{course.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${p.percent}%` }} />
                    </div>
                    <span className="text-[10.5px] text-fg-faint tabular-nums">{p.percent}%</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
      {collapsed && <div className="flex-1" />}

      <div className={cn('border-t border-line p-2', collapsed && 'flex flex-col items-center gap-1')}>
        <Link
          to="/settings"
          onClick={onNavigate}
          title={`Proveedor de IA: ${meta.label}`}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-surface-2',
            collapsed && 'justify-center px-2',
          )}
        >
          <Sparkles className={cn('size-4 shrink-0', isDemo ? 'text-warning' : 'text-success')} />
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{meta.label}</span>
              <span className="block truncate text-fg-faint">
                {isDemo ? 'Sin IA · plantillas' : config.model}
              </span>
            </span>
          )}
        </Link>
        <div className={cn('flex items-center gap-1', !collapsed && 'mt-1 px-1')}>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {collapsed && !mobile && (
            <button
              type="button"
              onClick={() => setPreference('sidebarCollapsed', false)}
              className="rounded-lg p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Expandir barra lateral"
              title="Expandir barra lateral"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
