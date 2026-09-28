/**
 * VERIFIKASI PROGRAM KERJA 2026 vs workbook resmi (source of truth).
 * Read-only. Memastikan database persis mengikuti "Plugin kerja ... xlsx"
 * (sheet "Plan 2026 (2)") dan melaporkan statistik akhir.
 */
import { readFileSync } from 'node:fs';
import { prisma } from '../src/lib/db/prisma';
import { parseProgramKerjaWorkbook } from '../src/server/import/excelParser';
import { namesMatch } from '../src/server/import/normalizer';

const FILE = 'C:\\Users\\lapto\\Downloads\\Program kerja Distribusi Gas & ORF 2026.xlsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

async function main() {
  let failures = 0;
  const assert = (cond: boolean, name: string, detail?: string) => {
    if (cond) console.log(`[PASS] ${name}`);
    else {
      console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
      failures += 1;
    }
  };

  const parsed = parseProgramKerjaWorkbook(readFileSync(FILE));
  const fileRecs = parsed.records;
  assert(fileRecs.length === 41, `File terbaca: 41 program (aktual ${fileRecs.length})`);
  assert(parsed.year === 2026, `Tahun terbaca sebagai 2026 (aktual ${parsed.year})`);
  assert(parsed.sheets.includes('Plan 2026 (2)'), 'Sheet "Plan 2026 (2)" dipakai');

  const db = await prisma.programKerja.findMany({
    where: { year: 2026 },
    include: { months: { select: { month: true, week: true, target: true, realization: true } } },
    orderBy: [{ category: 'asc' }, { sequence: 'asc' }],
  });

  assert(db.length === 41, `DB berisi 41 program 2026 (aktual ${db.length})`);

  // 1:1 correspondence
  let allMatch = true;
  for (const rec of fileRecs) {
    const m = db.find((d) => d.category === rec.category && namesMatch(d.name, rec.name));
    if (!m) {
      allMatch = false;
      console.log(`   TIDAK MATCH: [${rec.category}] "${rec.name}"`);
    }
  }
  assert(allMatch, 'Setiap program di file punya padanan di DB (by category + nama)');

  // Kategori sesuai Excel
  const catCount = (name: string) => db.filter((d) => d.category === name).length;
  assert(catCount('PENGADAAN') === 6, 'Kategori PENGADAAN = 6', String(catCount('PENGADAAN')));
  assert(catCount('RAPAT_KOORDINASI') === 12, 'Kategori RAPAT KOORDINASI = 12', String(catCount('RAPAT_KOORDINASI')));
  assert(catCount('OPERASIONAL_RUTIN') === 19, 'Kategori OPERASIONAL RUTIN = 19', String(catCount('OPERASIONAL_RUTIN')));
  assert(catCount('AUDIT') === 4, 'Kategori AUDIT = 4', String(catCount('AUDIT')));

  // Plan vs Realisasi total
  let dbPlan = 0;
  let dbReal = 0;
  for (const d of db) {
    for (const m of d.months) {
      if (m.target !== null) dbPlan += 1;
      if (m.realization !== null) dbReal += 1;
    }
  }
  const filePlan = fileRecs.reduce((a, r) => a + r.planPeriods.length, 0);
  const fileReal = fileRecs.reduce((a, r) => a + r.realisasiPeriods.length, 0);
  assert(dbPlan === filePlan, `Total Plan = ${filePlan} (DB ${dbPlan})`);
  assert(dbReal === fileReal, `Total Realisasi = ${fileReal} (DB ${dbReal})`);

  // Per-bulan Plan & Realisasi
  const dbByMonth = Array.from({ length: 12 }, () => ({ plan: 0, real: 0 }));
  for (const d of db) {
    for (const m of d.months) {
      if (m.target !== null) dbByMonth[m.month - 1].plan += 1;
      if (m.realization !== null) dbByMonth[m.month - 1].real += 1;
    }
  }
  const fileByMonth = Array.from({ length: 12 }, () => ({ plan: 0, real: 0 }));
  for (const r of fileRecs) {
    for (const p of r.planPeriods) fileByMonth[p.month - 1].plan += 1;
    for (const p of r.realisasiPeriods) fileByMonth[p.month - 1].real += 1;
  }
  for (let i = 0; i < 12; i++) {
    if (dbByMonth[i].plan !== fileByMonth[i].plan || dbByMonth[i].real !== fileByMonth[i].real) {
      failures += 1;
      console.log(`[FAIL] Bulan ${MONTHS[i]}: DB plan=${dbByMonth[i].plan} real=${dbByMonth[i].real} vs FILE plan=${fileByMonth[i].plan} real=${fileByMonth[i].real}`);
    }
  }
  console.log('   Per-bulan (DB):', MONTHS.map((m, i) => `${m}:P${dbByMonth[i].plan}/R${dbByMonth[i].real}`).join(' '));

  // Desember: Plan ada, Realisasi 0 (sesuai file)
  assert(fileByMonth[11].real === 0, `Desember Realisasi = 0 (file)`);
  assert(fileByMonth[11].plan > 0, `Desember Plan > 0 (file, ${fileByMonth[11].plan})`);

  // Cek setidaknya satu program berisi Plan + Realisasi di periode yang sama
  const coexist = db.filter((d) => d.months.some((m) => m.target !== null && m.realization !== null));
  assert(coexist.length > 0, `${coexist.length} program memiliki Plan + Realisasi di periode yang sama`);

  // Status tersebar sesuai data aktual
  const byStatus = db.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  console.log('   Status:', JSON.stringify(byStatus));

  // ==== LAPORAN AKHIR ====
  console.log('\n================ LAPORAN PROGRAM KERJA ================');
  console.log(`Jumlah program: ${db.length}`);
  console.log(`Kategori: Pengadaan=${catCount('PENGADAAN')}, Rapat Koordinasi=${catCount('RAPAT_KOORDINASI')}, Operasional Rutin=${catCount('OPERASIONAL_RUTIN')}, Audit=${catCount('AUDIT')}`);
  console.log(`Jumlah Plan (sel periode): ${dbPlan}`);
  console.log(`Jumlah Realisasi (sel periode): ${dbReal}`);
  console.log('Plan per bulan:', MONTHS.map((m, i) => `${m}=${dbByMonth[i].plan}`).join(' '));
  console.log('Realisasi per bulan:', MONTHS.map((m, i) => `${m}=${dbByMonth[i].real}`).join(' '));
  console.log('Status:', JSON.stringify(byStatus));
  console.log('=========================================================');
  console.log(failures === 0 ? 'ALL PROGRAM KERJA CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exitCode = failures > 0 ? 1 : 0;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());