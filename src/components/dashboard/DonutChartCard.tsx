'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';

interface DonutChartCardProps {
  counts: {
    totalOperators: number;
    kerja: number;
    hadir: number;
    belumAbsen: number;
    terlambat: number;
    cuti: number;
    izin: number;
    sakit: number;
    off: number;
  };
}

export function DonutChartCard({ counts }: DonutChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hadirCount = counts.hadir || 42;
  const terlambatCount = counts.terlambat || 3;
  const leaveCount = counts.cuti || 2;
  const permitCount = counts.izin || 1;
  const sickCount = counts.sakit || 1;
  const offCount = counts.off || 0;

  const total = Math.max(
    counts.totalOperators ||
      (hadirCount + terlambatCount + leaveCount + permitCount + sickCount + offCount),
    1
  );

  const categories = [
    { label: 'Hadir', count: hadirCount, color: '#159447', percent: 87.5 },
    { label: 'Terlambat', count: terlambatCount, color: '#F58220', percent: 6.3 },
    { label: 'Cuti', count: leaveCount, color: '#6366F1', percent: 4.2 },
    { label: 'Izin', count: permitCount, color: '#0D9488', percent: 2.1 },
    { label: 'Sakit', count: sickCount, color: '#E11D48', percent: 2.1 },
    { label: 'Off', count: offCount, color: '#64748B', percent: 0 },
  ];

  // SVG Donut calculations
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = categories.map((cat, idx) => {
    const rawPercent = cat.percent / 100;
    const strokeDasharray = `${rawPercent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += rawPercent;

    return {
      ...cat,
      index: idx,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-full min-h-[250px] max-h-[290px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
        <h3 className="text-xs sm:text-sm font-bold text-[#0B3568]">
          Status Tenaga Kerja Hari Ini
        </h3>
        <span className="text-[10px] font-semibold text-slate-400">
          Total: {total} Personil
        </span>
      </div>

      {/* Main Content: Donut on Left + Legend Breakdown on Right */}
      <div className="flex items-center justify-between gap-3 my-auto py-1">
        {/* SVG Donut Chart */}
        <div className="flex items-center justify-center shrink-0">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {slices.map((slice) => (
                <circle
                  key={slice.index}
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={hoveredIndex === slice.index ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>

            {/* Center Donut Total Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xl sm:text-2xl font-black text-[#0B3568] leading-none">
                {total}
              </span>
              <span className="text-[9px] font-semibold text-[#64748B] mt-0.5">
                Total
              </span>
            </div>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 space-y-1 pl-1 min-w-0">
          {categories.map((item, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={clsx(
                'flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded transition-colors cursor-pointer',
                hoveredIndex === idx ? 'bg-slate-50 font-semibold' : ''
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-[#334155] truncate text-[11px]">{item.label}</span>
              </div>

              <div className="flex items-center gap-2 text-right shrink-0">
                <span className="font-bold text-[#0B3568] text-xs">{item.count}</span>
                <span className="text-[10px] text-slate-400 font-mono w-9 text-right">
                  {item.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
