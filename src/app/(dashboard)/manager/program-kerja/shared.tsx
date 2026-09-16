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
  REALISASI: 'REALISASI',
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
 * Mengembalikan status program untuk bulan tertentu berdasarkan data period (Plan / Realisasi)
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

