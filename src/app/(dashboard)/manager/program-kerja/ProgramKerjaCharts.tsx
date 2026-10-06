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
import { STATUS_LABELS, fmtNumber, fmtPercent } from './shared';

/** Warna kanonik grouped bar — Plan=biru, Realisasi=hijau, Tidak=merah. */
export const PLAN_COLOR = '#0066B3';
export const REALISASI_COLOR = '#16A34A';
export const TIDAK_TEREALISASI_COLOR = '#EF4652';

export interface ChartMonthPoint {
  month: string;
  m: number;
  /** Jumlah Program yang memiliki Plan pada bulan tsb (baseline — tidak pernah berkurang). */
  plan: number;
  /** Jumlah Program yang terealisasi pada bulan tsb. */
  realization: number;
  /** Jumlah Program berstatus TIDAK TEREALISASI pada bulan tsb. */
  notRealized: number;
}

export interface DonutSlice {
  id: ProgramStatus;
  name: string;
  /** Jumlah Program dengan status tsb (mutually exclusive — total = jumlah program). */
  value: number;
  /** Persen = value / total program × 100. */
  percent: number;
  color: string;
}

interface ProgramKerjaChartsProps {
  /** Per-bulan data — Plan, Realisasi, Tidak Terealisasi (grouped bar). */
  bar: ChartMonthPoint[];
  /** Distribusi STATUS program (PLAN / ON PROGRESS / TEREALISASI / TIDAK TEREALISASI). */
  donut: DonutSlice[];
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

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}: {fmtNumber(value)}</span>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartMonthPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div style={tooltipStyle} className="space-y-0.5 px-2.5 py-2">
      <div className="text-[11px] font-black">{point.month}</div>
      <TooltipRow color={PLAN_COLOR} label="Plan (P)" value={point.plan} />
      <TooltipRow color={REALISASI_COLOR} label="Realisasi (R)" value={point.realization} />
      <TooltipRow color={TIDAK_TEREALISASI_COLOR} label="Tidak Terealisasi" value={point.notRealized} />
    </div>
  );
}
export function ProgramKerjaCharts({ bar, donut, status }: ProgramKerjaChartsProps) {
  const isAll = !status || status === 'all';
  const displayLabel =
    !isAll
      ? STATUS_LABELS[status as ProgramStatus]
      : null;

  const totalPlan = bar.reduce((a, b) => a + b.plan, 0);
  const donutTotal = donut.reduce((a, d) => a + d.value, 0);
  const noPlan = totalPlan <= 0;

  const title = isAll ? 'Plan vs Realisasi per Bulan' : `Plan vs Realisasi per Bulan — ${displayLabel ?? ''}`;
  const subtitle = isAll
    ? 'Jumlah unit Plan (P) dan unit realisasi (R) setiap bulan. Plan adalah baseline dan tidak pernah berkurang.'
    : `Hanya program berstatus ${displayLabel} sesuai filter.`;
  const donutTitle = 'Distribusi Status Program';
  const donutSubtitle = `${fmtNumber(donutTotal)} program · satu program = satu kategori (total 100%).`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* GRAFIK PANJANG — grouped bar per bulan (Plan / Realisasi / Tidak Terealisasi) */}
      <div className="lg:col-span-2 bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">{title}</div>
        <p className="text-[10px] font-semibold text-text-muted mb-3">{subtitle}</p>
        {noPlan ? (
          <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-surface-2/40">
            <div className="text-xs font-black text-text-secondary">Tidak ada Plan pada periode ini</div>
            <div className="text-[10px] font-semibold text-text-muted">Tambahkan Plan (target) untuk melihat progress.</div>
          </div>
        ) : (
          // Horizontal scroll hanya pada area chart (mobile) — halaman tidak overflow.
          <div className="overflow-x-auto pb-1">
            <div className="h-64 min-w-[560px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Program', angle: -90, position: 'insideLeft', offset: 2, style: { fontSize: 10, fill: '#94A3B8' } }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
                  <Legend verticalAlign="bottom" height={34} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="plan" name="Plan (P)" fill={PLAN_COLOR} radius={[2, 2, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="realization" name="Realisasi (R)" fill={REALISASI_COLOR} radius={[2, 2, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="notRealized" name="Tidak Terealisasi" fill={TIDAK_TEREALISASI_COLOR} radius={[2, 2, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* GRAFIK BULAT — distribusi status program (mengikuti data/status Program) */}
      <div className="bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">{donutTitle}</div>
        <p className="text-[10px] font-semibold text-text-muted mb-2">{donutSubtitle}</p>
        {donutTotal === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-2/40">
            <div className="text-[11px] font-black text-text-secondary">Tidak ada program</div>
            <div className="text-[9.5px] font-semibold text-text-muted">Sesuaikan filter.</div>
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
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${fmtNumber(Number(value ?? 0))} program`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black tabular-nums text-text-primary">{fmtNumber(donutTotal)}</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Program</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-1.5 mt-2">
          {donut.map((d) => (
            <div key={d.id} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-text-secondary">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
              <span className="ml-auto tabular-nums text-text-primary font-black">
                {fmtNumber(d.value)}{donutTotal > 0 ? ` · ${fmtPercent(d.percent)}%` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}