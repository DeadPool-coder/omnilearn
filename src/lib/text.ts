/** Minúsculas y sin acentos, para búsquedas tolerantes ("energia" encuentra "energía"). */
export function normalizeForSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const h = normalizeForSearch(haystack);
  return q.split(/\s+/).every((term) => h.includes(term));
}

export function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Recorta un texto largo conservando el principio y el final (útil para contexto de prompts). */
export function truncateMiddle(value: string, max: number): string {
  if (value.length <= max) return value;
  const half = Math.floor((max - 20) / 2);
  return `${value.slice(0, half)}\n\n[… contenido recortado …]\n\n${value.slice(-half)}`;
}

export function capitalize(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase('es') + value.slice(1) : value;
}

/** Descarga un objeto como archivo JSON desde el navegador. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(value: string): string {
  return normalizeForSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
