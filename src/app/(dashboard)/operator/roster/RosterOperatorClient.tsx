'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RosterMatrix } from '@/components/roster/RosterMatrix';
import type { RosterOperatorRow, RosterDayCoverage } from '@/server/services/rosterService';

interface RosterOperatorClientProps {
  year: number;
  month: number;
  monthLabel: string;
  operators: RosterOperatorRow[];
  daysInMonth: number;
  coverage: RosterDayCoverage[];
  availableMonths: { year: number; month: number }[];
  todaySummary: {
    date: string;
    hadir: number;
    terlambat: number;
    belumAbsen: number;
    absent: number;
    cuti: number;
    sakit: number;
    izin: number;
    off: number;
  } | null;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function RosterOperatorClient({
  year,
  month,
  monthLabel,
  operators,
  daysInMonth,
  todaySummary,
}: RosterOperatorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(y: number, m: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(y));
    params.set('month', String(m));
    router.push(`/operator/roster?${params.toString()}`);
  }

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="space-y-4">
      {/* Navigasi bulan */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(prev.year, prev.month)}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
          </button>
          <div className="min-w-[150px] rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-center text-sm font-black text-[#0B3568]">
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <button
            type="button"
            onClick={() => goTo(next.year, next.month)}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
          >
            Berikutnya <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-[#0072CE]" /> Pagi</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-[#123B6D]" /> Malam</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-[#DC2626]" /> OFF</span>
        </div>
      </div>

      {todaySummary && (
        <div className="rounded-xl border border-[#DCE5EF] bg-white p-3 text-[10px] font-semibold text-slate-500">
          Hari ini ({todaySummary.date}): {todaySummary.hadir} hadir · {todaySummary.belumAbsen} belum absen · {todaySummary.cuti} cuti · {todaySummary.sakit} sakit · {todaySummary.izin} izin · {todaySummary.off} off
        </div>
      )}

      {/* Matrix roster (read-only) — desktop */}
      <div className="hidden lg:block">
        <RosterMatrix operators={operators} daysInMonth={daysInMonth} showContacts={false} emptyLabel="Tidak ada data roster untuk bulan ini." />
      </div>

      {/* Mobile / tablet: kartu per operator */}
      <div className="space-y-3 lg:hidden">
        {operators.length === 0 && (
          <div className="rounded-xl border border-[#DCE5EF] bg-white px-6 py-10 text-center text-xs font-bold text-slate-400">
            Tidak ada data roster untuk bulan ini.
          </div>
        )}
        {operators.map((op) => (
          <div key={op.id} className="rounded-xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#0B3568]">{op.name}</div>
                <div className="text-[10px] font-semibold text-slate-500">
                  {op.employeeId} · {op.positionSuffix ?? op.position}
                  {op.hsseMarshall ? ' · HSSE Marshall' : ''}
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-slate-500">
                <div>P {op.counts.pagi}</div>
                <div>M {op.counts.malam}</div>
                <div className="text-[#DC2626]">O {op.counts.off}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {op.days.map((d) => (
                <span
                  key={d.date}
                  title={`${d.day} — ${d.shiftName ?? d.status}`}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[10px] font-bold ${
                    d.shiftKey === 'PAGI'
                      ? 'border-[#0072CE]/40 bg-[#0072CE]/10 text-[#0072CE]'
                      : d.shiftKey === 'MALAM'
                      ? 'border-[#123B6D]/40 bg-[#123B6D]/10 text-[#123B6D]'
                      : d.shiftKey === 'OFF'
                      ? 'border-[#DC2626]/40 bg-[#DC2626]/10 text-[#DC2626]'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {d.shiftKey === 'PAGI' ? 'P' : d.shiftKey === 'MALAM' ? 'M' : d.shiftKey === 'OFF' ? 'O' : d.day}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-semibold text-slate-400">
        {operators.length} operator · {monthLabel}. Data roster berasal dari jadwal resmi. Operator dapat melihat roster operator lain (read-only) — tidak dapat mengubah jadwal.
      </div>
    </div>
  );
}

