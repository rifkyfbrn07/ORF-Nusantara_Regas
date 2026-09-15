'use client';

import React from 'react';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { CATEGORY_LABELS, MONTH_SHORT, EmptyState } from './shared';

interface ProgramTimelineViewProps { programs: ProgramKerjaDTO[]; }
type MonthPeriod = { plan: number | null; realization: number | null };

/** Combine four Excel periods into one month without inventing a Plan. */
function monthAggregate(program: ProgramKerjaDTO): MonthPeriod[] {
  const months = Array.from({ length: 12 }, (): MonthPeriod => ({ plan: null, realization: null }));
  for (const entry of program.months) {
    const month = months[entry.month - 1];
    if (entry.target !== null) month.plan = month.plan === null ? entry.target : Math.max(month.plan, entry.target);
    if (entry.realization !== null) month.realization = month.realization === null ? entry.realization : Math.max(month.realization, entry.realization);
  }
  return months;
}

function MonthCell({ period }: { period: MonthPeriod }) {
  const { plan, realization } = period;
  if (plan === null && realization === null) return <div className="flex h-10 items-center justify-center text-[10px] font-bold text-slate-300">·</div>;
  const planWidth = Math.min(100, plan ?? 0);
  const realizationWidth = Math.min(100, realization ?? 0);
  const realizationColor = realization === 0 ? 'bg-red-400' : 'bg-emerald-500';
  const realizationText = realization === 0 ? 'text-red-600' : 'text-emerald-700';
  return (
    <div className="flex h-10 flex-col justify-center gap-1 px-1" title={`Plan (P): ${plan ?? '—'}% · Realisasi (R): ${realization ?? '—'}%`}>
      {plan !== null && <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-[#0088D8]" style={{ width: `${planWidth}%` }} /></div>}
      {realization !== null && <div className="flex flex-col gap-0.5"><div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100"><div className={`h-full rounded-full ${realizationColor}`} style={{ width: `${realizationWidth}%` }} /></div><span className={`text-center text-[8.5px] font-black leading-none tabular-nums ${realizationText}`}>{realization}</span></div>}
    </div>
  );
}

export function ProgramTimelineView({ programs }: ProgramTimelineViewProps) {
  return <>
    <div className="hidden overflow-hidden rounded-xl border border-[#DCE5EF] bg-white shadow-xs md:block">
      <div className="overflow-x-auto"><table className="w-full border-separate border-spacing-0 text-left"><thead><tr className="bg-[#EDF4FB] text-[9.5px] uppercase tracking-wider text-slate-500"><th className="sticky left-0 z-10 min-w-[260px] border-b border-[#DCE5EF] bg-[#EDF4FB] px-3 py-2.5 text-left font-black">Program Kerja</th>{MONTH_SHORT.map((month) => <th key={month} className="min-w-[52px] border-b border-[#DCE5EF] px-1 py-2.5 text-center font-black">{month}</th>)}</tr></thead><tbody className="divide-y divide-[#EDF2F7]">
        {programs.map((program) => { const months = monthAggregate(program); return <tr key={program.id} className="hover:bg-[#F8FBFE]"><td className="sticky left-0 z-10 border-r border-[#EDF2F7] bg-white px-3 py-2"><div className="text-[9.5px] font-black uppercase tracking-wider text-[#1769AA]">{program.sequence} · {CATEGORY_LABELS[program.category]}</div><div className="text-[11px] font-bold leading-snug text-[#0B3568]">{program.name}</div></td>{months.map((period, index) => <td key={index} className="px-1 py-1"><MonthCell period={period} /></td>)}</tr>; })}
      </tbody></table></div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#EDF2F7] bg-[#FBFDFE] px-4 py-2.5"><LegendDot color="bg-[#0088D8]" label="Plan (P) — sel biru Excel" /><LegendDot color="bg-emerald-500" label="Realisasi (R) — muncul di bawah Plan" /><LegendDot color="bg-red-400" label="R = 0 (belum terealisasi)" /><LegendDot color="bg-slate-200" label="Tidak ada data pada Excel" /></div>
      {programs.length === 0 && <EmptyState />}
    </div>
    <div className="space-y-3 md:hidden">{programs.map((program) => { const months = monthAggregate(program); return <div key={program.id} className="space-y-3 rounded-xl border border-[#DCE5EF] bg-white p-4 shadow-xs"><div><div className="text-[9.5px] font-black uppercase tracking-wider text-[#1769AA]">{program.sequence} · {CATEGORY_LABELS[program.category]}</div><div className="mt-0.5 text-xs font-bold leading-snug text-[#0B3568]">{program.name}</div></div><div className="grid grid-cols-4 gap-1.5">{months.map((period, index) => <div key={index} className="rounded-lg border border-[#EDF2F7] bg-[#FBFDFE] px-2 py-1.5"><div className="text-[8.5px] font-black uppercase tracking-wide text-slate-400">{MONTH_SHORT[index]}</div>{period.plan === null && period.realization === null ? <div className="text-[10px] font-bold text-slate-300">—</div> : <MonthCell period={period} />}</div>)}</div><div className="flex items-center justify-between text-[10px] text-slate-500"><span className="font-semibold">P = biru</span><span className="font-semibold">R = hijau</span></div></div>; })}{programs.length === 0 && <div className="rounded-xl border border-[#DCE5EF] bg-white p-4"><EmptyState /></div>}</div>
  </>;
}

function LegendDot({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-1.5 text-[9.5px] font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>; }
