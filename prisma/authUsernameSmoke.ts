/**
 * Verifikasi username & login lookup (dihapus setelah validasi).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const check = (label: string, cond: boolean) =>
  console.log(`${cond ? 'OK ' : 'FAIL'} ${label}`);

/** Replika logika lookup loginAction (username → nama). */
async function findLoginUser(identifier: string) {
  let user = await prisma.user.findUnique({
    where: { username: identifier.trim() },
  });
  if (!user) {
    const candidates = await prisma.user.findMany({
      where: {
        OR: [
          { username: { equals: identifier.trim(), mode: 'insensitive' } },
          { name: { equals: identifier.trim(), mode: 'insensitive' } },
        ],
      },
      take: 2,
    });
    user = candidates.find((c) => c.isActive) || candidates[0] || null;
  }
  return user;
}

async function main() {
  const noUsername = await prisma.user.count({ where: { username: null } });
  check('Semua user memiliki username (0 tanpa username)', noUsername === 0);

  const total = await prisma.user.count();
  const withUsername = await prisma.user.count({ where: { username: { not: null } } });
  console.log(`users: ${total}, with username: ${withUsername}`);

  for (const id of ['admin', 'manager', 'operator1', 'itqi.arradi']) {
    const u = await findLoginUser(id);
    check(`login via username "${id}" -> ${u ? `${u.name} (${u.role})` : 'NOT FOUND'}`, Boolean(u));
  }

  const byName = await findLoginUser('Itqi Arradi');
  check('login via Nama "Itqi Arradi"', Boolean(byName && byName.role === 'OPERATOR'));

  const byName2 = await findLoginUser('itqi arradi');
  check('login via Nama case-insensitive', Boolean(byName2));

  const wrong = await findLoginUser('nosuchuser');
  check('identifier tidak dikenal -> null', wrong === null);

  // Duplicate username check
  const dup = await prisma.user.groupBy({ by: ['username'], _count: true, where: { username: { not: null } } });
  const dupes = dup.filter((d) => d._count > 1);
  check('Tidak ada username duplikat', dupes.length === 0);

  console.log('\nAUTH/USERNAME SMOKE SELESAI');
}

main()
  .catch((e) => {
    console.error('SMOKE ERROR:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
