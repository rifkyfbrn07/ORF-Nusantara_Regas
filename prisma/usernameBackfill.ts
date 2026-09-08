import { PrismaClient } from '@prisma/client';

/**
 * Memastikan user lama yang masih memiliki username kosong dapat diperbaiki.
 * Setelah migration enforce_user_username, username secara database sudah NOT NULL.
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
    select: { id: true, name: true, email: true, username: true },
  });
  const taken = new Set<string>(users.map((user) => user.username.toLowerCase()));
  let count = 0;

  for (const user of users) {
    if (user.username.trim()) continue;

    let candidate = user.email ? user.email.split('@')[0].toLowerCase() : slugifyUsername(user.name);
    candidate = candidate.replace(/[^a-z0-9._-]/g, '').slice(0, 30) || slugifyUsername(user.name);
    let finalName = candidate;
    let suffix = 2;
    while (taken.has(finalName)) finalName = `${candidate}${suffix++}`.slice(0, 30);

    await prisma.user.update({ where: { id: user.id }, data: { username: finalName } });
    taken.add(finalName);
    count += 1;
  }
  return count;
}
