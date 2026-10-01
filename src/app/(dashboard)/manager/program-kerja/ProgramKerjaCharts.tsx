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
import type { MonthlyBreakdownPoint } from '@/lib/programKerjaLogic';
import { STATUS_LABELS, fmtNumber, fmtPercent } from './shared';

/** Warna kanonik — satu sumber untuk bar, donut, dan legenda. */
export const REALISASI_COLOR = '#16A34A'; // hijau — bagian Plan yang terealisasi
export const REMAINING_COLOR = '#64748B'; // slate — sisa Plan yang belum terealisasi

export interface DonutSlice {
  id: string;
  name: string;
  /** Nilai agregat (Realisasi / Remaining) dari dataset yang sama dengan KPI. */
  value: number;
  /** Persen terhadap total Plan (Realisasi% + Remaining% = 100%). */
  percent: number;
  color: string;
}

interface ProgramKerjaChartsProps {
  bar: MonthlyBreakdownPoint[];
  donut: DonutSlice[];
  year: number;
  /** Ketika filter bulan aktif, bar hanya menampilkan bulan tersebut. */
  monthOnly?: string | null;
  /** Nilai filter status aktif — grafik mengikuti status ini. */
  status?: 'all' | ProgramStatus;
}

const tooltipStyle: React.CSSProperties = {
  fontSize: '11px',
  borderRadius: '8px',
  backgroundColor: 'var(--surface-1, #FFFFFF)',
  borderColor: 'var(--surface-border, #E2E8F0)',
  color: 'var(--text-primary, #0F172A)',
  boxShadow: '0 2px 8px rgba(15, 49, 90, 0.08)',
};

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MonthlyBreakdownPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div style={tooltipStyle} className="space-y-0.5 px-2.5 py-2">
      <div className="text-[11px] font-black">{point.month}</div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--text-primary, #0F172A)' }} />
        <span>Plan: {fmtNumber(point.plan)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: REALISASI_COLOR }} />
        <span>Realisasi: {fmtNumber(point.realization)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: REMAINING_COLOR }} />
        <span>Remaining: {fmtNumber(point.remaining)}</span>
      </div>
      <div className="pt-0.5 font-black">Progress: {fmtPercent(point.progress)}%</div>
    </div>
  );
}

export function ProgramKerjaCharts({ bar, donut, year, monthOnly, status }: ProgramKerjaChartsProps) {
  const isAll = !status || status === 'all';
  const displayLabel =
    !isAll
      ? status === 'REALISASI'
        ? 'TEREALISASI'
        : STATUS_LABELS[status as Exclude<ProgramStatus, 'BELUM_TEREALISASI'>]
      : null;

  const totalPlan = bar.reduce((a, b) => a + b.plan, 0);
  const totalReal = bar.reduce((a, b) => a + b.realization, 0);
  const totalRemaining = bar.reduce((a, b) => a + b.remaining, 0);
  const overallProgress = totalPlan > 0 ? (totalReal / totalPlan) * 100 : 0;
  const noPlan = totalPlan <= 0;

  const barTitle = isAll
    ? monthOnly
      ? `Realisasi vs Remaining — ${monthOnly} ${year}`
      : `Realisasi vs Remaining per Bulan — ${year}`
    : `Program ${displayLabel ?? ''} — ${monthOnly ?? 'Tahunan'} ${year}`;
  const barSubtitle = isAll
    ? `Total Plan ${fmtNumber(totalPlan)} = Realisasi ${fmtNumber(totalReal)} + Remaining ${fmtNumber(totalRemaining)}. Plan adalah baseline dan tidak pernah dihapus saat terealisasi.`
    : `Hanya program berstatus ${displayLabel} sesuai filter (Plan = ${fmtNumber(totalPlan)}).`;

  const donutTitle = 'Realisasi vs Remaining';
  const donutSubtitle = `Subset filter yang sama dengan KPI/tabel — Total Plan ${fmtNumber(totalPlan)}.`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Bar — Realisasi + Remaining = Plan (Rule 8) */}
      <div className="lg:col-span-2 bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">{barTitle}</div>
        <p className="text-[10px] font-semibold text-text-muted mb-3">{barSubtitle}</p>
        {noPlan ? (
          <div className="flex h-60 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-surface-2/40">
            <div className="text-xs font-black text-text-secondary">Tidak ada Plan pada periode ini</div>
            <div className="text-[10px] font-semibold text-text-muted">Tambahkan Plan (target) untuk melihat progress.</div>
          </div>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bar} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="realization" name="Realisasi" stackId="plan" fill={REALISASI_COLOR} radius={[2, 2, 0, 0]} maxBarSize={28} />
                <Bar dataKey="remaining" name="Remaining (Sisa Plan)" stackId="plan" fill={REMAINING_COLOR} radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Donut — Realisasi% + Remaining% = 100% (Rule 9) */}
      <div className="bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">{donutTitle}</div>
        <p className="text-[10px] font-semibold text-text-muted mb-2">{donutSubtitle}</p>
        {noPlan ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-2/40">
            <div className="text-[11px] font-black text-text-secondary">Tidak ada Plan</div>
            <div className="text-[9.5px] font-semibold text-text-muted">Progress 0%</div>
          </div>
        ) : (
          <div className="relative h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} strokeWidth={0} startAngle={90} endAngle={-270}>
                  {donut.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${fmtPercent(Number(value ?? 0))}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black tabular-nums text-text-primary">{fmtPercent(overallProgress)}%</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Progress</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-1.5 mt-2">
          {donut.map((d) => (
            <div key={d.id} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-text-secondary">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
              <span className="font-black text-text-primary ml-auto tabular-nums">{noPlan ? '0%' : `${fmtPercent(d.percent)}%`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}