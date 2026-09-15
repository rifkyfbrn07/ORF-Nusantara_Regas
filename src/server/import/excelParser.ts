/**
 * ============================================================================
 * EXCEL PARSER — Program Kerja (sheet "Plan 2026", "Plan 2026 (2)")
 * ============================================================================
 * Membaca workbook secara utuh:
 *  • Baris kategori (A/B/C/D) → kategori aktif; semua program berikut masuk
 *    kategori tersebut sampai kategori berikutnya ditemukan.
 *  • Baris P (kolom C) → membuka Program baru; baris R berikutnya → Realisasi
 *    dari program tersebut (bukan program baru).
 *  • Kolom D..AY = 12 bulan × 4 periode (Januari=D..G .. Desember=AV..AY).
 *    P = Plan (biru), R = Realisasi (hijau). BULAN ditentukan dari POSISI KOLOM,
 *    bukan dari serial tanggal header (header terbaca tahun lain — tahun proyek
 *    diambil dari judul workbook).
 *  • Kolom Keterangan (AZ) = keterangan lengkap multi-line; tidak dipotong.
 *  • Merged cells & lanjutan nama program (baris "Nusantara Regas" pada program
 *    audit) didukung.
 * ============================================================================
 */

import * as XLSX from 'xlsx';
import type { ProgramCategory } from '@prisma/client';
import { namesMatch, normalizeMatchKey } from './normalizer';
import type { ParseIssue, PeriodCell, ProgramKerjaRecord } from './types';

/** Kolom periode: D..AY (index 3..50). */
const PERIOD_START_COL = 3;
const PERIOD_END_COL = 50;
/** Kolom Keterangan: AZ (index 51). */
const NOTES_COL = 51;

const CATEGORY_LABEL_MAP: Record<string, ProgramCategory> = {
  PENGADAAN: 'PENGADAAN',
  'RAPAT KOORDINASI': 'RAPAT_KOORDINASI',
  'OPERASIONAL RUTIN': 'OPERASIONAL_RUTIN',
  AUDIT: 'AUDIT',
};

const FOOTER_MARKERS = new Set(['PLAN (P)', 'REALISASI (R)', 'TIDAK TERLEALISASI']);
const FOOTER_SNIPPETS = ['DIBUAT OLEH', 'DISETUJUI OLEH', 'DIKETAHUI OLEH'];

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function isFooterRow(row: unknown[] | undefined): boolean {
  if (!row) return true;
  const b = toStr(row[1]).toUpperCase();
  if (FOOTER_MARKERS.has(b)) return true;
  if (FOOTER_SNIPPETS.some((s) => b.includes(s))) return true;
  const az = toStr(row[NOTES_COL]).toUpperCase();
  return FOOTER_SNIPPETS.some((s) => az.includes(s));
}

/** Konversi sel numerik; NULL = sel kosong (bukan 0). */
function parseNumericCell(raw: unknown): { value: number; ok: boolean; text?: string } {
  if (raw === null || raw === undefined || raw === '') return { value: 0, ok: false };
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { value: raw, ok: true } : { value: 0, ok: false };
  }
  const text = String(raw).replace(/%\s*$/, '').replace(/[^\d.\-]/g, '');
  if (!text) return { value: 0, ok: false };
  const n = Number(text);
  if (Number.isNaN(n)) return { value: 0, ok: false, text: String(raw) };
  return { value: n, ok: true };
}

function periodAt(colIdx: number): { month: number; week: number } {
  if (colIdx < PERIOD_START_COL || colIdx > PERIOD_END_COL) return { month: 0, week: 0 };
  const offset = colIdx - PERIOD_START_COL;
  return { month: Math.floor(offset / 4) + 1, week: (offset % 4) + 1 };
}

function readCategory(a: string, b: string): ProgramCategory | null {
  if (!/^[A-D]$/i.test(a.trim())) return null;
  const label = normalizeMatchKey(b).toUpperCase();
  return CATEGORY_LABEL_MAP[label] ?? null;
}
export interface SheetScan {
  sheet: string;
  year: number;
  records: ProgramKerjaRecord[];
  issues: ParseIssue[];
}

function scanWorkSheet(sheetName: string, ws: XLSX.WorkSheet): SheetScan {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  const records: ProgramKerjaRecord[] = [];
  const issues: ParseIssue[] = [];

  let year = 0;
  for (const row of rows.slice(0, 3)) {
    const a = toStr(row ? row[0] : '');
    const m = a.match(/TAHUN\s+(\d{4})/i);
    if (m) {
      year = Number(m[1]);
      break;
    }
  }

  let currentCategory: ProgramCategory | null = null;
  let pending: ProgramKerjaRecord | null = null;

  const pushPending = () => {
    if (pending) {
      if (pending.name.trim()) records.push(pending);
      pending = null;
    }
  };

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isFooterRow(row)) break;

    const a = toStr(row[0]);
    const b = toStr(row[1]);
    const c = toStr(row[2]).toUpperCase();

    const cat = readCategory(a, b);
    if (cat) {
      pushPending();
      currentCategory = cat;
      continue;
    }
    if (!currentCategory) continue;

    if (c === 'P') {
      pushPending();
      if (!b) {
        // Template sumber menyisakan pasangan P/R kosong di akhir beberapa
        // kategori. Tanpa identitas program, ini adalah elemen layout saja.
        continue;
      }
      const seqRaw = Number(a.replace(/[^\d]/g, ''));
      if (!a || Number.isNaN(seqRaw)) {
        issues.push({
          sheet: sheetName,
          row: i + 1,
          column: 'A',
          value: a || '(kosong)',
          message: 'Nomor urut program tidak valid (diharapkan angka).',
        });
      }
      pending = {
        category: currentCategory,
        sequence: Number.isNaN(seqRaw) ? 0 : seqRaw,
        name: b,
        notes: toStr(row[NOTES_COL]) || null,
        planPeriods: [],
        realisasiPeriods: [],
        sourceSheets: [sheetName],
        anchors: [{ sheet: sheetName, row: i + 1, column: 'B' }],
      };
      for (let col = PERIOD_START_COL; col <= PERIOD_END_COL; col++) {
        const address = XLSX.utils.encode_cell({ r: i, c: col });
        const parsed = parseNumericCell(row[col]);
        const filledPlan = isBluePlanFill(ws[address]);
        if (!parsed.ok && !filledPlan) continue;
        const { month, week } = periodAt(col);
        pending.planPeriods.push({
          sheet: sheetName,
          row: i + 1,
          col: XLSX.utils.encode_col(col),
          month,
          week,
          // Existing ProgramKerjaMonth semantics use 100 as a planned target.
          value: parsed.ok ? parsed.value : 100,
        });
        if (parsed.ok && (parsed.value < 0 || parsed.value > 100)) {
          issues.push({
            sheet: sheetName,
            row: i + 1,
            column: XLSX.utils.encode_col(col),
            value: String(parsed.value),
            message: 'Nilai Plan harus berada pada rentang 0–100.',
          });
        }
      }
      continue;
    }

    if (c === 'R') {
      if (!pending) {
        const hasPeriodValue = row
          .slice(PERIOD_START_COL, PERIOD_END_COL + 1)
          .some((value) => parseNumericCell(value).ok);
        // Companion R row for an empty P layout placeholder.
        if (!b && !hasPeriodValue) continue;
        issues.push({
          sheet: sheetName,
          row: i + 1,
          column: 'C',
          value: 'R',
          message: 'Baris Realisasi (R) muncul tanpa baris Program (P) sebelumnya.',
        });
        continue;
      }
      // Lanjutan nama program pada baris R di beberapa workbook (sel B terisi, sel A kosong)
      if (!a && b) {
        pending.name = `${pending.name} ${b}`.replace(/\s+/g, ' ').trim();
        pending.anchors.push({ sheet: sheetName, row: i + 1, column: 'B' });
      }
      for (let col = PERIOD_START_COL; col <= PERIOD_END_COL; col++) {
        const parsed = parseNumericCell(row[col]);
        if (!parsed.ok) {
          if (parsed.text) {
            issues.push({
              sheet: sheetName,
              row: i + 1,
              column: XLSX.utils.encode_col(col),
              value: parsed.text,
              message: 'Nilai Realisasi harus berupa angka (sel kosong ≠ 0).',
            });
          }
          continue;
        }
        const { month, week } = periodAt(col);
        pending.realisasiPeriods.push({
          sheet: sheetName,
          row: i + 1,
          col: XLSX.utils.encode_col(col),
          month,
          week,
          value: parsed.value,
        });
        if (parsed.value < 0 || parsed.value > 100) {
          issues.push({
            sheet: sheetName,
            row: i + 1,
            column: XLSX.utils.encode_col(col),
            value: String(parsed.value),
            message: 'Nilai Realisasi harus berada pada rentang 0–100.',
          });
        }
      }
      pushPending();
      continue;
    }
    // Baris lain (tanpa P/R) dilewati — tidak menghentikan parse
  }

  pushPending();
  return { sheet: sheetName, year, records, issues };
}
function pickName(cur: string, incoming: string): string {
  const ck = normalizeMatchKey(cur);
  const ik = normalizeMatchKey(incoming);
  if (!ck) return incoming;
  if (ck === ik) return incoming; // preferensi versi lebih baru (sheet berikutnya)
  if (ck.startsWith(ik) && ik.length >= 10) return cur; // cur lebih lengkap
  if (ik.startsWith(ck) && ck.length >= 10) return incoming; // incoming lebih lengkap
  return incoming; // sheet lebih baru menang
}

function mergeUniqueLines(left: string | null, right: string | null): string | null {
  const lines: string[] = [];
  for (const chunk of [left, right]) {
    if (!chunk) continue;
    for (const line of chunk.split(/\r?\n/)) {
      const t = line.trim();
      if (t && !lines.includes(t)) lines.push(t);
    }
  }
  return lines.length ? lines.join('\n') : null;
}

function mergePeriods(
  target: PeriodCell[],
  incoming: PeriodCell[],
  label: string,
  issues: ParseIssue[]
): void {
  for (const cell of incoming) {
    const idx = target.findIndex((p) => p.month === cell.month && p.week === cell.week);
    if (idx === -1) {
      target.push(cell);
      continue;
    }
    if (target[idx].value !== cell.value) {
      issues.push({
        sheet: cell.sheet,
        row: cell.row,
        column: cell.col,
        value: String(cell.value),
        message: `Nilai ${label} periode Bulan ${cell.month} Mgg ${cell.week} berbeda antar sheet → memakai nilai sheet terakhir (${target[idx].value} → ${cell.value}).`,
      });
      target[idx] = cell;
    }
  }
}

function mergeScans(scans: SheetScan[]): { records: ProgramKerjaRecord[]; issues: ParseIssue[] } {
  const merged: ProgramKerjaRecord[] = [];
  const issues: ParseIssue[] = [];

  for (const scan of scans) {
    for (const rec of scan.records) {
      const existing = merged.find(
        (m) => m.category === rec.category && namesMatch(m.name, rec.name)
      );
      if (!existing) {
        merged.push({ ...rec, sourceSheets: [...rec.sourceSheets], anchors: [...rec.anchors] });
        continue;
      }
      existing.name = pickName(existing.name, rec.name);
      if (rec.sequence > 0) existing.sequence = rec.sequence;
      existing.sourceSheets = Array.from(new Set([...existing.sourceSheets, ...rec.sourceSheets]));
      existing.anchors = [...existing.anchors, ...rec.anchors];
      existing.notes = mergeUniqueLines(existing.notes, rec.notes);
      mergePeriods(existing.planPeriods, rec.planPeriods, 'Plan', issues);
      mergePeriods(existing.realisasiPeriods, rec.realisasiPeriods, 'Realisasi', issues);
    }
  }

  return { records: merged, issues };
}

export interface ParsedProgramKerjaWorkbook {
  year: number;
  sheets: string[];
  records: ProgramKerjaRecord[];
  issues: ParseIssue[];
}

/** Parse workbook Program Kerja dan gabungkan antar sheet (deduplikasi program). */
export function parseProgramKerjaWorkbook(buffer: ArrayBuffer | Buffer): ParsedProgramKerjaWorkbook {
  const wb = XLSX.read(buffer as ArrayBuffer, { type: 'array', cellDates: false, cellStyles: true });
  const sheetNames = wb.SheetNames.filter((name) => Boolean(wb.Sheets[name]));
  const scans = sheetNames.map((name) => scanWorkSheet(name, wb.Sheets[name]));
  const { records, issues: mergeIssues } = mergeScans(scans);
  const year = scans.reduce((acc, s) => (s.year > acc ? s.year : acc), 0);
  const issues = scans.flatMap((s) => s.issues).concat(mergeIssues);
  return { year, sheets: sheetNames, records, issues };
}

type CellStyleShape = {
  patternType?: unknown;
  fgColor?: { rgb?: unknown; indexed?: unknown; theme?: unknown };
  bgColor?: { rgb?: unknown; indexed?: unknown; theme?: unknown };
};

/**
 * A blue fill on a P-row period cell is a plan marker even when its value is
 * empty. The source workbook uses 00B0F0; RGB, indexed and Office Accent 1
 * representations are supported for compatible Excel exports.
 */
function isBluePlanFill(cell: XLSX.CellObject | undefined): boolean {
  const style = cell && (cell as unknown as { s?: CellStyleShape }).s;
  if (!style || style.patternType !== 'solid') return false;
  const colors = [style.fgColor, style.bgColor].filter(Boolean) as NonNullable<CellStyleShape['fgColor']>[];
  return colors.some((color) => {
    const rawRgb = typeof color.rgb === 'string' ? color.rgb.replace(/^#/, '').toUpperCase() : '';
    const rgb = rawRgb.length === 8 ? rawRgb.slice(2) : rawRgb;
    if (rgb.length === 6) {
      const red = Number.parseInt(rgb.slice(0, 2), 16);
      const green = Number.parseInt(rgb.slice(2, 4), 16);
      const blue = Number.parseInt(rgb.slice(4, 6), 16);
      if (blue >= 140 && blue > red + 35 && blue > green + 25) return true;
    }
    return color.indexed === 12 || color.indexed === 32 || color.theme === 4;
  });
}
