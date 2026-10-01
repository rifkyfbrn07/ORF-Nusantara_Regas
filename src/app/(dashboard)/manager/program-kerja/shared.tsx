'use client';

import React from 'react';
import { ProgramCategory as ProgramKerjaCategory, ProgramStatus } from '@prisma/client';

export const CATEGORY_LABELS: Record<ProgramKerjaCategory, string> = {
  PENGADAAN: 'A. Pengadaan',
  RAPAT_KOORDINASI: 'B. Rapat Koordinasi',
  OPERASIONAL_RUTIN: 'C. Operasional Rutin',
  AUDIT: 'D. Audit',
};

export const STATUS_LABELS: Record<ProgramStatus, string> = {
  PLAN: 'PLAN',
  REALISASI: 'TEREALISASI',
  ON_PROGRESS: 'ON PROGRESS',
  BELUM_TEREALISASI: 'TIDAK TEREALISASI',
};

export const STATUS_STYLES: Record<ProgramStatus, string> = {
  PLAN: 'bg-blue-50 text-[#0066B3] border-blue-200',
  REALISASI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  BELUM_TEREALISASI: 'bg-red-50 text-red-700 border-red-200',
};

/** Semantic color — satu sumber untuk badge, donut, bar, legend, dan tooltip. */
export const STATUS_COLORS: Record<ProgramStatus, string> = {
  PLAN: '#0066B3', // BLUE
  ON_PROGRESS: '#F59E0B', // ORANGE
  REALISASI: '#16A34A', // GREEN
  BELUM_TEREALISASI: '#DC2626', // RED
};

export interface ProgramStatusMeta {
  label: string;
  color: string;
  badgeClass: string;
}

/** Mapper tunggal status → label/warna/badge (canonical, backend & frontend). */
export function getProgramStatusMeta(status: ProgramStatus): ProgramStatusMeta {
  return {
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    badgeClass: STATUS_STYLES[status],
  };
}

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Format angka KPI/grafik: tampilkan desimal hanya jika diperlukan.
 * 61 → '61', 61.5 → '61.5', 0.67 → '0.7'.
 */
export function fmtNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, '');
}

/** Format persen: 61.486... → '61.5', 61 → '61', NaN/Infinity → '0'. */
export function fmtPercent(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Opsi filter status — hanya tiga status turunan dari progress
 * (Plan / On Progress / Terealisasi). BELUM_TEREALISASI tidak dipakai lagi
 * karena status selalu mengikuti progress terhadap Plan.
 */
export const STATUS_FILTER_OPTIONS: { value: Exclude<ProgramStatus, 'BELUM_TEREALISASI'>; label: string }[] = [
  { value: 'PLAN', label: 'PLAN' },
  { value: 'ON_PROGRESS', label: 'ON PROGRESS' },
  { value: 'REALISASI', label: 'TEREALISASI' },
];

export function StatusBadge({ status }: { status: ProgramStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9.5px] font-black tracking-wide whitespace-nowrap ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ProgressCell({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const barColor = value >= 100 ? 'bg-emerald-500' : value > 0 ? 'bg-[#F58220]' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full bar-grow ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-black tabular-nums text-slate-600 w-8 text-right">{value}%</span>
    </div>
  );
}

/**
 * Status program untuk BULAN TERTENTU berdasarkan data periode (Plan / Realisasi).
 *
 * CATATAN: Ini adalah status derivasi per-bulan (untuk analisis bulanan),
 * BUKAN status canonical program. Status canonical program (untuk KPI, donut,
 * tabel, filter) harus memakai `getProgramStatus` dari
 * `@/lib/programKerjaLogic` yang ditentukan dari `progress`.
 */
export function getProgramMonthStatus(
  p: { months: { month: number; target: number | null; realization: number | null }[] },
  month: number
): ProgramStatus | null {
  const mEntries = p.months.filter((x) => x.month === month);
  if (!mEntries.length) return null;
  const hasPlan = mEntries.some((x) => x.target !== null);
  const realVals = mEntries.filter((x) => x.realization !== null).map((x) => x.realization!);

  if (realVals.length > 0) {
    const maxVal = Math.max(...realVals);
    if (maxVal >= 100) return ProgramStatus.REALISASI;
    if (maxVal > 0) return ProgramStatus.ON_PROGRESS;
    if (realVals.every((v) => v === 0)) return ProgramStatus.BELUM_TEREALISASI;
  }

  if (hasPlan) return ProgramStatus.PLAN;
  return null;
}

export function EmptyState() {
  return (
    <div className="px-6 py-10 text-center">
      <div className="text-xs font-bold text-slate-400">Tidak ada program yang cocok dengan filter.</div>
    </div>
  );
}

