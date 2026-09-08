'use client';

import React from 'react';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { CATEGORY_LABELS, MONTH_SHORT, EmptyState } from './shared';

interface ProgramTimelineViewProps {
  programs: ProgramKerjaDTO[];
}

/** Agregat realisasi per bulan (maksimum antar minggu) sesuai sel R dokumen. */
function monthAggregate(program: ProgramKerjaDTO): (number | null)[] {
  const agg: (number | null)[] = Array(12).fill(null);
  for (const m of program.months) {
    agg[m.month - 1] =
      agg[m.month - 1] === null ? m.realization : Math.max(agg[m.month - 1]!, m.realization);
  }
  return agg;
}

function MonthCell({ value, target }: { value: number | null; target: number }) {
  if (value === null) {
    return (
      <div className="h-7 flex items-center justify-center text-slate-300 text-[10px] font-bold" title="Belum ada realisasi tercatat">
        ·
      </div>
    );
  }
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const barColor = value >= 100 ? 'bg-emerald-500' : value > 0 ? 'bg-[#F58220]' : 'bg-red-400';
  const textColor = value >= 100 ? 'text-emerald-700' : value > 0 ? 'text-amber-700' : 'text-red-600';
  return (
    <div className="h-7 flex flex-col justify-center px-1" title={`R = ${value}% dari target ${target}%`}>
      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full bar-grow ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[8.5px] font-black tabular-nums text-center leading-none mt-0.5 ${textColor}`}>
        {value}
      </span>
    </div>
  );
}

export function ProgramTimelineView({ programs }: ProgramTimelineViewProps) {
  return (
    <>
      {/* Desktop: matrix Jan -> Des */}
      <div className="hidden md:block bg-white rounded-xl border border-[#DCE5EF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-wider text-slate-500 bg-[#EDF4FB]">
                <th className="px-3 py-2.5 font-black sticky left-0 bg-[#EDF4FB] z-10 min-w-[260px] text-left border-b border-[#DCE5EF]">
                  Program Kerja
                </th>
                {MONTH_SHORT.map((m) => (
                  <th key={m} className="px-1 py-2.5 font-black text-center border-b border-[#DCE5EF] min-w-[52px]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF2F7]">
              {programs.map((p) => {
                const agg = monthAggregate(p);
                return (
                  <tr key={p.id} className="hover:bg-[#F8FBFE]">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-[#EDF2F7]">
                      <div className="text-[9.5px] font-black tracking-wider uppercase text-[#1769AA]">
                        {p.sequence} · {CATEGORY_LABELS[p.category]}
                      </div>
                      <div className="text-[11px] font-bold text-[#0B3568] leading-snug">{p.name}</div>
                    </td>
                    {agg.map((v, i) => (
                      <td key={i} className="px-1 py-1.5">
                        <MonthCell value={v} target={p.planTarget} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-[#EDF2F7] bg-[#FBFDFE] flex flex-wrap items-center gap-x-4 gap-y-1">
          <LegendDot color="bg-emerald-500" label="R = 100 (Terealisasi)" />
          <LegendDot color="bg-[#F58220]" label="R parsial (On Progress)" />
          <LegendDot color="bg-red-400" label="R = 0 (Belum Terealisasi)" />
          <LegendDot color="bg-slate-200" label="· Tidak ada realisasi tercatat" />
          <span className="text-[9.5px] font-semibold text-slate-400 ml-auto">P = Plan · R = Realisasi</span>
        </div>
        {programs.length === 0 && <EmptyState />}
      </div>

      {/* Mobile: kartu per program dengan grid 12 bulan */}
      <div className="md:hidden space-y-3">
        {programs.map((p) => {
          const agg = monthAggregate(p);
          return (
            <div key={p.id} className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 space-y-3">
              <div>
                <div className="text-[9.5px] font-black tracking-wider uppercase text-[#1769AA]">
                  {p.sequence} · {CATEGORY_LABELS[p.category]}
                </div>
                <div className="text-xs font-bold text-[#0B3568] leading-snug mt-0.5">{p.name}</div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {agg.map((v, i) => (
                  <div key={i} className="rounded-lg border border-[#EDF2F7] bg-[#FBFDFE] px-2 py-1.5">
                    <div className="text-[8.5px] font-black uppercase tracking-wide text-slate-400">
                      {MONTH_SHORT[i]}
                    </div>
                    {v === null ? (
                      <div className="text-[10px] font-bold text-slate-300">—</div>
                    ) : (
                      <div
                        className={`text-[11px] font-black tabular-nums ${
                          v >= 100 ? 'text-emerald-700' : v > 0 ? 'text-amber-700' : 'text-red-600'
                        }`}
                      >
                        {v}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-semibold">Target (P): {p.planTarget}%</span>
                <span className="font-semibold">Realisasi (R): {p.progress}%</span>
              </div>
            </div>
          );
        })}
        {programs.length === 0 && (
          <div className="bg-white rounded-xl border border-[#DCE5EF] p-4"><EmptyState /></div>
        )}
      </div>
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[9.5px] font-semibold text-slate-500">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
