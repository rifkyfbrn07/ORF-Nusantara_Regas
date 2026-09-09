/**
 * HTTP smoke test role-based access REGAS (dihapus setelah validasi).
 * Jalankan: BASE_URL=http://localhost:3100 npx tsx prisma/regasHttpSmoke.ts
 */
import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const AUTH_SECRET = process.env.AUTH_SECRET!;

async function makeToken(u: { id: string; name: string; email: string | null; employeeId: string; role: string; position: string }) {
  return new SignJWT({ ...u, email: u.email || '', departmentId: null, avatarUrl: null, isActive: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(AUTH_SECRET));
}

async function check(label: string, path: string, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { cookie: `fieldops_session_token=${token}` } : {},
    redirect: 'manual',
    cache: 'no-store',
  });
  console.log(`${res.status}  ${label}  ${path}`);
  return res.status;
}

async function main() {
  const [admin, manager, operator, rosterOp] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@fieldops.local' } }),
    prisma.user.findUnique({ where: { email: 'manager@fieldops.local' } }),
    prisma.user.findUnique({ where: { email: 'operator1@fieldops.local' } }),
    prisma.user.findUnique({ where: { email: 'itqiarradi@fieldops.local' } }),
  ]);
  if (!admin || !manager || !operator || !rosterOp) throw new Error('test users missing');

  const adminToken = await makeToken(admin);
  const managerToken = await makeToken(manager);
  const operatorToken = await makeToken(operator);
  const rosterToken = await makeToken(rosterOp);

  console.log('--- FITUR BARU: PROGRAM KERJA ---');
  const s1 = await check('manager', '/manager/program-kerja', managerToken);
  const s2 = await check('admin', '/manager/program-kerja', adminToken);
  const s3 = await check('operator(dilarang)', '/manager/program-kerja', operatorToken);
  const s4 = await check('anonymous(dilarang)', '/manager/program-kerja');
  if (s1 !== 200 || s2 !== 200) throw new Error('manager/admin harus 200');
  if (s3 === 200 || s4 === 200) throw new Error('operator/anon tidak boleh 200');

  console.log('--- FITUR BARU: JADWAL OPERATOR ---');
  const s5 = await check('manager', '/manager/jadwal-operator', managerToken);
  const s6 = await check('admin', '/manager/jadwal-operator', adminToken);
  const s7 = await check('manager (Okt)', '/manager/jadwal-operator?year=2026&month=10', managerToken);
  const s8 = await check('operator(dilarang)', '/manager/jadwal-operator', operatorToken);
  const s9 = await check('anonymous(dilarang)', '/manager/jadwal-operator');
  if (s5 !== 200 || s6 !== 200 || s7 !== 200) throw new Error('manager/admin harus 200');
  if (s8 === 200 || s9 === 200) throw new Error('operator/anon tidak boleh 200');

  console.log('--- FITUR BARU: JADWAL SAYA (OPERATOR) ---');
  const s10 = await check('roster operator', '/operator/jadwal-saya', rosterToken);
  const s11 = await check('roster operator (Okt)', '/operator/jadwal-saya?year=2026&month=10', rosterToken);
  const s12 = await check('operator lama', '/operator/jadwal-saya', operatorToken);
  const s13 = await check('anonymous(dilarang)', '/operator/jadwal-saya');
  if (s10 !== 200 || s11 !== 200 || s12 !== 200) throw new Error('operator harus 200');
  if (s13 === 200) throw new Error('anon tidak boleh 200');

  console.log('--- OPERATOR PROGRAM KERJA (ditugaskan) ---');
  const s14 = await check('roster operator (assigned)', '/operator/program-kerja', rosterToken);
  const s15 = await check('operator lama', '/operator/program-kerja', operatorToken);
  const s16 = await check('anonymous(dilarang)', '/operator/program-kerja');
  if (s14 !== 200 || s15 !== 200) throw new Error('operator harus 200');
  if (s16 === 200) throw new Error('anon tidak boleh 200');

  console.log('--- ADMIN FULL ACCESS ---');
  await check('admin manager/dashboard', '/manager/dashboard', adminToken);
  await check('admin manager/schedules', '/manager/schedules', adminToken);
  await check('admin manager/workforce', '/manager/workforce', adminToken);
  await check('admin manager/notifications', '/manager/notifications', adminToken);
  await check('admin operator/jadwal-saya', '/operator/jadwal-saya', adminToken);

  console.log('--- OPERATOR DILARANG DI AREA MANAGER ---');
  const opBlocked = await check('operator manager/dashboard (dilarang)', '/manager/dashboard', operatorToken);
  const opBlocked2 = await check('operator manager/schedules (dilarang)', '/manager/schedules', operatorToken);
  if (opBlocked === 200 || opBlocked2 === 200) throw new Error('operator tidak boleh akses manager area');

  console.log('--- FITUR EXISTING (TIDAK RUSAK) ---');
  await check('manager dashboard', '/manager/dashboard', managerToken);
  await check('manager schedules', '/manager/schedules', managerToken);
  await check('manager workforce', '/manager/workforce', managerToken);
  await check('manager attendance', '/manager/attendance', managerToken);
  await check('operator dashboard', '/operator/dashboard', operatorToken);
  await check('operator attendance', '/operator/attendance', operatorToken);
  await check('admin dashboard', '/admin/dashboard', adminToken);
  await check('admin users', '/admin/users', adminToken);

  console.log('\nHTTP SMOKE SELESAI — semua otorisasi OK');
}

main()
  .catch((e) => {
    console.error('HTTP SMOKE ERROR:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
