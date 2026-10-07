'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { RosterDayCell, RosterMonthData, RosterShiftKey } from '@/server/services/rosterService';
import { RosterMatrix } from '@/components/roster/RosterMatrix';

interface RosterOperatorClientProps {
  data: RosterMonthData;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const SHIFT_FILTERS: { value: RosterShiftKey | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Semua Shift' },
  { value: 'PAGI', label: 'Pagi' },
  { value: 'MALAM', label: 'Malam' },
  { value: 'OFF', label: 'Libur (Off)' },
];

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** Info satu hari untuk tampilan roster — label status selalu berupa teks. */
function dayInfo(cell: RosterDayCell): { label: string; cls: string; jam: string | null } {
  if (cell.shiftKey === 'PAGI') {
    return {
      label: 'Shift Pagi',
      cls: 'bg-[#EAF4FC] text-[#0066B3] border-[#BBDFF5]',
      jam: cell.startTime && cell.endTime ? `${cell.startTime} - ${cell.endTime}` : null,
    };
  }
  if (cell.shiftKey === 'MALAM') {
    return {
      label: 'Shift Malam',
      cls: 'bg-[#0F315A] text-white border-[#0F315A]',
      jam: cell.startTime && cell.endTime ? `${cell.startTime} - ${cell.endTime}` : null,
    };
  }
  if (cell.shiftKey === 'OFF') {
    return { label: 'Libur', cls: 'bg-red-50 text-[#DC2626] border-red-200', jam: null };
  }
  if (cell.shiftCode === null) {
    return { label: 'Belum dijadwalkan', cls: 'bg-slate-50 text-slate-400 border-slate-200', jam: null };
  }
  return { label: cell.shiftName ?? 'Jadwal lain', cls: 'bg-slate-50 text-slate-500 border-slate-200', jam: null };
}

export function RosterOperatorClient({ data }: RosterOperatorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState<RosterShiftKey | 'ALL'>('ALL');

  const today = new Date();

  function goTo(year: number, month: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(year));
    params.set('month', String(month));
    router.push(`/operator/roster?${params.toString()}`);
  }
  function goToday() {
    goTo(today.getFullYear(), today.getMonth() + 1);
  }

  // Filter client-side (nama/employeeId, operator, shift) terhadap dataset yang sama.
  const visibleOperators = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.operators.filter((op) => {
      if (operatorFilter !== 'all' && op.id !== operatorFilter) return false;
      if (q && !op.name.toLowerCase().includes(q) && !String(op.employeeId).toLowerCase().includes(q)) return false;
      if (shiftFilter !== 'ALL' && !op.days.some((d) => d.shiftKey === shiftFilter)) return false;
      return true;
    });
  }, [data.operators, operatorFilter, shiftFilter, query]);

  const monthLabel = `${MONTH_NAMES[data.month - 1]} ${data.year}`;

  return (
    <div className="space-y-4">
      {/* ===== Navigasi bulan + filter ===== */}
      <div className="rounded-xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { const p = prevMonth(data.year, data.month); goTo(p.year, p.month); }}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-[#CBD7E6] bg-[#F4F9FC] px-3 py-2">
              <CalendarRange className="h-4 w-4 text-[#0066B3]" />
              <span className="text-sm font-black text-[#0B3568]">{monthLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => { const n = nextMonth(data.year, data.month); goTo(n.year, n.month); }}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            >
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="cursor-pointer rounded-lg bg-[#123B6D] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#0F315A]"
            >
              Hari ini
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block w-full sm:w-56">
              <span className="sr-only">Cari operator</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari operator..."
                aria-label="Cari operator"
                className="field w-full pl-9 text-xs"
              />
            </label>
            <select
              value={operatorFilter}
              onChange={(event) => setOperatorFilter(event.target.value)}
              aria-label="Filter Operator"
              className="field text-xs text-slate-700"
            >
              <option value="all">Semua Operator</option>
              {data.operators.map((op) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
            <select
              value={shiftFilter}
              onChange={(event) => setShiftFilter(event.target.value as RosterShiftKey | 'ALL')}
              aria-label="Filter Shift"
              className="field text-xs text-slate-700"
            >
              {SHIFT_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-semibold text-slate-500">
          <span><b className="text-[#0B3568]">{visibleOperators.length}</b> dari {data.operators.length} operator</span>
          {data.todaySummary && (
            <span>Hari ini ({data.todaySummary.date}): {data.todaySummary.hadir} hadir · {data.todaySummary.belumAbsen} belum absen · {data.todaySummary.cuti} cuti · {data.todaySummary.sakit} sakit · {data.todaySummary.izin} izin · {data.todaySummary.off} off</span>
          )}
        </div>
      </div>

      {/* ===== Matriks roster — desktop (tabel pembanding seluruh operator) ===== */}
      <div className="hidden lg:block">
        <RosterMatrix
          operators={visibleOperators}
          daysInMonth={data.daysInMonth}
          showContacts={false}
          emptyLabel="Tidak ada operator yang cocok dengan filter."
        />
      </div>

      {/* ===== Mobile / tablet: kartu per operator dengan detail shift ===== */}
      <div className="space-y-3 lg:hidden">
        {visibleOperators.length === 0 && (
          <div className="rounded-xl border border-[#DCE5EF] bg-white px-6 py-10 text-center text-xs font-bold text-slate-400">
            Tidak ada operator yang cocok dengan filter.
          </div>
        )}
        {visibleOperators.map((op) => (
          <OperatorMobileCard
            key={op.id}
            op={op}
            month={data.month}
            showTodayDot={String(today.getFullYear()) === String(data.year) && today.getMonth() + 1 === data.month}
          />
        ))}
      </div>

      {/* ===== Legend ===== */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        <LegendItem boxClass="bg-[#EAF4FC] border-[#BBDFF5] text-[#0066B3]" label="Shift Pagi (07.00 - 19.00)" />
        <LegendItem boxClass="bg-[#0F315A] border-[#0F315A] text-white" label="Shift Malam (19.00 - 07.00)" />
        <LegendItem boxClass="bg-red-50 text-[#DC2626] border-red-200" label="Libur (Off)" />
        <LegendItem boxClass="bg-white text-slate-400 border-dashed border-slate-300" label="Belum dijadwalkan" />
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="h-2.5 w-2.5 rounded border border-[#F59E0B] bg-[#FEF3C7]" /> Hari ini
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="h-2.5 w-2.5 rounded border border-red-300 bg-red-50" /> Sabtu/Minggu/tanggal merah (indikator tanggal)
        </span>
      </div>

      <div className="text-[10px] font-semibold text-slate-400">
        Roster seluruh operator ({data.operators.length} operator aktif) · read-only. Status harian menggunakan engine work-status yang sama dengan seluruh aplikasi.
      </div>
    </div>
  );
}

function OperatorMobileCard({ op, month, showTodayDot }: { op: RosterMonthData['operators'][number]; month: number; showTodayDot: boolean }) {
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE5EF] bg-white shadow-xs">
      <div className="flex items-start justify-between gap-2 border-b border-[#EDF2F7] bg-[#FBFDFE] px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[#092B57]">{op.name}</div>
          <div className="text-[10px] font-semibold text-slate-400">
            {op.positionSuffix || op.position} · {op.employeeId}
            {op.hsseMarshall ? ' · HSSE Marshall' : ''}
          </div>
          {op.todayStatus && showTodayDot && (
            <span className="mt-1 inline-flex rounded-full border border-[#BBDFF5] bg-[#EAF4FC] px-2 py-0.5 text-[9px] font-black text-[#0066B3]">
              HARI INI: {op.todayStatus.statusLabel}
            </span>
          )}
        </div>
        <div className="shrink-0 text-right text-[9px] font-black leading-tight text-slate-500">
          <div className="text-[#0066B3]">Pg {op.counts.pagi}</div>
          <div className="text-[#0F315A]">Mlm {op.counts.malam}</div>
          <div className="text-[#DC2626]">Off {op.counts.off}</div>
        </div>
      </div>
      <div className="max-h-80 space-y-1 overflow-y-auto scrollbar-thin p-3">
        {op.days.map((cell) => {
          const info = dayInfo(cell);
          return (
            <div
              key={cell.date}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${
                cell.isToday ? 'border-[#F59E0B] bg-[#FEF3C7]' : cell.isHoliday ? 'border-red-200 bg-red-50' : 'border-[#EDF2F7] bg-white'
              }`}
            >
              <div className="text-[10.5px] font-bold text-slate-600">
                {cell.day} {cell.weekday} <span className="text-slate-300">{monthsShort[month - 1]}</span>
                {cell.isToday && <span className="ml-1 font-black text-[#B45309]">· Hari ini</span>}
              </div>
              <div className="flex items-center gap-2">
                {info.jam && <span className="font-mono text-[9.5px] font-semibold text-slate-400">{info.jam}</span>}
                <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-black ${info.cls}`}>
                  {info.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendItem({ boxClass, label }: { boxClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[9.5px] font-semibold text-slate-500">
      <span className={`inline-flex h-5 w-7 items-center justify-center rounded-md border text-[8.5px] font-black ${boxClass}`}>
        {label.split(' ')[0]}
      </span>
      {label}
    </span>
  );
}