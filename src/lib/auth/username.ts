/**
 * Slug username bertitik dari nama: "Itqi Arradi" → "itqi.arradi".
 * Aman dipakai di client & server (tanpa dependency).
 */
export function slugifyUsername(name: string): string {
  const base = (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 30)
    .replace(/^\.+|\.+$/g, '');
  return base || 'user';
}
