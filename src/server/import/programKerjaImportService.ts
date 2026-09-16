/**
 * ============================================================================
 * IMPORT PROGRAM KERJA — preview & apply dari workbook Excel resmi.
 * ============================================================================
 * Pipeline:
 *   Source (Excel resmi) → parseProgramKerjaWorkbook → preview (bandingkan
 *   dengan database) → user memeriksa → apply (satu transaction, dicatat di
 *   DataImport + AuditLog).
 *
 * Sumber kebenaran SAMA dengan script `scripts/import-program-kerja-2026.ts`:
 *   • Baris P (biru)  → Plan  (sel kosong tetapi biru TETAP Plan, nilai 100).
 *   • Baris R (hijau) → Realisasi.
 *   • Bulan ditentukan dari POSISI CELL (D..AY = 12 bulan × 4 periode).
 *   • Keterangan (AZ) dibaca penuh, tidak dipotong.
 *   • Relasi aplikasi (PIC, evidence, tasks, progressLogs) TIDAK disentuh.
 * ============================================================================
 */

import { createHash } from 'node:crypto';
import { ProgramCategory, ProgramStatus, ImportStatus, ImportDocumentType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { namesMatch } from './normalizer';
import type { ParsedProgramKerjaWorkbook } from './excelParser';
import type {
  PeriodCell,
  ParseIssue,
} from './types';
import { recordAuditLog } from '../services/auditService';

export const PERIODS = Array.from({ length: 12 * 4 }, (_, index) => ({
  month: Math.floor(index / 4) + 1,
  week: (index % 4) + 1,
}));

export type ClassificationKind = 'NEW' | 'UPDATED' | 'UNCHANGED' | 'CONFLICT' | 'INVALID';

export interface ProgramImportPreviewItem {
  classification: ClassificationKind;
  category: string;
  sequence: number;
  name: string;
  /** Pola Plan yang terbaca dari posisi sel biru (bukan dari nama program). */
  planPattern: string;
  planCount: number;
  realisasiCount: number;
  notes: string | null;
  changes: string[];
  blockingIssues: ParseIssue[];
  existingId: string | null;
  /** Salinan sel periode asli untuk dikirim balik saat apply (JSON-safe). */
  planPeriods?: PeriodCell[];
  realisasiPeriods?: PeriodCell[];
}

export interface ProgramImportPreview {
  year: number;
  sheets: string[];
  recordsTotal: number;
  counts: Record<ClassificationKind, number>;
  items: ProgramImportPreviewItem[];
  blockingIssues: ParseIssue[];
  fileName: string;
  fileHash: string;
  fileSize: number;
}

// ============================================================================
// POLA PLAN — dibaca dari POSISI CELL BIRU, bukan dari nama program
// ============================================================================

/**
 * Mengubah kumpulan sel Plan (bulan + minggu) menjadi deskripsi pola yang
 * terbaca manusia, e.g. "Bulanan", "Setiap 3 bulan", "6 kali setahun",
 * "Bulan tertentu", "Periode I–IV dalam bulan".
 */
export function describePlanPattern(planPeriods: PeriodCell[]): string {
  if (planPeriods.length === 0) return 'Belum ditetapkan';

  const sorted = [...planPeriods].sort((a, b) => a.month - b.month || a.week - b.week);
  const months = Array.from(new Set(sorted.map((c) => c.month))).sort((a, b) => a - b);
  const weeksUsed = Array.from(new Set(sorted.map((c) => c.week))).sort((a, b) => a - b);

  const monthLabels = months.map((m) => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1]);
  const weekLabels = weeksUsed.map((w) => ['I', 'II', 'III', 'IV'][w - 1]);

  const weekly = weeksUsed.includes(1) && weeksUsed.includes(2) && weeksUsed.includes(3) && weeksUsed.includes(4);
  const dailyLike = weekLabels.length === 1;

  if (months.length === 1) {
    const base = `Bulan ${monthLabels[0]}`;
    return dailyLike ? `${base}, periode ${weekLabels.join(', ')}` : `${base}, ${weekLabels.length} periode dalam bulan`;
  }

  if (weekly && months.length === 12) return 'Bulanan (semua bulan, periode I-IV)';
  if (months.length === 12) return `Bulanan (semua bulan, periode ${weekLabels.join(', ')})`;
  if (weekly && months.length === 6) return 'Setiap 6 kali setahun (periode I-IV)';
  if (weekly && months.length === 4) return 'Setiap 3 bulan (periode I-IV)';
  if (months.length === 6) return `6 kali setahun (${monthLabels.join(', ')})${dailyLike ? `, periode ${weekLabels.join(', ')}` : ''}`;
  if (months.length === 3) return `3 kali setahun (${monthLabels.join(', ')})${dailyLike ? `, periode ${weekLabels.join(', ')}` : ''}`;

  // Interval seragam (mis. Jan, Apr, Jul, Okt)
  const step = months.length > 2 ? months[1] - months[0] : 0;
  if (step > 1 && months.every((m, i) => i === 0 || months[i] === months[0] + i * step)) {
    return `Setiap ${step} bulan (${months.length} kali/tahun, periode ${weekLabels.join(', ')})`;
  }

  return `Bulan tertentu (${monthLabels.join(', ')})${weekly ? ', periode I-IV' : dailyLike ? `, periode ${weekLabels.join(', ')}` : ''}`;
}
// ============================================================================
// PREVIEW — bandingkan hasil parse dengan database
// ============================================================================

export function deriveStatus(
  targetValues: Array<number | null>,
  realizationValues: Array<number | null>
): { status: ProgramStatus; progress: number } {
  const realizations = realizationValues.filter((value): value is number => value !== null);
  if (!realizations.length) return { status: ProgramStatus.PLAN, progress: 0 };

  const plannedIndices = targetValues
    .map((target, idx) => (target !== null ? idx : -1))
    .filter((idx) => idx !== -1);

  const totalPlannedCount = plannedIndices.length || realizations.length;
  const realizedSum = realizationValues.reduce<number>((sum, val) => sum + (val ?? 0), 0);
  const avgProgress = Math.round((realizedSum / (totalPlannedCount * 100)) * 100);
  const boundedProgress = Math.min(100, Math.max(0, avgProgress));

  const hasUnrealizedPlan = plannedIndices.some((idx) => realizationValues[idx] === null);

  if (realizations.every((val) => val === 0)) {
    return { status: ProgramStatus.BELUM_TEREALISASI, progress: 0 };
  }

  if (boundedProgress >= 100 && !hasUnrealizedPlan) {
    return { status: ProgramStatus.REALISASI, progress: 100 };
  }

  if (realizedSum > 0 || realizations.length > 0) {
    return { status: ProgramStatus.ON_PROGRESS, progress: boundedProgress };
  }

  return { status: ProgramStatus.PLAN, progress: 0 };
}

function valueAt(
  values: PeriodCell[],
  month: number,
  week: number
): number | null {
  return values.find((period) => period.month === month && period.week === week)?.value ?? null;
}

function matrixEqual(
  parsed: PeriodCell[],
  existing: Array<{ month: number; week: number; target: number | null; realization: number | null }>,
  kind: 'plan' | 'realisasi'
): boolean {
  for (const period of PERIODS) {
    const parsedValue = valueAt(parsed, period.month, period.week);
    const existingRow = existing.find((e) => e.month === period.month && e.week === period.week);
    const existingValue = kind === 'plan' ? (existingRow?.target ?? null) : (existingRow?.realization ?? null);
    if ((parsedValue ?? null) !== existingValue) return false;
  }
  return true;
}

interface ExistingProgramRef {
  id: string;
  year: number;
  category: string;
  sequence: number;
  name: string;
  notes: string | null;
  plan: string | null;
  months: Array<{ month: number; week: number; target: number | null; realization: number | null }>;
}

export async function previewProgramKerjaImport(
  parsed: ParsedProgramKerjaWorkbook
): Promise<Omit<ProgramImportPreview, 'fileName' | 'fileHash' | 'fileSize'>> {
  const existingRows = await prisma.programKerja.findMany({
    where: { year: parsed.year || undefined },
    select: { id: true, year: true, category: true, sequence: true, name: true, notes: true, plan: true, months: true },
  });
  const existing = existingRows as ExistingProgramRef[];

  const counts: Record<ClassificationKind, number> = { NEW: 0, UPDATED: 0, UNCHANGED: 0, CONFLICT: 0, INVALID: 0 };
  const items: ProgramImportPreviewItem[] = [];
  const blockingIssues: ParseIssue[] = [];
  const usedExisting = new Map<string, string>();

  for (const record of parsed.records) {
    const recordIssues = parsed.issues.filter(
      (issue) =>
        record.anchors.some((anchor) => anchor.sheet === issue.sheet && anchor.row === issue.row) ||
        record.planPeriods.some((cell) => cell.sheet === issue.sheet && cell.row === issue.row) ||
        record.realisasiPeriods.some((cell) => cell.sheet === issue.sheet && cell.row === issue.row)
    );

    const planPattern = describePlanPattern(record.planPeriods);
if (!record.name.trim() || record.sequence <= 0 || recordIssues.length > 0) {
      if (recordIssues.length > 0) blockingIssues.push(...recordIssues);
      counts.INVALID += 1;
      items.push({
        classification: 'INVALID',
        category: record.category,
        sequence: record.sequence,
        name: record.name || '(tanpa nama)',
        planPattern,
        planCount: record.planPeriods.length,
        realisasiCount: record.realisasiPeriods.length,
        notes: record.notes,
        changes: recordIssues.map((issue) => `Baris ${issue.row} kol ${issue.column}: ${issue.message}`),
        blockingIssues: recordIssues,
        existingId: null,
      });
      continue;
    }

    const matches = existing.filter(
      (ex) => ex.category === record.category && namesMatch(ex.name, record.name)
    );

    const existingMatch = matches[0] ?? null;
    if (!existingMatch) {
      counts.NEW += 1;
      items.push({
        classification: 'NEW',
        category: record.category,
        sequence: record.sequence,
        name: record.name,
        planPattern,
        planCount: record.planPeriods.length,
        realisasiCount: record.realisasiPeriods.length,
        notes: record.notes,
        changes: ['Program baru — akan dibuat'],
        blockingIssues: [],
        existingId: null,
      });
      continue;
    }

    if (matches.length > 1 || usedExisting.has(existingMatch.id)) {
      counts.CONFLICT += 1;
      items.push({
        classification: 'CONFLICT',
        category: record.category,
        sequence: record.sequence,
        name: record.name,
        planPattern,
        planCount: record.planPeriods.length,
        realisasiCount: record.realisasiPeriods.length,
        notes: record.notes,
        changes: ['Nama program cocok dengan beberapa data / data yang sama sudah muncul lebih dari sekali pada file ini. Periksa sebelum menyimpan.'],
        blockingIssues: [],
        existingId: existingMatch.id,
      });
      continue;
    }

    usedExisting.set(existingMatch.id, record.name);

    const changes: string[] = [];
    if (existingMatch.sequence !== record.sequence && record.sequence > 0) changes.push('Nomor urut berubah');
    if (existingMatch.name !== record.name) changes.push('Nama program berubah');
    if ((existingMatch.notes ?? '') !== (record.notes ?? '')) changes.push('Keterangan berubah');
    if (!matrixEqual(record.planPeriods, existingMatch.months, 'plan')) changes.push('Matriks Plan (sel biru) berubah');
    if (!matrixEqual(record.realisasiPeriods, existingMatch.months, 'realisasi')) changes.push('Matriks Realisasi berubah');
    if (existingMatch.plan !== planPattern) changes.push('Pola Plan berubah');

    items.push({
      classification: changes.length === 0 ? 'UNCHANGED' : 'UPDATED',
      category: record.category,
      sequence: record.sequence,
      name: record.name,
      planPattern,
      planCount: record.planPeriods.length,
      realisasiCount: record.realisasiPeriods.length,
      notes: record.notes,
      changes,
      blockingIssues: [],
      existingId: existingMatch.id,
    });
    if (changes.length === 0) counts.UNCHANGED += 1;
    else counts.UPDATED += 1;
  }

  return {
    year: parsed.year,
    sheets: parsed.sheets,
    recordsTotal: parsed.records.length,
    counts,
    items: items.map((item, index) => {
      const record = parsed.records[index];
      return {
        ...item,
        planPeriods: record.planPeriods ?? [],
        realisasiPeriods: record.realisasiPeriods ?? [],
      };
    }),
    blockingIssues,
  };
}
// ============================================================================
// APPLY — tulis perubahan dalam satu transaction + catat DataImport
// ============================================================================

export type ApplyProgramImportItem = {
  classification: ClassificationKind;
  category: string;
  sequence: number;
  name: string;
  notes: string | null;
  planPeriods: PeriodCell[];
  realisasiPeriods: PeriodCell[];
};

export interface ApplyProgramImportResult {
  created: number;
  updated: number;
  unchanged: number;
  skippedConflict: number;
  skippedInvalid: number;
  totalRecords: number;
}

export async function applyProgramKerjaImport(
  parsed: Pick<ParsedProgramKerjaWorkbook, 'year' | 'sheets' | 'records'>,
  items: ApplyProgramImportItem[],
  actorId: string,
  meta: { fileName: string; fileHash: string; fileSize: number }
): Promise<ApplyProgramImportResult> {
  const accepted = items.filter(
    (item) => item.classification === 'NEW' || item.classification === 'UPDATED' || item.classification === 'UNCHANGED'
  );
  const existingRows = await prisma.programKerja.findMany({
    where: { year: parsed.year || undefined },
    select: { id: true, year: true, category: true, sequence: true, name: true, notes: true, plan: true, months: true },
  });
  const existing = existingRows as ExistingProgramRef[];

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of accepted) {
      const matching = existing.find(
        (program) => program.category === item.category && namesMatch(program.name, item.name)
      );

      const targetValues = PERIODS.map(({ month, week }) => valueAt(item.planPeriods, month, week));
      const realizationValues = PERIODS.map(({ month, week }) => valueAt(item.realisasiPeriods, month, week));
      const { status, progress } = deriveStatus(targetValues, realizationValues);
      const months = PERIODS.map(({ month, week }, index) => ({
        month,
        week,
        target: targetValues[index],
        realization: realizationValues[index],
      }));
      const planPattern = describePlanPattern(item.planPeriods);

      if (matching) {
        if (item.classification === 'UNCHANGED') {
          unchanged += 1;
          continue;
        }
        // Hapus baris periode milik sumber dulu agar unique (program, month,
        // week) dapat dibuat ulang persis seperti workbook — hubungan aplikasi
        // (PIC/evidence/tasks/history) dipertahankan karena identitas program
        // tidak berubah.
        await tx.programKerjaMonth.deleteMany({ where: { programId: matching.id } });
        await tx.programKerja.update({
          where: { id: matching.id },
          data: {
            sequence: item.sequence || matching.sequence,
            name: item.name,
            notes: item.notes,
            plan: planPattern,
            planTarget: 100,
            progress,
            status,
            months: { createMany: { data: months } },
          },
        });
        updated += 1;
        continue;
      }

      await tx.programKerja.create({
        data: {
          year: parsed.year,
          category: item.category as ProgramCategory,
          sequence: item.sequence || 0,
          name: item.name,
          notes: item.notes,
          plan: planPattern,
          planTarget: 100,
          progress,
          status,
          months: { createMany: { data: months } },
        },
      });
      created += 1;
    }
  });
// Histori dokumen + audit — ditulis SETELAH seluruh program tersinkron dalam
  // satu transaction. totalRecords diambil dari parsed.records (sama dengan
  // jumlah yang direview user pada preview).
  const totalPlan = parsed.records.reduce((total, record) => total + record.planPeriods.length, 0);
  const totalRealisasi = parsed.records.reduce((total, record) => total + record.realisasiPeriods.length, 0);
  const skippedInvalid = items.filter((i) => i.classification === 'INVALID').length;
  const skippedConflict = items.filter((i) => i.classification === 'CONFLICT').length;

  await prisma.dataImport.create({
    data: {
      fileName: meta.fileName,
      fileHash: meta.fileHash,
      fileSize: meta.fileSize,
      documentType: ImportDocumentType.PROGRAM_KERJA,
      status: ImportStatus.SUCCESS,
      sheetNames: parsed.sheets,
      year: parsed.year,
      totalRecords: parsed.records.length,
      planRecords: totalPlan,
      realizationRecords: totalRealisasi,
      notesRecords: parsed.records.filter((record) => Boolean(record.notes)).length,
      createdCount: created,
      updatedCount: updated,
      unchangedCount: unchanged,
      conflictCount: skippedConflict,
      rejectedCount: skippedInvalid,
      summary: {
        sourceOfTruth: 'Excel',
        preservedRelations: ['pic', 'evidence', 'tasks', 'progressLogs'],
        synchronizedPeriods: PERIODS.length,
      },
      importedById: actorId,
    },
  });

  await recordAuditLog({
    userId: actorId,
    action: 'IMPORT_PROGRAM_KERJA',
    entity: 'ProgramKerja',
    metadata: {
      fileName: meta.fileName,
      year: parsed.year,
      created,
      updated,
      unchanged,
      skippedConflict,
      skippedInvalid,
      totalRecords: parsed.records.length,
    },
  });

  return { created, updated, unchanged, skippedConflict, skippedInvalid, totalRecords: parsed.records.length };
}

export function createFileHash(buffer: ArrayBuffer): string {
  return createHash('sha256').update(Buffer.from(new Uint8Array(buffer))).digest('hex');
}