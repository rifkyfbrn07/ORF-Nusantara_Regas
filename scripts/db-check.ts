// Cek kondisi DB Program Kerja saat ini.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.programKerja.count();
  const byCategory = await prisma.programKerja.groupBy({ by: ['category'], _count: true });
  const months = await prisma.programKerjaMonth.count();
  const programs = await prisma.programKerja.findMany({ orderBy: [{ category: 'asc' }, { sequence: 'asc' }] });
  console.log('total=' + total, 'months=' + months);
  console.log('byCategory=' + JSON.stringify(byCategory));
  console.log('--- NAMA PROGRAM ---');
  for (const p of programs) console.log(p.category + ' | ' + p.sequence + ' | ' + p.name);
}
main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());