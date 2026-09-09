/** Verifikasi username-only authentication lookup. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const check = (label: string, condition: boolean) => console.log(`${condition ? 'OK ' : 'FAIL'} ${label}`);

<<<<<<< HEAD
=======
/** Replika logika lookup loginAction — HANYA username (email/nama bukan credential). */
>>>>>>> f728c28 (coba)
async function findLoginUser(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return prisma.user.findFirst({
    where: { username: normalized, isActive: true },
  });
<<<<<<< HEAD
=======
  if (!user) {
    const candidates = await prisma.user.findMany({
      where: { username: { equals: identifier.trim(), mode: 'insensitive' } },
      take: 2,
    });
    user = candidates.find((c) => c.isActive) || candidates[0] || null;
  }
  return user;
>>>>>>> f728c28 (coba)
}

async function main() {
  const total = await prisma.user.count();
  const emptyUsernames = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "User" WHERE btrim("username") = ''
  `;
  const emptyCount = Number(emptyUsernames[0]?.count ?? 0n);
  check('Semua user memiliki username', emptyCount === 0);

  const duplicateRows = await prisma.$queryRaw<Array<{ username: string; count: bigint }>>`
    SELECT "username", COUNT(*)::bigint AS count
    FROM "User"
    GROUP BY "username"
    HAVING COUNT(*) > 1
  `;
  check('Tidak ada username duplikat', duplicateRows.length === 0);
  console.log(`users: ${total}`);

  for (const username of ['admin', 'manager', 'operator1', 'itqi.arradi']) {
    const user = await findLoginUser(username);
    check(`login via username "${username}"`, Boolean(user));
  }

<<<<<<< HEAD
=======
  const byName = await findLoginUser('Itqi Arradi');
  check('Login via Nama harus GAGAL (nama bukan credential)', byName === null);

>>>>>>> f728c28 (coba)
  const wrong = await findLoginUser('nosuchuser');
  check('username tidak dikenal -> null', wrong === null);

  console.log('\nAUTH/USERNAME SMOKE SELESAI');
}

main()
  .catch((error) => {
    console.error('SMOKE ERROR:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
