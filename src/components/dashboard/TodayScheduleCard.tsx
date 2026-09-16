'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarDays, Sun, Moon, Coffee, ArrowRight } from 'lucide-react';

export interface ScheduleDetailRow {
  waktu: string;
  shift: string;
  jumlahOperator: number;
  status: string;
}

interface TodayScheduleCardProps {
  dateLabel?: string;
  totalJadwal: number;
  shiftPagi: number;
  shiftMalam: number;
  offCount: number;
  scheduleRows?: ScheduleDetailRow[];
  viewAllHref?: string;
}

export function TodayScheduleCard({
  dateLabel,
  totalJadwal,
  shiftPagi,
  shiftMalam,
  offCount,
  scheduleRows = [],
  viewAllHref = '/manager/schedules',
}: TodayScheduleCardProps) {
  const defaultRows: ScheduleDetailRow[] = [
    { waktu: '06:00 - 14:00', shift: 'Pagi', jumlahOperator: shiftPagi || 5, status: 'Normal' },
    { waktu: '14:00 - 22:00', shift: 'Malam', jumlahOperator: Math.ceil(shiftMalam / 2) || 4, status: 'Normal' },
    { waktu: '22:00 - 06:00', shift: 'Malam', jumlahOperator: Math.floor(shiftMalam / 2) || 4, status: 'Normal' },
  ];

  const rows = scheduleRows.length > 0 ? scheduleRows : defaultRows;

  return (
    <div className="card-command-center p-5 sm:p-6 flex flex-col justify-between h-full space-y-5">
      {/* 1. Header with Date & View All Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
            <CalendarDays className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider">
            JADWAL HARI INI
          </h3>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {dateLabel && (
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#AFC4D6]">
              {dateLabel}
            </span>
          )}
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-xs font-black text-[#0077C8] dark:text-[#38A9EA] hover:underline"
          >
            Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Top 4 Metric Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* TOTAL JADWAL */}
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-[#F4F9FC] dark:bg-[#081D31] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#64748B] dark:text-[#8EA7BD]">
              TOTAL JADWAL
            </div>
            <div className="text-2xl font-black text-[#0B3568] dark:text-[#F5FAFF] tabular-nums mt-0.5">
              {totalJadwal}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>

        {/* SHIFT PAGI */}
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-[#F4F9FC] dark:bg-[#081D31] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#64748B] dark:text-[#8EA7BD]">
              SHIFT PAGI
            </div>
            <div className="text-2xl font-black text-[#0077C8] dark:text-[#38A9EA] tabular-nums mt-0.5">
              {shiftPagi}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#38A9EA] flex items-center justify-center shrink-0">
            <Sun className="h-4 w-4" />
          </div>
        </div>

        {/* SHIFT MALAM */}
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-[#F4F9FC] dark:bg-[#081D31] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#64748B] dark:text-[#8EA7BD]">
              SHIFT MALAM
            </div>
            <div className="text-2xl font-black text-[#123D70] dark:text-[#55B9F2] tabular-nums mt-0.5">
              {shiftMalam}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-[#123D70]/10 dark:bg-[#0088D8]/20 text-[#123D70] dark:text-[#55B9F2] flex items-center justify-center shrink-0">
            <Moon className="h-4 w-4" />
          </div>
        </div>

        {/* OFF */}
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-[#F4F9FC] dark:bg-[#081D31] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#64748B] dark:text-[#8EA7BD]">
              OFF
            </div>
            <div className="text-2xl font-black text-[#64748B] dark:text-[#94A9BA] tabular-nums mt-0.5">
              {offCount}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-[#64748B]/10 dark:bg-[#64748B]/20 text-[#64748B] dark:text-[#94A9BA] flex items-center justify-center shrink-0">
            <Coffee className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* 3. Detail Jadwal Table */}
      <div className="space-y-2">
        <div className="text-xs font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider flex items-center gap-1">
          Detail Jadwal <ArrowRight className="h-3 w-3 text-[#0077C8] dark:text-[#38A9EA]" />
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.10)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F9FC] dark:bg-[#0A2035] border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.10)] text-[10px] font-black uppercase text-[#64748B] dark:text-[#BFD2E2] tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-2.5">Waktu</th>
                <th scope="col" className="px-4 py-2.5">Shift</th>
                <th scope="col" className="px-4 py-2.5 text-center">Jumlah Operator</th>
                <th scope="col" className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[rgba(120,190,235,0.10)] text-[11.5px] bg-white dark:bg-[#0D263E]">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F4F9FC] dark:hover:bg-[#12314D] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#123D70] dark:text-[#AFC4D5]">
                    {row.waktu}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#0B3568] dark:text-[#EDF6FC]">
                    {row.shift}
                  </td>
                  <td className="px-4 py-3 text-center font-black text-[#0B3568] dark:text-[#F5FAFF]">
                    {row.jumlahOperator}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22A65A]/15 dark:bg-[rgba(105,190,40,0.12)] border border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] text-[#22A65A] dark:text-[#69BE28] text-[10px] font-extrabold">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28] shadow-[0_0_6px_#69BE28]" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
