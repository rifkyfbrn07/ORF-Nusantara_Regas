'use client';

import React from 'react';
import { Activity } from 'lucide-react';

interface OperationalPulseCardProps {
  totalToday: number;
  pagiCount: number;
  malamCount: number;
  offCount: number;
}

export function OperationalPulseCard({
  totalToday,
  pagiCount,
  malamCount,
  offCount,
}: OperationalPulseCardProps) {
  // Calculate proportional timeline bar widths
  const sum = Math.max(pagiCount + malamCount + offCount, 1);
  const pagiWidth = Math.max(Math.round((pagiCount / sum) * 100), 15);
  const malamWidth = Math.max(Math.round((malamCount / sum) * 100), 15);
  const offWidth = Math.max(100 - pagiWidth - malamWidth, 10);

  return (
    <div className="card-command-center p-5 flex flex-col justify-between h-full min-h-[300px]">
      {/* 1. Header with LIVE Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider leading-tight">
              OPERATIONAL PULSE
            </h3>
            <p className="text-[11px] text-[#64748B] dark:text-[#AFC4D6] font-medium mt-0.5">
              Ritme operasional hari ini
            </p>
          </div>
        </div>

        {/* Live Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22A65A]/10 dark:bg-[rgba(105,190,40,0.12)] border border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] text-[#22A65A] dark:text-[#69BE28] text-[10px] font-black uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28] shadow-[0_0_6px_#69BE28] animate-pulse-subtle" />
          LIVE
        </div>
      </div>

      {/* 2. Top 4 Metric Stat Columns */}
      <div className="grid grid-cols-4 gap-2 my-auto py-2 text-center">
        {/* Jadwal Hari Ini */}
        <div className="flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-black text-[#0B3568] dark:text-[#F5FAFF] leading-tight">
            {totalToday}
          </span>
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#AFC4D6] mt-0.5">
            Jadwal Hari Ini
          </span>
        </div>

        {/* Shift Pagi */}
        <div className="flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-black text-[#0077C8] dark:text-[#38A9EA] leading-tight">
            {pagiCount}
          </span>
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#AFC4D6] mt-0.5">
            Shift Pagi
          </span>
        </div>

        {/* Shift Malam */}
        <div className="flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-black text-[#123D70] dark:text-[#55B9F2] leading-tight">
            {malamCount}
          </span>
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#AFC4D6] mt-0.5">
            Shift Malam
          </span>
        </div>

        {/* Off */}
        <div className="flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-black text-[#64748B] dark:text-[#94A9BA] leading-tight">
            {offCount}
          </span>
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#AFC4D6] mt-0.5">
            Off
          </span>
        </div>
      </div>

      {/* 3. 24-Hour Operation Timeline Bar */}
      <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)]">
        {/* Segmented Bar */}
        <div className="h-3.5 w-full bg-[#E2E8F0] dark:bg-[#29435A] rounded-full overflow-hidden flex gap-1 p-0.5">
          <div
            style={{ width: `${pagiWidth}%` }}
            className="h-full rounded-full bg-[#0077C8] dark:bg-[#38A9EA] shadow-xs transition-all duration-500"
            title={`Shift Pagi: ${pagiCount}`}
          />
          <div
            style={{ width: `${malamWidth}%` }}
            className="h-full rounded-full bg-[#123D70] dark:bg-[#0088D8] shadow-xs transition-all duration-500"
            title={`Shift Malam: ${malamCount}`}
          />
          <div
            style={{ width: `${offWidth}%` }}
            className="h-full rounded-full bg-[#94A3B8] dark:bg-[#64798D] shadow-xs transition-all duration-500"
            title={`Off: ${offCount}`}
          />
        </div>

        {/* Time Marks */}
        <div className="flex items-center justify-between text-[9px] font-mono font-bold text-[#64748B] dark:text-[#8EA7BD] px-1">
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>

        {/* Bottom Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] pt-1">
          <span className="flex items-center gap-1.5 font-bold text-[#0B3568] dark:text-[#F5FAFF]">
            <span className="h-2 w-2 rounded-full bg-[#0077C8] dark:bg-[#38A9EA]" />
            Day Shift
          </span>
          <span className="flex items-center gap-1.5 font-bold text-[#0B3568] dark:text-[#F5FAFF]">
            <span className="h-2 w-2 rounded-full bg-[#123D70] dark:bg-[#0088D8]" />
            Night Shift
          </span>
          <span className="flex items-center gap-1.5 font-bold text-[#64748B] dark:text-[#AFC4D6]">
            <span className="h-2 w-2 rounded-full bg-[#94A3B8] dark:bg-[#64798D]" />
            Off
          </span>
        </div>
      </div>
    </div>
  );
}
