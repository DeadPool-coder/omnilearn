/**
 * Visualizaciones del panel. Reglas aplicadas (skill de dataviz):
 *  - Números sueltos → fichas (no gráficos). Cifras grandes con dígitos proporcionales.
 *  - Mapa de calor: rampa secuencial de un solo tono (violeta), validada con validate_palette.js
 *    (--ordinal) en ambos modos; leyenda de escala; tooltip por celda en hover y foco; vista de tabla.
 *  - Calibración: barras finas (≤ 24 px) de un solo color + marca de "esperado"; leyenda para las
 *    dos codificaciones; valores en texto (nunca en el color de la serie); vista de tabla.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, Info, Table2, TriangleAlert } from 'lucide-react';
import type { Calibration } from '@/domain/stats';
import { activityHeatmap } from '@/domain/stats';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Ficha de estadística
// ---------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-fg-muted">{label}</span>
        {icon && (
          <span className={cn('[&>svg]:size-4', accent ? 'text-accent-text' : 'text-fg-faint')}>{icon}</span>
        )}
      </div>
      <div className="mt-2 text-[28px] leading-none font-semibold tracking-tight text-fg">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-fg-muted">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip compartido
// ---------------------------------------------------------------------------

interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (target: Element, content: ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (!box) return;
    setTip({ x: rect.left - box.left + rect.width / 2, y: rect.top - box.top, content });
  };
  const hide = () => setTip(null);
  const node = tip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-[var(--shadow-pop)]"
      style={{ left: tip.x, top: tip.y - 6 }}
    >
      {tip.content}
    </div>
  ) : null;
  return { ref, show, hide, node };
}

function TableToggle({
  open,
  onToggle,
  controls,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs whitespace-nowrap text-fg-muted hover:bg-surface-2 hover:text-fg"
    >
      <Table2 className="size-3.5" />
      {open ? 'Ver gráfico' : 'Ver tabla'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Mapa de calor de actividad
// ---------------------------------------------------------------------------

const HEAT_CLASSES = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'];
const WEEKDAYS = ['L', '', 'X', '', 'V', '', 'D'];

function heatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function activityLabel(count: number) {
  return count === 1 ? '1 actividad' : `${count} actividades`;
}

const CELL = 13;
const GAP = 3;

/** Número de semanas que caben en el ancho disponible (entre 8 y 53). */
function useWeeksThatFit(ref: React.RefObject<HTMLElement | null>) {
  const [weeks, setWeeks] = useState(16);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width - 22; // columna de días
      setWeeks(Math.max(8, Math.min(53, Math.floor((width + GAP) / (CELL + GAP)))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return weeks;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function ActivityHeatmap({ activityByDay }: { activityByDay: Map<string, number> }) {
  const { ref, show, hide, node } = useTooltip();
  const [asTable, setAsTable] = useState(false);
  const tableId = useId();
  const sizer = useRef<HTMLDivElement>(null);
  const weeks = useWeeksThatFit(sizer);
  const columns = activityHeatmap(activityByDay, weeks);
  const total = columns.flat().reduce((acc, d) => acc + Math.max(0, d.count), 0);
  const activeDays = columns.flat().filter((d) => d.count > 0).length;

  return (
    <figure className="m-0" ref={sizer}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <figcaption>
          <div className="text-sm font-semibold text-fg">Actividad de estudio</div>
          <div className="mt-0.5 text-xs text-fg-muted">
            {plural(activeDays, 'día activo', 'días activos')} · {activityLabel(total)} en las últimas{' '}
            {columns.length} semanas
          </div>
        </figcaption>
        <TableToggle open={asTable} onToggle={() => setAsTable((v) => !v)} controls={tableId} />
      </div>

      {asTable ? (
        <div id={tableId} className="max-h-64 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Semana del</th>
                <th className="px-3 py-2 text-right font-medium">Días activos</th>
                <th className="px-3 py-2 text-right font-medium">Actividades</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...columns].reverse().map((week) => {
                const days = week.filter((d) => d.count > 0).length;
                const sum = week.reduce((acc, d) => acc + Math.max(0, d.count), 0);
                return (
                  <tr key={week[0].key} className="border-t border-line">
                    <td className="px-3 py-1.5 text-fg">
                      {formatDate(week[0].date.getTime(), { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-3 py-1.5 text-right text-fg-muted">{days}</td>
                    <td className="px-3 py-1.5 text-right text-fg-muted">{sum}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative">
          <div
            className="flex gap-[3px] overflow-x-auto pb-1"
            role="grid"
            aria-label="Mapa de calor de actividad diaria"
          >
            <div className="mr-1 grid grid-rows-7 gap-[3px] text-[10px] text-fg-faint" aria-hidden>
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="flex h-[13px] items-center leading-none">
                  {d}
                </span>
              ))}
            </div>
            {columns.map((week) => (
              <div key={week[0].key} role="row" className="grid grid-rows-7 gap-[3px]">
                {week.map((day) => {
                  if (day.count < 0) return <span key={day.key} className="size-[13px]" aria-hidden />;
                  const label = `${formatDate(day.date.getTime(), { weekday: 'long', day: 'numeric', month: 'long' })}: ${activityLabel(day.count)}`;
                  return (
                    <span
                      key={day.key}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={label}
                      onPointerEnter={(e) => show(e.currentTarget, label)}
                      onPointerLeave={hide}
                      onFocus={(e) => show(e.currentTarget, label)}
                      onBlur={hide}
                      className={cn(
                        'size-[13px] rounded-[3px] outline-offset-1 transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-accent',
                        HEAT_CLASSES[heatLevel(day.count)],
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {node}
          <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-fg-faint" aria-hidden>
            Menos
            {HEAT_CLASSES.map((c) => (
              <span key={c} className={cn('size-[11px] rounded-[3px]', c)} />
            ))}
            Más
          </div>
        </div>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Calibración
// ---------------------------------------------------------------------------

function calibrationVerdict(
  cal: Calibration,
): { tone: 'success' | 'warning' | 'info'; label: string; detail: string } | null {
  if (cal.bias === null || cal.total < 5) return null;
  const pts = Math.round(Math.abs(cal.bias) * 100);
  if (cal.bias > 0.08)
    return {
      tone: 'warning',
      label: 'Sobreconfianza',
      detail: `Tu confianza supera tu acierto en unos ${pts} puntos.`,
    };
  if (cal.bias < -0.08)
    return {
      tone: 'info',
      label: 'Infraconfianza',
      detail: `Aciertas unos ${pts} puntos más de lo que crees.`,
    };
  return { tone: 'success', label: 'Bien calibrado', detail: 'Tu confianza coincide con tus aciertos.' };
}

export function CalibrationChart({ calibration }: { calibration: Calibration }) {
  const { ref, show, hide, node } = useTooltip();
  const [asTable, setAsTable] = useState(false);
  const tableId = useId();
  const verdict = calibrationVerdict(calibration);
  const VerdictIcon =
    verdict?.tone === 'success' ? CircleCheck : verdict?.tone === 'warning' ? TriangleAlert : Info;

  return (
    <figure className="m-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <figcaption>
          <div className="text-sm font-semibold text-fg">Calibración de tu confianza</div>
          <div className="mt-0.5 text-xs text-fg-muted">
            Acierto real según la confianza que declaras en los quizzes ({calibration.total} respuestas)
          </div>
        </figcaption>
        <TableToggle open={asTable} onToggle={() => setAsTable((v) => !v)} controls={tableId} />
      </div>

      {asTable ? (
        <div id={tableId} className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Confianza</th>
                <th className="px-3 py-2 text-right font-medium">Respuestas</th>
                <th className="px-3 py-2 text-right font-medium">Acierto real</th>
                <th className="px-3 py-2 text-right font-medium">Esperado</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {calibration.buckets.map((b) => (
                <tr key={b.confidence} className="border-t border-line">
                  <td className="px-3 py-1.5 text-fg">{b.label}</td>
                  <td className="px-3 py-1.5 text-right text-fg-muted">{b.total}</td>
                  <td className="px-3 py-1.5 text-right text-fg-muted">
                    {b.accuracy === null ? '—' : `${Math.round(b.accuracy * 100)} %`}
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg-muted">{Math.round(b.expected * 100)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative space-y-3">
          {calibration.buckets.map((b) => {
            const actual = b.accuracy === null ? null : Math.round(b.accuracy * 100);
            const expected = Math.round(b.expected * 100);
            const label =
              actual === null
                ? `${b.label}: sin respuestas todavía`
                : `${b.label}: ${b.correct} de ${b.total} correctas (${actual} %), esperado ${expected} %`;
            return (
              <div key={b.confidence}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-fg">{b.label}</span>
                  <span className="text-fg-muted">
                    {actual === null ? 'sin datos' : `${actual} % real`} · {expected} % esperado
                  </span>
                </div>
                <div
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  onPointerEnter={(e) => show(e.currentTarget, label)}
                  onPointerLeave={hide}
                  onFocus={(e) => show(e.currentTarget, label)}
                  onBlur={hide}
                  className="relative h-5 rounded-[4px] bg-accent-soft py-[3px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {actual !== null && (
                    <div
                      className="h-full rounded-r-[4px] bg-accent transition-[width] duration-500"
                      style={{ width: `${Math.max(actual, 1)}%` }}
                    />
                  )}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-fg"
                    style={{ left: `${expected}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
          {node}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-fg-muted" aria-hidden>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-accent" /> Acierto real
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded-full bg-fg" /> Confianza declarada
            </span>
          </div>
        </div>
      )}

      {verdict && (
        <div
          className={cn(
            'mt-4 flex items-start gap-2 rounded-lg border p-2.5 text-xs',
            verdict.tone === 'success' && 'border-success/30 bg-success-soft',
            verdict.tone === 'warning' && 'border-warning/30 bg-warning-soft',
            verdict.tone === 'info' && 'border-info/30 bg-info-soft',
          )}
        >
          <VerdictIcon
            className={cn(
              'mt-px size-3.5 shrink-0',
              verdict.tone === 'success'
                ? 'text-success'
                : verdict.tone === 'warning'
                  ? 'text-warning'
                  : 'text-info',
            )}
          />
          <span className="text-fg">
            <strong className="font-semibold">{verdict.label}.</strong>{' '}
            <span className="text-fg-muted">{verdict.detail}</span>
          </span>
        </div>
      )}
    </figure>
  );
}
