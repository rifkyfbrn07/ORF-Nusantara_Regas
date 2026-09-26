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
import { Info } from 'lucide-react';

interface ProgramBarPoint {
  month: string;
  plan: number;
  realisasi: number;
  tidakTerealisasi: number;
}

interface DonutPoint {
  name: string;
  value: number;
  color: string;
}

interface SchedulePoint {
  month: string;
  pagi: number;
  malam: number;
  off: number;
  cuti: number;
  izin: number;
  sakit: number;
}

const chartTooltipStyle = {
  fontSize: '11px',
  borderRadius: '8px',
  backgroundColor: 'var(--surface-elevated, #FFFFFF)',
  borderColor: 'var(--border-app, #E2E8F0)',
  color: 'var(--text-primary, #0F172A)',
};

export function AdminDashboardCharts({
  programBar,
  programDonut,
  scheduleSummary,
}: {
  programBar: ProgramBarPoint[];
  programDonut: DonutPoint[];
  scheduleSummary: SchedulePoint[];
}) {
  const donutTotal = programDonut.reduce((a, d) => a + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Bar: Plan vs Realisasi per bulan */}
      <div className="lg:col-span-2 bg-surface-1 dark:bg-[#0D263E] rounded-2xl border border-surface-border dark:border-[rgba(120,190,235,0.14)] shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary dark:text-[#F5FAFF] mb-1">
          Plan vs Realisasi per Bulan
        </div>
        <p className="text-[10px] font-semibold text-text-muted dark:text-[#AFC4D6] mb-3">
          Jumlah program berjadwal (P) dan terealisasi (R = 100) setiap bulan.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programBar} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="plan" name="Plan (P)" fill="#0088D8" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="realisasi" name="Realisasi (R)" fill="#69BE28" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="tidakTerealisasi" name="Tidak Terealisasi" fill="#EF4652" radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut: status program */}
      <div className="bg-surface-1 dark:bg-[#0D263E] rounded-2xl border border-surface-border dark:border-[rgba(120,190,235,0.14)] shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary dark:text-[#F5FAFF] mb-1">Status Program</div>
        <p className="text-[10px] font-semibold text-text-muted dark:text-[#AFC4D6] mb-2">Distribusi {donutTotal} program.</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={programDonut}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {programDonut.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {programDonut.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-text-secondary dark:text-[#C5D7E7]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
              <span className="font-black text-text-primary dark:text-[#F5FAFF] ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar: schedule summary per bulan */}
      <div className="lg:col-span-3 bg-surface-1 dark:bg-[#0D263E] rounded-2xl border border-surface-border dark:border-[rgba(120,190,235,0.14)] shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary dark:text-[#F5FAFF] mb-1">
          Ringkasan Kehadiran Berdasarkan Jadwal
        </div>
        <p className="text-[10px] font-semibold text-text-muted dark:text-[#AFC4D6] mb-3 flex items-center gap-1">
          <Info className="h-3 w-3 text-[#38A9EA]" /> Dihitung dari jadwal final (Cuti/Izin APPROVED sudah diperhitungkan; bukan check-in aktual).
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scheduleSummary} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="pagi" name="Jadwal Pagi" fill="#38A9EA" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="malam" name="Jadwal Malam" fill="#0088D8" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="off" name="Hari Off" fill="#64798D" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="cuti" name="Cuti" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="izin" name="Izin" fill="#14B8A6" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="sakit" name="Sakit" fill="#F43F5E" radius={[3, 3, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
