/**
 * Content smoke test (dihapus setelah validasi):
 * memastikan HTML halaman memuat data roster & program kerja dari DB.
 * Jalankan: BASE_URL=http://localhost:3100 npx tsx prisma/regasContentSmoke.ts
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

const check = (label: string, cond: boolean) =>
  console.log(`${cond ? 'OK ' : 'FAIL'} ${label}`);

async function fetchHtml(path: string, token: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: `fieldops_session_token=${token}` },
    redirect: 'manual',
    cache: 'no-store',
  });
  if (res.status !== 200) throw new Error(`${path} status ${res.status}`);
  return res.text();
}

async function main() {
  const manager = await prisma.user.findUnique({ where: { email: 'manager@fieldops.local' } });
  const rosterOp = await prisma.user.findUnique({ where: { email: 'itqiarradi@fieldops.local' } });
  if (!manager || !rosterOp) throw new Error('test users missing');
  const managerToken = await makeToken(manager);
  const opToken = await makeToken(rosterOp);

  console.log('--- /manager/jadwal-operator (September) ---');
  const rosterHtml = await fetchHtml('/manager/jadwal-operator?year=2026&month=9', managerToken);
  check('memuat nama M. T Ibrahim', rosterHtml.includes('M. T Ibrahim'));
  check('memuat nama Itqi Arradi', rosterHtml.includes('Itqi Arradi'));
  check('memuat label PAGI (07.00 - 19.00)', rosterHtml.includes('07.00 - 19.00'));
  check('memuat label MALAM (19.00 - 07.00)', rosterHtml.includes('19.00 - 07.00'));
  check('memuat contact person (manager)', rosterHtml.includes('08161404410'));
  check('memuat chip HADIR (manpower coverage)', rosterHtml.includes('HADIR'));
  check('memuat chip BELUM ABSEN', rosterHtml.includes('BELUM ABSEN'));
  check('memuat September 2026', rosterHtml.includes('September 2026'));
  check('memuat badge HSSE MARSHALL', rosterHtml.includes('HSSE MARSHALL') || rosterHtml.includes('HSSE Marshall'));

  console.log('--- /manager/program-kerja ---');
  const progHtml = await fetchHtml('/manager/program-kerja', managerToken);
  check('memuat judul Program Kerja 2026', progHtml.includes('Program Kerja 2026'));
  check('memuat Departemen Distribusi Gas & ORF', progHtml.includes('DEPARTEMEN DISTRIBUSI GAS'));
  check('memuat program Barton Chart', progHtml.includes('Pengadaan Barton Chart'));
  check('memuat program Drill HSSE', progHtml.includes('Kegiatan Drill HSSE'));
  check('memuat keterangan target 6 kali', progHtml.includes('Target pelaksanaan setahun 6 kali'));
  check('memuat kategori A. Pengadaan', progHtml.includes('A. Pengadaan'));
  check('memuat status ON PROGRESS', progHtml.includes('ON PROGRESS'));
  check('memuat status BELUM TERREALISASI', progHtml.includes('BELUM TERREALISASI'));
  check('memuat KPI Belum Terealisasi', progHtml.includes('Belum Terealisasi'));

  console.log('--- /operator/jadwal-saya (Itqi Arradi) ---');
  const selfHtml = await fetchHtml('/operator/jadwal-saya?year=2026&month=9', opToken);
  check('memuat nama sendiri (Itqi Arradi)', selfHtml.includes('Itqi Arradi'));
  check('TIDAK memuat nama operator lain (M. T Ibrahim)', !selfHtml.includes('M. T Ibrahim'));
  check('TIDAK memuat contact operator lain', !selfHtml.includes('081806813068'));
  check('TIDAK menampilkan contact apa pun (showContacts=false)', !selfHtml.includes('08161404410'));
  check('memuat status hari ini', selfHtml.includes('Status Hari Ini'));

  console.log('\nCONTENT SMOKE SELESAI');
}

main()
  .catch((e) => {
    console.error('CONTENT SMOKE ERROR:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
