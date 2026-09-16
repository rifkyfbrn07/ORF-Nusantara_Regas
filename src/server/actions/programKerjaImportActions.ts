'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import { parseProgramKerjaWorkbook } from '../import/excelParser';
import {
  applyProgramKerjaImport,
  createFileHash,
  previewProgramKerjaImport,
  type ApplyProgramImportItem,
} from '../import/programKerjaImportService';
import type { ParsedProgramKerjaWorkbook } from '../import/excelParser';
import type { PeriodCell } from '../import/types';

const ALLOWED_ROLES = ['MANAGER', 'ADMIN'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function revalidateProgramKerja() {
  revalidatePath('/manager/program-kerja');
  revalidatePath('/operator/program-kerja');
  revalidatePath('/manager/dashboard');
  revalidatePath('/operator/dashboard');
}

async function readFormDataFile(formData: FormData): Promise<{ buffer: ArrayBuffer; fileName: string; size: number } | { error: string }> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: 'File Excel wajib dilampirkan.' };
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return { error: 'Format file harus .xlsx' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Ukuran file maksimal 10 MB.' };
  }
  const buffer = await file.arrayBuffer();
  return { buffer, fileName: file.name, size: file.size };
}

export interface ProgramImportPreviewPayload {
  year: number;
  sheets: string[];
  recordsTotal: number;
  counts: Record<'NEW' | 'UPDATED' | 'UNCHANGED' | 'CONFLICT' | 'INVALID', number>;
  items: {
    classification: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'CONFLICT' | 'INVALID';
    category: string;
    sequence: number;
    name: string;
    planPattern: string;
    planCount: number;
    realisasiCount: number;
    notes: string | null;
    changes: string[];
    blockingIssues: { sheet: string; row: number; column: string; value: string; message: string }[];
    existingId: string | null;
    planPeriods: PeriodCell[];
    realisasiPeriods: PeriodCell[];
  }[];
  blockingIssues: { sheet: string; row: number; column: string; value: string; message: string }[];
  fileName: string;
  fileHash: string;
  fileSize: number;
}

export async function previewProgramKerjaImportAction(
  formData: FormData
): Promise<{ success: true; preview: ProgramImportPreviewPayload } | { success: false; error: string }> {
  try {
    await requireRole([...ALLOWED_ROLES]);
    const fileResult = await readFormDataFile(formData);
    if ('error' in fileResult) return { success: false, error: fileResult.error };

    const parsed = parseProgramKerjaWorkbook(fileResult.buffer);
    if (!parsed.year || parsed.records.length === 0) {
      return { success: false, error: 'Tidak ditemukan data Program Kerja yang valid pada workbook.' };
    }

    const preview = await previewProgramKerjaImport(parsed);

    return {
      success: true,
      preview: {
        year: preview.year,
        sheets: preview.sheets,
        recordsTotal: preview.recordsTotal,
        counts: preview.counts,
        items: preview.items.map((item) => ({
          classification: item.classification,
          category: item.category,
          sequence: item.sequence,
          name: item.name,
          planPattern: item.planPattern,
          planCount: item.planCount,
          realisasiCount: item.realisasiCount,
          notes: item.notes,
          changes: item.changes,
          blockingIssues: item.blockingIssues,
          existingId: item.existingId,
          planPeriods: item.planPeriods ?? [],
          realisasiPeriods: item.realisasiPeriods ?? [],
        })),
        blockingIssues: preview.blockingIssues,
        fileName: fileResult.fileName,
        fileHash: createFileHash(fileResult.buffer),
        fileSize: fileResult.size,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membaca file Excel.' };
  }
}

export interface ProgramKerjaImportApplyPayload {
  year: number;
  sheets: string[];
  items: ApplyProgramImportItem[];
  fileName: string;
  fileHash: string;
  fileSize: number;
}

export async function applyProgramKerjaImportAction(
  payload: ProgramKerjaImportApplyPayload
): Promise<{ success: true; result: { created: number; updated: number; unchanged: number; skippedConflict: number; skippedInvalid: number; totalRecords: number } } | { success: false; error: string }> {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return { success: false, error: 'Preview belum tersedia. Ulangi import dari awal.' };
    }
    if (!payload.year || !payload.sheets?.length) {
      return { success: false, error: 'Data workbook tidak valid untuk di-import.' };
    }

    // Bangun ulang ParsedProgramKerjaWorkbook dari payload agar apply selalu
    // memakai data yang persis diverifikasi user pada preview.
    const parsed: Pick<ParsedProgramKerjaWorkbook, 'year' | 'sheets' | 'records'> = {
      year: payload.year,
      sheets: payload.sheets,
      records: payload.items.map((item) => ({
        category: item.category as ParsedProgramKerjaWorkbook['records'][number]['category'],
        sequence: item.sequence,
        name: item.name,
        notes: item.notes,
        planPeriods: item.planPeriods,
        realisasiPeriods: item.realisasiPeriods,
        sourceSheets: payload.sheets,
        anchors: [{ sheet: payload.sheets[0], row: 0, column: 'B' }],
      })),
    };

    const result = await applyProgramKerjaImport(
      parsed,
      payload.items,
      user.id,
      { fileName: payload.fileName, fileHash: payload.fileHash, fileSize: payload.fileSize }
    );

    revalidateProgramKerja();
    return { success: true, result };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menyimpan hasil import.' };
  }
}