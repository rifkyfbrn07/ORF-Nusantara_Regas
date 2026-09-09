'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import type { RosterMonthData } from '@/server/services/rosterService';
import { RosterMatrix } from '@/components/roster/RosterMatrix';
import { RosterCalendarView } from '@/components/roster/RosterCalendarView';

interface JadwalSayaClientProps {
  data: RosterMonthData;
  operatorName: string;
  operatorPosition: string;
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function JadwalSayaClient({ data, operatorName, operatorPosition }: JadwalSayaClientProps) {
  const router = useRouter();
  const me = data.operators[0];
  const [view, setView] = React.useState<'calendar' | 'list'>('calendar');

  function navigate(target: { year: number; month: number }) {
    router.push(`/operator/jadwal-saya?year=${target.year}&month=${target.month}`);
  }

  const monthLabel = `${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][data.month - 1]} ${data.year}`;

  return (
    <div className="space-y-5 dashboard-enter">
      {/* Header bulan + navigasi */}
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
            Jadwal Saya — {operatorPosition}
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#092B57] tracking-tight leading-tight">
            {monthLabel}
          </div>
          <div className="text-[10.5px] font-semibold text-slate-400">
            {operatorName} · ORF Muara Karang
          </div>
        </div>
        <div className="flex rounded-lg border border-[#CBD7E6] overflow-hidden shrink-0 self-start">
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

      {/* Ringkasan pribadi */}
      {me ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Shift Pagi (Pg)" value={String(me.counts.pagi)} accent="border-l-[#0066B3]" sub="07.00 - 19.00" />
          <KpiCard label="Shift Malam (Mlm)" value={String(me.counts.malam)} accent="border-l-[#0F315A]" sub="19.00 - 07.00" />
          <KpiCard label="Off (Libur)" value={String(me.counts.off)} accent="border-l-[#DC2626]" sub="Hari libur" />
          <KpiCard
            label="Status Hari Ini"
            value={me.todayStatus ? me.todayStatus.statusLabel : '—'}
            accent={
              me.todayStatus?.status === 'HADIR' ? 'border-l-emerald-500'
              : me.todayStatus?.status === 'TERLAMBAT' ? 'border-l-amber-500'
              : me.todayStatus?.status === 'OFF' ? 'border-l-slate-400'
              : 'border-l-[#0066B3]'
            }
            sub={me.hsseMarshall ? 'HSSE Marshall' : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs px-6 py-10 text-center">
          <div className="text-xs font-bold text-slate-400">
            Belum ada jadwal untuk bulan {monthLabel}.
          </div>
        </div>
      )}

      {/* Jadwal bulanan (hanya milik sendiri) */}
      {me && (
        <>
          <div className="flex rounded-lg border border-[#CBD7E6] overflow-hidden w-fit">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${view === 'calendar' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Kalender Bulanan
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-[11px] font-bold transition cursor-pointer border-l border-[#CBD7E6] ${view === 'list' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              List Harian
            </button>
          </div>
          {view === 'calendar' ? (
            <RosterCalendarView
              operators={[me]}
              year={data.year}
              month={data.month}
              daysInMonth={data.daysInMonth}
              focusOperatorId={me.id}
            />
          ) : (
            <RosterMatrix operators={[me]} daysInMonth={data.daysInMonth} showContacts={false} />
          )}
        </>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border bg-[#EAF4FC] border-[#BBDFF5] text-[#0066B3] text-[8.5px] font-black">Pg</span>
          Pagi = 07.00 - 19.00
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border bg-[#0F315A] border-[#0F315A] text-white text-[8.5px] font-black">Mlm</span>
          Malam = 19.00 - 07.00
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border bg-red-50 border-red-200 text-[#DC2626] text-[8.5px] font-black">Off</span>
          Libur
        </span>
        {me?.hsseMarshall && (
          <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
            <ShieldCheck className="h-3 w-3 text-[#F58220]" /> Anda bertugas sebagai HSSE Marshall
          </span>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#DCE5EF] border-l-4 ${accent} px-4 py-3 shadow-xs`}>
      <div className="text-[9.5px] font-black tracking-wider uppercase text-slate-400">{label}</div>
      <div className="text-xl font-black text-[#092B57] tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[9px] font-semibold text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
