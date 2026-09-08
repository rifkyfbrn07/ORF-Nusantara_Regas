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

export function ProgramKerjaCharts({
  bar,
  donut,
  year,
}: {
  bar: ProgramBarPoint[];
  donut: DonutPoint[];
  year: number;
}) {
  const donutTotal = donut.reduce((a, d) => a + d.value, 0);
  const tooltipStyle = { fontSize: '11px', borderRadius: '8px', border: '1px solid #E2E8F0' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Bar: Plan vs Realisasi per bulan */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5">
        <div className="text-sm font-black text-[#092B57]">Target vs Realisasi per Bulan ({year})</div>
        <p className="text-[10px] font-semibold text-slate-400 mb-3">
          Jumlah program berjadwal (P) dan terealisasi (R = 100) setiap bulan.
        </p>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bar} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F1F5F9' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="plan" name="Plan (P)" fill="#94A3B8" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="realisasi" name="Realisasi (R)" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="tidakTerealisasi" name="Tidak Terealisasi" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut: status */}
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5">
        <div className="text-sm font-black text-[#092B57]">Status Program</div>
        <p className="text-[10px] font-semibold text-slate-400 mb-2">Distribusi {donutTotal} program.</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} strokeWidth={0}>
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
            <div key={d.name} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              {d.name}
              <span className="font-black text-[#0B3568] ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
