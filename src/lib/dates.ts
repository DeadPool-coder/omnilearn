const DAY_MS = 24 * 60 * 60 * 1000;

/** Clave de día local YYYY-MM-DD (la racha se cuenta en la zona horaria del usuario). */
export function dayKey(date: Date | number = new Date()): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date | number = new Date()): Date {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date | number = new Date()): Date {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  d.setHours(23, 59, 59, 999);
  return d;
}

/** "hace 3 min", "ayer", "hace 2 semanas"… */
export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diff = timestamp - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * DAY_MS],
    ['month', 30 * DAY_MS],
    ['week', 7 * DAY_MS],
    ['day', DAY_MS],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return diff >= 0 ? 'en unos segundos' : 'hace un momento';
}

/** Intervalo compacto para botones de repaso: "1 min", "10 min", "3 h", "4 d", "2,5 m". */
export function formatInterval(ms: number): string {
  const minutes = ms / 60000;
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)} d`;
  const months = days / 30;
  if (months < 12) return `${months.toFixed(1).replace('.', ',').replace(',0', '')} m`;
  const years = days / 365;
  return `${years.toFixed(1).replace('.', ',').replace(',0', '')} a`;
}

export function formatDate(
  timestamp: number,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat('es', opts).format(new Date(timestamp));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export { DAY_MS };
