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
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ProgramStatus } from '@prisma/client';
import { STATUS_LABELS, fmtNumber, fmtPercent } from './shared';

/** Warna kanonik bar — satu sumber (bar & legenda). */
export const BAR_REALISASI_COLOR = '#16A34A'; // hijau — bagian Plan yang sudah terealisasi
export const BAR_TIDAK_TEREALISASI_COLOR = '#EF4652'; // merah — sisa Plan yang belum terealisasi

export interface BarPoint {
  /** Label kategori (mis. "2026" untuk PER TAHUN, "Jan 2026" untuk PER BULAN). */
  label: string;
  /** Total Plan = baseline (jumlah program ber-Plan dalam scope). */
  plan: number;
  /** Jumlah program terealisasi penuh (progress >= 100%). */
  realization: number;
  /** Tidak Terealisasi = max(plan - realization, 0). */
  notRealized: number;
}

export interface DonutSlice {
  id: ProgramStatus;
  name: string;
  /** Jumlah program dengan status tsb (mutually exclusive). */
  value: number;
  /** Persen = value / total program × 100. Total slice = 100%. */
  percent: number;
  color: string;
}

interface ProgramKerjaChartsProps {
  /** Satu titik — total panjang bar = PLAN (tidak pernah double count). */
  bar: BarPoint[];
  /** Distribusi STATUS program (PLAN/ON PROGRESS/TEREALISASI/TIDAK TEREALISASI). */
  donut: DonutSlice[];
  year: number;
  monthOnly?: string | null;
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
  payload?: Array<{ payload: BarPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const progress = point.plan > 0 ? (point.realization / point.plan) * 100 : 0;
  return (
    <div style={tooltipStyle} className="space-y-0.5 px-2.5 py-2">
      <div className="text-[11px] font-black">{point.label}</div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--text-primary, #0F172A)' }} />
        <span>Plan (baseline): {fmtNumber(point.plan)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BAR_REALISASI_COLOR }} />
        <span>TEREALISASI: {fmtNumber(point.realization)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BAR_TIDAK_TEREALISASI_COLOR }} />
        <span>TIDAK TEREALISASI: {fmtNumber(point.notRealized)}</span>
      </div>
      <div className="pt-0.5 font-black">Progress: {fmtPercent(progress)}%</div>
    </div>
  );
}

export function ProgramKerjaCharts({ bar, donut, year, monthOnly, status }: ProgramKerjaChartsProps) {
  const isAll = !status || status === 'all';
  const displayLabel = !isAll ? STATUS_LABELS[status as ProgramStatus] : null;

  const point = bar[0];
  const donutTotal = donut.reduce((a, d) => a + d.value, 0);
  const plan = point?.plan ?? 0;
  const realization = point?.realization ?? 0;
  const notRealized = point?.notRealized ?? 0;
  const noPlan = plan <= 0;

  const title = isAll
    ? monthOnly
      ? `Plan vs Realisasi — ${monthOnly} ${year}`
      : `Plan vs Realisasi — ${year}`
    : `Program ${displayLabel ?? ''} — ${monthOnly ?? 'Tahunan'} ${year}`;

  const barSummary = isAll
    ? `Plan ${fmtNumber(plan)} = TEREALISASI ${fmtNumber(realization)} + TIDAK TEREALISASI ${fmtNumber(notRealized)}. Plan adalah baseline dan tidak pernah berkurang.`
    : `Hanya program berstatus ${displayLabel} sesuai filter (Plan = ${fmtNumber(plan)}).`;

  const donutSubtitle = `Distribusi status ${fmtNumber(donutTotal)} program — setiap program masuk tepat satu kategori (total = 100%).`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* BAR — baseline PLAN; TEREALISASI + TIDAK TEREALISASI = PLAN */}
      <div className="lg:col-span-2 bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">{title}</div>
        <p className="text-[10px] font-semibold text-text-muted mb-3">{barSummary}</p>
        {noPlan ? (
          <div className="flex h-60 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-surface-2/40">
            <div className="text-xs font-black text-text-secondary">Tidak ada Plan pada periode ini</div>
            <div className="text-[10px] font-semibold text-text-muted">Tambahkan Plan (target) untuk melihat progress.</div>
          </div>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bar} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} domain={[0, Math.ceil((plan * 1.15) / 5) * 5 || 5]} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={plan} stroke="var(--text-secondary, #475569)" strokeDasharray="4 3" strokeWidth={1} />
                <Bar dataKey="realization" name="TEREALISASI" stackId="plan" fill={BAR_REALISASI_COLOR} radius={[2, 2, 0, 0]} maxBarSize={72} />
                <Bar dataKey="notRealized" name="TIDAK TEREALISASI" stackId="plan" fill={BAR_TIDAK_TEREALISASI_COLOR} radius={[2, 2, 0, 0]} maxBarSize={72} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DONUT — distribusi STATUS program (mutually exclusive) */}
      <div className="bg-surface-1 rounded-xl border border-surface-border shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary">Distribusi Status Program</div>
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