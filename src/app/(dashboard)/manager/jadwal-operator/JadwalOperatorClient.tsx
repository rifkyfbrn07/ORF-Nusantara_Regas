'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays, ShieldCheck } from 'lucide-react';
import type { RosterMonthData, RosterShiftKey } from '@/server/services/rosterService';
import { RosterMatrix } from '@/components/roster/RosterMatrix';
import { RosterCalendarView } from '@/components/roster/RosterCalendarView';

interface JadwalOperatorClientProps {
  data: RosterMonthData;
  monthNames: string[];
  showContacts: boolean;
}

const STATUS_CHIP_STYLES: Record<string, string> = {
  HADIR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TERLAMBAT: 'bg-amber-50 text-amber-700 border-amber-200',
  'BELUM ABSEN': 'bg-sky-50 text-sky-700 border-sky-200',
  ABSENT: 'bg-red-50 text-red-700 border-red-200',
  CUTI: 'bg-violet-50 text-violet-700 border-violet-200',
  SAKIT: 'bg-rose-50 text-rose-700 border-rose-200',
  IZIN: 'bg-orange-50 text-orange-700 border-orange-200',
  OFF: 'bg-slate-50 text-slate-500 border-slate-200',
};

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function JadwalOperatorClient({ data, monthNames, showContacts }: JadwalOperatorClientProps) {
  const router = useRouter();
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState<RosterShiftKey | 'all'>('all');
  const [view, setView] = useState<'matrix' | 'calendar'>('matrix');

  const filteredOperators = useMemo(() => {
    return data.operators.filter((op) => {
      if (operatorFilter !== 'all' && op.id !== operatorFilter) return false;
      if (shiftFilter !== 'all') {
        const hasShift = op.days.some((d) => d.shiftKey === shiftFilter);
        if (!hasShift) return false;
      }
      return true;
    });
  }, [data.operators, operatorFilter, shiftFilter]);

  function navigate(target: { year: number; month: number }) {
    router.push(`/manager/jadwal-operator?year=${target.year}&month=${target.month}`);
  }

  const coverageMax = Math.max(1, ...data.coverage.map((c) => Math.max(c.pagi, c.malam)));

  return (
    <div className="space-y-5">
      {/* ===== HEADER ROSTER + NAVIGASI BULAN ===== */}
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0F315A] flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
                Jadwal Operator
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#092B57] tracking-tight leading-tight">
                {monthNames[data.month - 1]} {data.year}
              </div>
              <div className="text-[10.5px] font-semibold text-slate-400">
                ORF Muara Karang · {data.operators.length} operator · {data.daysInMonth} hari
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="field text-xs min-w-0 flex-1 sm:flex-none"
              value={`${data.year}-${data.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                navigate({ year: y, month: m });
              }}
              aria-label="Pilih Bulan"
            >
              {data.availableMonths.map((m) => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {monthNames[m.month - 1]} {m.year}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg border border-[#CBD7E6] overflow-hidden shrink-0">
              <button
                onClick={() => navigate(prevMonth(data.year, data.month))}
                className="p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
                aria-label="Bulan Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  navigate({ year: now.getFullYear(), month: now.getMonth() + 1 });
                }}
                className="px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-x border-[#CBD7E6] cursor-pointer whitespace-nowrap"
              >
                Bulan Ini
              </button>
              <button
                onClick={() => navigate(nextMonth(data.year, data.month))}
                className="p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
                aria-label="Bulan Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters: operator & shift */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[#EDF2F7]">
          <select
            className="field text-xs"
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            aria-label="Filter Operator"
          >
            <option value="all">Semua Operator ({data.operators.length})</option>
            {data.operators.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
          <select
            className="field text-xs"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value as RosterShiftKey | 'all')}
            aria-label="Filter Shift"
          >
            <option value="all">Semua Shift</option>
            <option value="PAGI">PAGI (07.00 - 19.00)</option>
            <option value="MALAM">MALAM (19.00 - 07.00)</option>
            <option value="OFF">OFF (Libur)</option>
          </select>
          <div className="flex rounded-lg border border-[#CBD7E6] overflow-hidden self-start">
            <button
              onClick={() => setView('matrix')}
              className={`flex-1 px-3 py-2 text-[11px] font-bold transition cursor-pointer ${view === 'matrix' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Matrix
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex-1 px-3 py-2 text-[11px] font-bold transition cursor-pointer border-l border-[#CBD7E6] ${view === 'calendar' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Kalender
            </button>
          </div>
        </div>
      </div>

      {/* ===== MANPOWER COVERAGE (HARI INI) ===== */}
      {data.todaySummary ? (
        <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black tracking-wider uppercase text-slate-400">
              Manpower Coverage — Hari Ini ({data.todaySummary.date})
            </div>
            <span className="text-[9.5px] font-bold text-slate-300">Work Status Engine</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'HADIR', value: data.todaySummary.hadir },
              { label: 'TERLAMBAT', value: data.todaySummary.terlambat },
              { label: 'BELUM ABSEN', value: data.todaySummary.belumAbsen },
              { label: 'CUTI', value: data.todaySummary.cuti },
              { label: 'SAKIT', value: data.todaySummary.sakit },
              { label: 'IZIN', value: data.todaySummary.izin },
              { label: 'OFF', value: data.todaySummary.off },
              { label: 'TANPA KABAR', value: data.todaySummary.absent },
            ].map((chip) => (
              <span
                key={chip.label}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${STATUS_CHIP_STYLES[chip.label]}`}
              >
                {chip.label}
                <span className="tabular-nums">{chip.value}</span>
              </span>
            ))}
          </div>
          {data.shiftRequirements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {data.shiftRequirements.map((req) => {
                const cov = data.coverage.find((c) => c.isToday);
                const assigned = cov
                  ? req.key === 'PAGI' ? cov.pagi : req.key === 'MALAM' ? cov.malam : cov.off
                  : 0;
                const pct = req.requiredCount > 0 ? Math.min(100, Math.round((assigned / req.requiredCount) * 100)) : 100;
                const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-[#F58220]' : 'bg-red-400';
                return (
                  <div key={req.key} className="rounded-lg border border-[#EDF2F7] bg-[#FBFDFE] px-3 py-2">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                      <span>{req.label} ({req.startTime}–{req.endTime})</span>
                      <span className="tabular-nums">{assigned}/{req.requiredCount}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                      <div className={`h-full rounded-full bar-grow ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* ===== KEBUTUHAN MANPOWER HARIAN ===== */}
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4">
        <div className="text-[10px] font-black tracking-wider uppercase text-slate-400 mb-3">
          Kebutuhan Manpower Harian (Pg / Mlm / Off)
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1 min-w-max">
            {data.coverage.map((c) => (
              <div
                key={c.date}
                className={`w-9 shrink-0 rounded-lg border text-center py-1.5 ${
                  c.isToday ? 'border-[#F59E0B] bg-[#FEF3C7]' : c.isHoliday ? 'border-red-200 bg-red-50' : 'border-[#EDF2F7] bg-[#FBFDFE]'
                }`}
                title={`${c.date} — Pg: ${c.pagi}, Mlm: ${c.malam}, Off: ${c.off}`}
              >
                <div className="text-[9px] font-black text-[#0B3568] leading-none">{c.day}</div>
                <div className="text-[7.5px] font-semibold text-slate-400 leading-none mt-0.5">{c.weekday}</div>
                <div className="mt-1 space-y-0.5">
                  <MiniBar value={c.pagi} max={coverageMax} color="bg-[#0066B3]" />
                  <MiniBar value={c.malam} max={coverageMax} color="bg-[#0F315A]" />
                  <MiniBar value={c.off} max={coverageMax} color="bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== MATRIX / KALENDER ROSTER ===== */}
      {view === 'matrix' ? (
        <RosterMatrix
          operators={filteredOperators}
          daysInMonth={data.daysInMonth}
          showContacts={showContacts}
        />
      ) : (
        <RosterCalendarView
          operators={filteredOperators}
          year={data.year}
          month={data.month}
          daysInMonth={data.daysInMonth}
          focusOperatorId={operatorFilter !== 'all' ? operatorFilter : null}
        />
      )}

      {/* ===== LEGEND ===== */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        <LegendItem boxClass="bg-[#EAF4FC] border-[#BBDFF5] text-[#0066B3]" label="Pg = 07.00 - 19.00" />
        <LegendItem boxClass="bg-[#0F315A] border-[#0F315A] text-white" label="Mlm = 19.00 - 07.00" />
        <LegendItem boxClass="bg-white border-[#E2E8F0] text-slate-400" label="Off = Libur" />
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <ShieldCheck className="h-3 w-3 text-[#F58220]" /> * = HSSE Marshall
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="h-2.5 w-2.5 rounded border border-red-300 bg-red-50" /> Hari libur nasional
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="h-2.5 w-2.5 rounded border border-[#F59E0B] bg-[#FEF3C7]" /> Hari ini
        </span>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%` }}
      />
    </div>
  );
}

function LegendItem({ boxClass, label }: { boxClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[9.5px] font-semibold text-slate-500">
      <span className={`inline-flex items-center justify-center w-7 h-5 rounded-md border text-[8.5px] font-black ${boxClass}`}>
        {label.split(' ')[0]}
      </span>
      {label}
    </span>
  );
}
