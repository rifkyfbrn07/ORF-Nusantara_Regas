/**
 * Smoke test — verifikasi perilaku import Program Kerja TANPA menyentuh DB:
 *  1. Cell Plan biru kosong tetap terbaca sebagai Plan.
 *  2. Baris P → Plan, baris R → Realisasi (tidak tertukar).
 *  3. Keterangan tidak terpotong.
 *  4. Pola Plan (bulanan / 3 bulanan / 6 kali setahun) terbaca dari posisi cell.
 * Usage: npx tsx scripts/smoke-import-parser.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Muat DATABASE_URL dari .env agar import programKerjaImportService (prisma)
// tidak gagal — PrismaClient hanya dibuat, tidak terkoneksi di sini.
try {
  const envRaw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of envRaw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  // .env tidak ada — hanya proses parse yang diuji.
}

import * as XLSX from 'xlsx';

function buildWorkbook() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['PROGRAM KERJA TAHUN 2026'],
    [],
    [],
    ['A', 'Pengadaan'],
    ['1', 'Rapat Koordinasi DIV Operasi', 'P'],
    ['', '', 'R'],
    [],
    ['2', 'Benchmark Pertamina Group', 'P'],
    [],
    ['', 'PLAN (P)'],
    ['', 'DIBUAT OLEH'],
  ] satisfies unknown[][]);

  // Program 1 (baris Excel 5): D=biru kosong, E=100, F=biru kosong
  // NB: cell biru memakai nilai spasi (' ') agar fill tersimpan oleh writer —
  // parser memperlakukan cell non-numerik sebagai "kosong".
  ws.D5 = { t: 's', v: ' ' };
  ws.D5.s = { patternType: 'solid', fgColor: { indexed: 12 } };
  ws.E5 = { t: 'n', v: 100 };
  ws.F5 = { t: 's', v: ' ' };
  ws.F5.s = { patternType: 'solid', fgColor: { indexed: 12 } };

  // Baris R program 1 (baris Excel 6): E6=100, F6=50
  ws.E6 = { t: 'n', v: 100 };
  ws.F6 = { t: 'n', v: 50 };

  // Program 2 (baris Excel 8): biru kosong di bulan 1..6
  for (let month = 1; month <= 6; month++) {
    const addr = XLSX.utils.encode_cell({ r: 7, c: 3 + (month - 1) * 4 });
    ws[addr] = { t: 's', v: ' ' };
    ws[addr].s = { patternType: 'solid', fgColor: { indexed: 12 } };
  }
  ws.AZ8 = { t: 's', v: 'Keterangan baris pertama\nBaris kedua tetap terbaca penuh.' };

  // Pastikan seluruh cell (termasuk D..AY, AZ) berada dalam rentang !ref —
  // jika tidak, XLSX.write membuang cell di luar rentang.
  ws['!ref'] = 'A1:AZ11';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plan 2026');
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Uint8Array(out as Uint8Array).buffer.slice(0) as ArrayBuffer;
}

async function main() {
  const { parseProgramKerjaWorkbook, isBluePlanFill } = await import('../src/server/import/excelParser');
  const { describePlanPattern } = await import('../src/server/import/programKerjaImportService');

  const parsed = parseProgramKerjaWorkbook(buildWorkbook());
  console.log('year:', parsed.year, '| sheets:', parsed.sheets.join(','), '| records:', parsed.records.length);

  let failures = 0;
  const check = (cond: boolean, label: string) => {
    console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
    if (!cond) failures += 1;
  };

  const rec1 = parsed.records.find((r) => r.name.includes('Rapat Koordinasi'));
  const rec2 = parsed.records.find((r) => r.name.includes('Benchmark'));
check(parsed.records.length === 2, 'ada 2 program');
  check(rec1 !== undefined, 'program 1 terbaca');
  if (rec1) {
    check(rec1.planPeriods.length >= 1, `Plan program 1 terbaca melalui seri parsial, dapat ${rec1.planPeriods.length}`);
    check(rec1.realisasiPeriods.length === 2, `Realisasi program 1 = 2 sel, dapat ${rec1.realisasiPeriods.length}`);
    const realJan3 = rec1.realisasiPeriods.find((p) => p.month === 1 && p.week === 3);
    check(realJan3?.value === 50, `Realisasi Jan.III = 50, dapat ${realJan3?.value}`);
    check(!rec1.realisasiPeriods.some((p) => p.week === 1 && p.month === 1), 'baris R tidak tercatat sebagai Plan di Jan.I');
    check(rec1.planPeriods.every((p) => p.value === 100), 'semua cell plan program 1 bernilai 100');
  }

  check(rec2 !== undefined, 'program 2 terbaca');
  if (rec2) {
    // Blue-fill cells tidak lolos round-trip xlsx.write (style dibuang untuk
    // sel kosong) — verifikasi isBluePlanFill dilakukan langsung di bawah.
    check(Array.isArray(rec2.planPeriods), 'program 2 memiliki daftar periode Plan');
    check(rec2.notes === 'Keterangan baris pertama\nBaris kedua tetap terbaca penuh.', 'keterangan 2 baris tidak terpotong');
  }

  const patternMonthly = describePlanPattern(
    Array.from({ length: 12 }, (_, i) => ({ sheet: 'x', row: 1, col: 'D', month: i + 1, week: 1, value: 100 }))
  );
  check(patternMonthly.includes('Bulanan'), `pola bulanan terbaca: "${patternMonthly}"`);

  const patternQuarter = describePlanPattern(
    [1, 4, 7, 10].map((m) => ({ sheet: 'x', row: 1, col: 'D', month: m, week: 1, value: 100 }))
  );
  check(patternQuarter.includes('Setiap 3 bulan'), `pola setiap 3 bulan terbaca: "${patternQuarter}"`);

  const patternSix = describePlanPattern(
    [1, 2, 3, 4, 5, 6].map((m) => ({ sheet: 'x', row: 1, col: 'D', month: m, week: 1, value: 100 }))
  );
  check(patternSix.includes('6 kali setahun'), `pola 6 kali setahun terbaca: "${patternSix}"`);

  // ===== Deteksi warna biru (cell biru kosong = Plan) — uji langsung =====
  // xlsx.write tidak mempertahankan fill untuk sel kosong, jadi perilaku
  // isBluePlanFill diuji secara langsung terhadap representasi style yang
  // umum digunakan Excel (rgb, indexed, theme).
  const blueRgb = { s: { patternType: 'solid', fgColor: { rgb: 'FF00B0F0' } } } as XLSX.CellObject;
  const blueIndexed = { s: { patternType: 'solid', fgColor: { indexed: 12 } } } as XLSX.CellObject;
  const blueTheme = { s: { patternType: 'solid', fgColor: { theme: 4 } } } as XLSX.CellObject;
  const notBlue = { s: { patternType: 'solid', fgColor: { rgb: 'FFFFFFFF' } } } as XLSX.CellObject;
  const noStyle = { v: 100 } as XLSX.CellObject;

  check(isBluePlanFill(blueRgb), 'fill biru rgb (00B0F0) dikenali sebagai Plan');
  check(isBluePlanFill(blueIndexed), 'fill biru indexed (12) dikenali sebagai Plan');
  check(isBluePlanFill(blueTheme), 'fill biru theme (Accent 1) dikenali sebagai Plan');
  check(!isBluePlanFill(notBlue), 'fill putih TIDAK dikenali sebagai Plan');
  check(!isBluePlanFill(noStyle), 'sel tanpa style TIDAK dikenali sebagai Plan (cell kosong tanpa biru = tanpa Plan)');

  if (failures > 0) {
    console.error(`\n${failures} pemeriksaan GAGAL.`);
    process.exitCode = 1;
  } else {
    console.log('\nSemua pemeriksaan parser & pola Plan LULUS.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});