'use client';

import React, { useMemo } from 'react';
import type { RosterOperatorRow } from '@/server/services/rosterService';

/**
 * RosterCalendarView — tampilan kalender bulanan (Sen s.d. Min).
 * - mode personal : satu operator per sel (chip shift besar).
 * - mode summary  : rekap per hari — jumlah & inisial operator per shift.
 * Color coding: Pagi = blue, Malam = navy, Off = gray.
 */

const WEEK_HEADER = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const SHIFT_CHIP: Record<string, string> = {
  PAGI: 'bg-[#EAF4FC] text-[#0066B3] border-[#BBDFF5]',
  MALAM: 'bg-[#0F315A] text-white border-[#0F315A]',
  OFF: 'bg-slate-100 text-slate-500 border-slate-200',
};

const SHIFT_LABEL: Record<string, string> = { PAGI: 'P', MALAM: 'M', OFF: 'O' };
const SHIFT_FULL: Record<string, string> = { PAGI: 'Pagi', MALAM: 'Malam', OFF: 'Off' };

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function RosterCalendarView({
  operators,
  year,
  month,
  daysInMonth,
  focusOperatorId,
}: {
  operators: RosterOperatorRow[];
  year: number;
  month: number;
  daysInMonth: number;
  focusOperatorId?: string | null;
}) {
  const personal = Boolean(focusOperatorId) || operators.length === 1;
  const focus = focusOperatorId
    ? operators.find((o) => o.id === focusOperatorId)
    : operators.length === 1
      ? operators[0]
      : undefined;

  const firstWeekday = useMemo(() => {
    const d = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`).getUTCDay();
    return (d + 6) % 7; // Sen=0
  }, [year, month]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  const cells = useMemo(() => {
    const list: {
      day: number;
      isToday: boolean;
      personalShift?: string | null;
      counts?: { pagi: number; malam: number; off: number };
      initials?: { pagi: string[]; malam: string[] };
    }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const base = { day: d, isToday: date === today };
      if (personal && focus) {
        const cell = focus.days.find((x) => x.day === d);
        list.push({ ...base, personalShift: cell ? cell.shiftKey : null });
      } else {
        let pagi = 0, malam = 0, off = 0;
        const iniPagi: string[] = [], iniMalam: string[] = [];
        for (const op of operators) {
          const cell = op.days.find((x) => x.day === d);
          if (!cell) continue;
          if (cell.shiftKey === 'PAGI') { pagi += 1; if (iniPagi.length < 4) iniPagi.push(initials(op.name)); }
          else if (cell.shiftKey === 'MALAM') { malam += 1; if (iniMalam.length < 4) iniMalam.push(initials(op.name)); }
          else if (cell.shiftKey === 'OFF') off += 1;
        }
        list.push({ ...base, counts: { pagi, malam, off }, initials: { pagi: iniPagi, malam: iniMalam } });
      }
    }
    return list;
  }, [personal, focus, operators, daysInMonth, year, month, today]);

  return (
    <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
        {WEEK_HEADER.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[10px] font-black uppercase tracking-wide ${i >= 5 ? 'text-slate-400' : 'text-[#0B3568]'}`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[54px] sm:min-h-[64px] rounded-lg bg-slate-50/50" />
        ))}
        {cells.map((cell) => (
          <div
            key={cell.day}
            className={`min-h-[54px] sm:min-h-[64px] rounded-lg border p-1 sm:p-1.5 flex flex-col ${
              cell.isToday ? 'border-[#F59E0B] bg-[#FFFBEB]' : 'border-[#EDF2F7] bg-white'
            }`}
          >
            <span className={`text-[10.5px] sm:text-[11px] font-black ${cell.isToday ? 'text-amber-700' : 'text-[#0B3568]'}`}>
              {cell.day}
            </span>

            {personal ? (
              <div className="flex-1 flex items-center justify-center">
                {cell.personalShift ? (
                  <span
                    className={`inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-md border text-[9.5px] sm:text-[10.5px] font-black ${SHIFT_CHIP[cell.personalShift]}`}
                    title={`${SHIFT_FULL[cell.personalShift]} — ${cell.day}/${month}/${year}`}
                  >
                    {SHIFT_LABEL[cell.personalShift]}
                  </span>
                ) : (
                  <span className="text-[9.5px] text-slate-300 font-bold">·</span>
                )}
              </div>
            ) : (
              <div className="flex-1 space-y-0.5 mt-0.5">
                {(cell.counts?.pagi ?? 0) > 0 && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0066B3] shrink-0" />
                    <span className="text-[8.5px] font-black text-[#0066B3] tabular-nums">{cell.counts?.pagi}</span>
                    <span className="text-[7.5px] text-slate-400 truncate hidden sm:inline">{cell.initials?.pagi.join(' ')}</span>
                  </div>
                )}
                {(cell.counts?.malam ?? 0) > 0 && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0F315A] shrink-0" />
                    <span className="text-[8.5px] font-black text-[#0F315A] tabular-nums">{cell.counts?.malam}</span>
                    <span className="text-[7.5px] text-slate-400 truncate hidden sm:inline">{cell.initials?.malam.join(' ')}</span>
                  </div>
                )}
                {(cell.counts?.off ?? 0) > 0 && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                    <span className="text-[8.5px] font-bold text-slate-400 tabular-nums">{cell.counts?.off} off</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 px-0.5">
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className={`inline-flex items-center justify-center w-5 h-4 rounded border text-[8px] font-black ${SHIFT_CHIP.PAGI}`}>P</span> Pagi (07.00-19.00)
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className={`inline-flex items-center justify-center w-5 h-4 rounded border text-[8px] font-black ${SHIFT_CHIP.MALAM}`}>M</span> Malam (19.00-07.00)
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className={`inline-flex items-center justify-center w-5 h-4 rounded border text-[8px] font-black ${SHIFT_CHIP.OFF}`}>O</span> Off (Libur)
        </span>
      </div>
    </div>
  );
}
