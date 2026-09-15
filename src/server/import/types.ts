/**
 * ============================================================================
 * TIPE DATA PIPELINE IMPORT DOKUMEN (EXCEL / PDF)
 * ============================================================================
 * Dokumen hanya dianggap sebagai input data: Source → Parser → Normalizer →
 * Validator → Comparator → Import Service → Prisma.
 * ============================================================================
 */

import type { ProgramCategory } from '@prisma/client';

/** Jenis dokumen yang dapat dikenali sistem. */
export type DocumentType = 'PROGRAM_KERJA' | 'JADWAL_KERJA';
export type DocumentTypeOrUnknown = DocumentType | 'UNKNOWN';

/** Sel periode pada Excel: bulan (1..12) + minggu/period (1..4) + nilai angka. */
export interface PeriodCell {
  sheet: string;
  row: number; // baris Excel (1-based)
  col: string; // kolom Excel ('D'..'AY')
  month: number; // 1 = Januari ... 12 = Desember
  week: number; // 1 = I ... 4 = IV
  value: number;
}

/** Baris anchor program pada sheet (untuk laporan error). */
export interface SourceAnchor {
  sheet: string;
  row: number;
  column: string;
}

/** Record Program Kerja hasil parse (sudah digabung antar sheet bila perlu). */
export interface ProgramKerjaRecord {
  category: ProgramCategory;
  sequence: number;
  /** Nama program disimpan FULL sesuai dokumen (tidak pernah di-truncate). */
  name: string;
  /** Keterangan lengkap (kolom Keterangan / AZ), multi-line dipertahankan. */
  notes: string | null;
  /** Sel Plan (P) per periode. Kosong di Excel = tidak ada record. */
  planPeriods: PeriodCell[];
  /** Sel Realisasi (R) per periode. 0 disimpan 0; kosong = tidak ada record. */
  realisasiPeriods: PeriodCell[];
  sourceSheets: string[];
  anchors: SourceAnchor[];
}

/** Record jadwal kerja hasil parse PDF/Excel. */
export interface ScheduleRecord {
  operatorMatchKey: string; // employeeId / username saat match dengan DB
  operatorName: string; // nama sesuai dokumen
  date: string; // YYYY-MM-DD
  shiftCode: string; // ORF_PAGI / ORF_MALAM / ORF_OFF
  status: 'WORK' | 'OFF';
  source: string;
}

/** Masalah saat parse / validasi / pembandingan — laporan Sheet/Row/Column/Value/Message. */
export interface ParseIssue {
  sheet: string;
  row: number;
  column: string;
  value: string;
  message: string;
}

/** Klasifikasi perubahan hasil pembandingan dengan database. */
export type ClassificationKind =
  | 'NEW'
  | 'UPDATED'
  | 'UNCHANGED'
  | 'CONFLICT'
  | 'INVALID';

export interface CompareProgramItem {
  classification: ClassificationKind;
  record: ProgramKerjaRecord;
  existingId: string | null;
  existingName: string | null;
  changes: string[];
  issues: ParseIssue[];
}

export interface ImportSummary {
  programs: number;
  planRecords: number;
  realisasiRecords: number;
  notesRecords: number;
}

export interface CompareSummary {
  items: CompareProgramItem[];
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  conflictCount: number;
  conflictItems: CompareProgramItem[];
  issues: ParseIssue[];
}

export interface ImportCompare {
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  conflictCount: number;
  invalidCount: number;
  items: CompareProgramItem[];
  changesTotal: number;
  issues: ParseIssue[];
}

export interface ImportPreview {
  documentType: DocumentType;
  fileName: string;
  fileHash: string;
  fileSize: number;
  year: number;
  sheets: string[];
  perCategory: { category: string; total: number }[];
  count: ImportSummary;
  compare: ImportCompare;
}

export interface DetectionHint {
  type: DocumentTypeOrUnknown;
  reason: string;
}

/** Nilai visual semantik: PLAN = biru, REALISASI = hijau. */
export const PLAN_COLOR = '#0066B3';
export const REALISASI_COLOR = '#16A34A';