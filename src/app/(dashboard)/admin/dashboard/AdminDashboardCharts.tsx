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
}

const chartTooltipStyle = {
  fontSize: '11px',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
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
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5">
        <div className="text-sm font-black text-[#092B57] mb-1">
          Plan vs Realisasi per Bulan
        </div>
        <p className="text-[10px] font-semibold text-slate-400 mb-3">
          Jumlah program berjadwal (P) dan terealisasi (R = 100) setiap bulan.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programBar} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: '#F1F5F9' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="plan" name="Plan (P)" fill="#94A3B8" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="realisasi" name="Realisasi (R)" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="tidakTerealisasi" name="Tidak Terealisasi" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut: status program */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5">
        <div className="text-sm font-black text-[#092B57] mb-1">Status Program</div>
        <p className="text-[10px] font-semibold text-slate-400 mb-2">Distribusi {donutTotal} program.</p>
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
            <div key={d.name} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              {d.name}
              <span className="font-black text-[#0B3568] ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar: schedule summary per bulan */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5">
        <div className="text-sm font-black text-[#092B57] mb-1">
          Ringkasan Kehadiran Berdasarkan Jadwal
        </div>
        <p className="text-[10px] font-semibold text-slate-400 mb-3 flex items-center gap-1">
          <Info className="h-3 w-3" /> Dihitung dari jadwal kerja operator (bukan check-in aktual).
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scheduleSummary} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: '#F1F5F9' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="pagi" name="Jadwal Pagi" fill="#0066B3" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="malam" name="Jadwal Malam" fill="#123B6D" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="off" name="Hari Off" fill="#CBD5E1" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
