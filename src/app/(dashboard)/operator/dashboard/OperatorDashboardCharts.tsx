'use client';

import React, { useMemo, useState } from 'react';
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

interface MonthlyStat {
  month: number;
  work: number;
  pagi: number;
  malam: number;
  off: number;
  cuti: number;
  izin: number;
  sakit: number;
  noData: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const tooltipStyle = {
  fontSize: '11px',
  borderRadius: '8px',
  backgroundColor: 'var(--surface-elevated, #FFFFFF)',
  borderColor: 'var(--border-app, #E2E8F0)',
  color: 'var(--text-primary, #0F172A)',
};

export function OperatorDashboardCharts({
  programBar,
  programDonut,
  monthlyStats,
}: {
  programBar: ProgramBarPoint[];
  programDonut: DonutPoint[];
  monthlyStats: MonthlyStat[];
}) {
  const donutTotal = programDonut.reduce((a, d) => a + d.value, 0);

  // Grafik Hari Kerja: default bulan berjalan, user dapat memilih bulan.
  const nowMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(nowMonth);
  const selected = monthlyStats.find((m) => m.month === selectedMonth) ?? {
    month: selectedMonth, work: 0, pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0, noData: 0,
  };

  const monthBarData = useMemo(
    () =>
      monthlyStats.map((m) => ({
        month: MONTHS[m.month - 1],
        'Hari Kerja': m.work,
        'OFF': m.off,
        'Cuti': m.cuti,
        'Izin': m.izin,
        'Sakit': m.sakit,
      })),
    [monthlyStats]
  );

  const statusDonut: DonutPoint[] = [
    { name: 'Pagi', value: selected.pagi, color: '#38A9EA' },
    { name: 'Malam', value: selected.malam, color: '#0088D8' },
    { name: 'OFF', value: selected.off, color: '#64798D' },
    { name: 'Cuti', value: selected.cuti, color: '#F59E0B' },
    { name: 'Izin', value: selected.izin, color: '#14B8A6' },
    { name: 'Sakit', value: selected.sakit, color: '#F43F5E' },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* A. Program Kerja: Plan vs Realisasi per Bulan (seperti dashboard Admin) */}
      <div className="lg:col-span-2 bg-surface-1 dark:bg-[#0D263E] rounded-2xl border border-surface-border dark:border-[rgba(120,190,235,0.14)] shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary dark:text-[#F5FAFF] mb-1">
          Plan vs Realisasi per Bulan
        </div>
        <p className="text-[10px] font-semibold text-text-muted dark:text-[#AFC4D6] mb-3">
          Jumlah program berjadwal (P) dan terealisasi (R = 100) setiap bulan — {donutTotal} program, data dari program kerja.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programBar} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="plan" name="Plan (P)" fill="#0088D8" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="realisasi" name="Realisasi (R)" fill="#69BE28" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="tidakTerealisasi" name="Tidak Terealisasi" fill="#EF4652" radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* B. Donut ringkasan status jadwal */}
      <div className="bg-surface-1 dark:bg-[#0D263E] rounded-2xl border border-surface-border dark:border-[rgba(120,190,235,0.14)] shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="text-sm font-black text-text-primary dark:text-[#F5FAFF] mb-1">Ringkasan Status Jadwal</div>
        <p className="text-[10px] font-semibold text-text-muted dark:text-[#AFC4D6] mb-2">
          {MONTHS[selected.month - 1]} — jadwal final (cuti/izin disetujui sudah dihitung).
        </p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusDonut}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {statusDonut.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {statusDonut.length ? (
            statusDonut.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-text-secondary dark:text-[#C5D7E7]">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.name}</span>
                <span className="font-black text-text-primary dark:text-[#F5FAFF] ml-auto">{d.value}</span>
              </div>
            ))
          ) : (
            <p className="col-span-2 text-[10.5px] text-text-muted">Belum ada data jadwal bulan ini.</p>
          )}
        </div>
      </div>


      {/* C. Grafik Hari Kerja per Bulan */}
      <div className="lg:col-span-3 bg-surface-1 dark:bg-[#0D263E] rounded-2xl border border-surface-border dark:border-[rgba(120,190,235,0.14)] shadow-xs p-4 sm:p-5 card-subtle-hover">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-text-primary dark:text-[#F5FAFF] mb-1">
              Grafik Hari Kerja per Bulan
            </div>
            <p className="text-[10px] font-semibold text-text-muted dark:text-[#AFC4D6] mb-1 flex items-center gap-1">
              <Info className="h-3 w-3 text-[#38A9EA]" /> Dihitung dari jadwal final — tanpa duplicate schedule, tanpa request pending.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Hari Kerja</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{selected.work} Hari</div>
              <div className="text-[9.5px] font-semibold text-text-muted">
                Pg {selected.pagi} · Mlm {selected.malam} · OFF {selected.off} · Cuti {selected.cuti} · Izin {selected.izin}
              </div>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border border-[#CBD7E6] bg-white dark:bg-[#0D263E] px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
              aria-label="Pilih Bulan"
            >
              {monthlyStats.map((m) => (
                <option key={m.month} value={m.month}>
                  {MONTHS[m.month - 1]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthBarData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border, #EDF2F7)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={{ stroke: 'var(--surface-border, #E2E8F0)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted, #94A3B8)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-interactive, #F1F5F9)' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Hari Kerja" name="Hari Kerja" fill="#69BE28" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="OFF" name="OFF" fill="#64798D" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Cuti" name="Cuti" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Izin" name="Izin" fill="#14B8A6" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Sakit" name="Sakit" fill="#F43F5E" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

