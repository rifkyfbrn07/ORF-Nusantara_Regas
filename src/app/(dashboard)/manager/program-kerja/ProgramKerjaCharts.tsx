'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ProgramStatus } from '@prisma/client';
import { STATUS_COLORS, STATUS_LABELS } from './shared';

interface ProgramBarPoint {
  month: string;
  // Status spesifik → { count } | SEMUA → { PLAN | ON_PROGRESS | REALISASI | BELUM_TEREALISASI }
  [key: string]: number | string;
}

interface DonutPoint {
  name: string;
  value: number;
  color: string;
}

export function ProgramKerjaCharts({
  bar,
  donut,
  year,
  monthOnly,
  status,
}: {
  bar: ProgramBarPoint[];
  donut: DonutPoint[];
  year: number;
  /** Ketika filter bulan aktif, bar hanya menampilkan bulan tersebut. */
  monthOnly?: string | null;
  /** Nilai filter status aktif — grafik mengikuti status ini. */
  status?: 'all' | ProgramStatus;
}) {
  const donutTotal = donut.reduce((a, d) => a + d.value, 0);
  const tooltipStyle = {
    fontSize: '11px',
    borderRadius: '8px',
    backgroundColor: 'var(--surface-1, #FFFFFF)',
    borderColor: 'var(--surface-border, #E2E8F0)',
    color: 'var(--text-primary, #0F172A)',
    boxShadow: '0 2px 8px rgba(15, 49, 90, 0.08)',
  };
  const isAll = !status || status === 'all';

  const displayLabel =
    status && status !== 'all'
      ? status === 'BELUM_TEREALISASI'
        ? 'Tidak Terealisasi'
        : STATUS_LABELS[status]
      : null;

  // Judul dinamis — tidak pernah lagi kaku "Target vs Realisasi".
  const barTitle = isAll
    ? 'Distribusi Program Kerja per Bulan'
    : `Program Kerja ${displayLabel} per Bulan`;
  const barSubtitle = monthOnly
    ? `Data untuk periode ${monthOnly} ${year} — subset filter yang sama dengan tabel & KPI.`
    : isAll
      ? 'Perbandingan jumlah program setiap status per bulan (search, tahun, bulan & kategori ikut difilter).'
      : `Hanya program berstatus ${displayLabel} yang cocok dengan filter.`;

  const donutTitle = 'Ringkasan Status';
  const donutSubtitle = `Subset filter yang sama dengan tabel/KPI (${donutTotal} program).`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Bar — grouped (SEMUA) / single series (status spesifik) */}
      <div className="lg:col-span-2 bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">{barTitle}</div>
        <p className="text-[10px] font-semibold text-text-muted mb-3">{barSubtitle}</p>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bar} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
              {isAll && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {isAll ? (
                <>
                  <Bar dataKey="PLAN" name="PLAN" fill={STATUS_COLORS.PLAN} radius={[2, 2, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="ON_PROGRESS" name="ON PROGRESS" fill={STATUS_COLORS.ON_PROGRESS} radius={[2, 2, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="REALISASI" name="REALISASI" fill={STATUS_COLORS.REALISASI} radius={[2, 2, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="BELUM_TEREALISASI" name="TIDAK TEREALISASI" fill={STATUS_COLORS.BELUM_TEREALISASI} radius={[2, 2, 0, 0]} maxBarSize={14} />
                </>
              ) : (
                <Bar
                  dataKey="count"
                  name={displayLabel ?? 'Program'}
                  fill={STATUS_COLORS[status ?? 'PLAN']}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut — selalu dari subset filter yang sama */}
      <div className="bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">{donutTitle}</div>
        <p className="text-[10px] font-semibold text-text-muted mb-2">{donutSubtitle}</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={donut.length > 1 ? 2 : 0} strokeWidth={0}>
                {donut.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {donut.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-text-secondary">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
              <span className="font-black text-text-primary ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}