import { PrismaClient } from '@prisma/client';

/**
 * Memastikan SETIAP user memiliki username unik (idempotent).
 * - Jika user punya email: pakai local-part email (cth. admin@x → "admin").
 * - Jika tidak: slug bertitik dari nama (cth. "Itqi Arradi" → "itqi.arradi").
 * - Konflik duplikat diberi sufiks angka (cth. "budi.santoso2").
 */
export function slugifyUsername(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 30)
    .replace(/^\.+|\.+$/g, '');
  return base || 'user';
}

export async function ensureUsernames(prisma: PrismaClient): Promise<number> {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true, email: true },
  });
  if (users.length === 0) return 0;

  const taken = new Set<string>(
    (await prisma.user.findMany({ where: { username: { not: null } }, select: { username: true } }))
      .map((u) => (u.username || '').toLowerCase())
  );

  let count = 0;
  for (const user of users) {
    let candidate = user.email ? user.email.split('@')[0].toLowerCase() : slugifyUsername(user.name);
    candidate = candidate.replace(/[^a-z0-9._-]/g, '').slice(0, 30) || slugifyUsername(user.name);
    if (taken.has(candidate)) {
      candidate = slugifyUsername(user.name);
    }
    let finalName = candidate;
    let suffix = 2;
    while (taken.has(finalName)) {
      finalName = `${candidate}${suffix++}`;
    }
    await prisma.user.update({ where: { id: user.id }, data: { username: finalName } });
    taken.add(finalName);
    count += 1;
  }
  return count;
}
