'use client';

import React from 'react';
import { ShieldCheck, Phone } from 'lucide-react';
import type { RosterOperatorRow, RosterDayCell } from '@/server/services/rosterService';

/**
 * Matrix roster operator — desktop: tabel matrix; mobile: kartu operator
 * (tabel TIDAK dikecilkan sampai tidak terbaca sesuai kebijakan responsive).
 */

function shiftCellClass(cell: RosterDayCell): string {
  if (cell.shiftKey === 'PAGI') return 'bg-[#EAF4FC] text-[#0066B3] border-[#BBDFF5]';
  if (cell.shiftKey === 'MALAM') return 'bg-[#0F315A] text-white border-[#0F315A]';
  if (cell.shiftKey === 'OFF') return 'bg-white text-slate-400 border-[#E2E8F0]';
  return 'bg-slate-50 text-slate-300 border-slate-100';
}

function shiftShortLabel(cell: RosterDayCell): string {
  if (cell.shiftKey === 'PAGI') return 'Pg';
  if (cell.shiftKey === 'MALAM') return 'Mlm';
  if (cell.shiftKey === 'OFF') return 'Off';
  return '—';
}

interface RosterMatrixProps {
  operators: RosterOperatorRow[];
  daysInMonth: number;
  showContacts: boolean;
  emptyLabel?: string;
}

export function RosterMatrix({ operators, daysInMonth, showContacts, emptyLabel }: RosterMatrixProps) {
  if (operators.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs px-6 py-10 text-center">
        <div className="text-xs font-bold text-slate-400">
          {emptyLabel || 'Tidak ada data roster untuk bulan ini.'}
        </div>
      </div>
    );
  }

  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <>
      {/* ============ DESKTOP: MATRIX TABLE ============ */}
      <div className="hidden lg:block bg-white rounded-xl border border-[#DCE5EF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[#EDF4FB] px-3 py-2.5 text-left border-b border-r border-[#DCE5EF] min-w-[230px]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Team</div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nama Operator</div>
                </th>
                {dayHeaders.map((d) => {
                  const cell = operators[0]?.days[d - 1];
                  return (
                    <th
                      key={d}
                      className={`px-0 py-1.5 text-center border-b border-[#DCE5EF] min-w-[34px] ${
                        cell?.isToday ? 'bg-[#FEF3C7]' : cell?.isHoliday ? 'bg-red-50' : 'bg-[#EDF4FB]'
                      }`}
                    >
                      <div className={`text-[10.5px] font-black leading-none ${cell?.isHoliday ? 'text-red-600' : 'text-[#0B3568]'}`}>
                        {d}
                      </div>
                      <div className="text-[8px] font-semibold text-slate-400 leading-none mt-0.5">
                        {cell?.weekday || ''}
                      </div>
                    </th>
                  );
                })}
                {showContacts && (
                  <th className="px-3 py-2.5 bg-[#EDF4FB] border-b border-[#DCE5EF] min-w-[110px]">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Contact</div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.id} className="group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8FBFE] px-3 py-2 border-b border-r border-[#EDF2F7]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-white bg-[#0B3568] rounded px-1 py-0.5 leading-none">
                        {op.team || '·'}
                      </span>
                      <span className="text-xs font-bold text-[#0B3568] truncate">{op.name}</span>
                      {op.hsseMarshall && (
                        <ShieldCheck className="h-3.5 w-3.5 text-[#F58220] shrink-0" aria-label="HSSE Marshall" />
                      )}
                    </div>
                    <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5">
                      {op.positionSuffix || op.position}
                      {op.todayStatus && (
                        <span className="ml-1.5 inline-block text-[8.5px] font-black text-[#0066B3]">
                          · {op.todayStatus.statusLabel}
                        </span>
                      )}
                    </div>
                  </td>
                  {dayHeaders.map((d) => {
                    const cell = op.days[d - 1];
                    return (
                      <td key={d} className="px-0 py-1 border-b border-[#EDF2F7] text-center">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-6 rounded-md border text-[9.5px] font-black ${shiftCellClass(cell)} ${
                              cell.isToday ? 'ring-2 ring-[#F59E0B] ring-offset-0' : ''
                            }`}
                            title={cell.isToday ? `${cell.date} (Hari ini)` : cell.date}
                          >
                            {shiftShortLabel(cell)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  {showContacts && (
                    <td className="px-3 py-2 border-b border-[#EDF2F7]">
                      {op.phone ? (
                        <span className="flex items-center gap-1 text-[10.5px] font-bold text-slate-600 tabular-nums whitespace-nowrap">
                          <Phone className="h-3 w-3 text-slate-300" /> {op.phone}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="lg:hidden space-y-3">
        {operators.map((op) => (
          <div key={op.id} className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EDF2F7] bg-[#FBFDFE] flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black text-white bg-[#0B3568] rounded px-1 py-0.5 leading-none">
                    TEAM {op.team || '·'}
                  </span>
                  {op.hsseMarshall && (
                    <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black text-[#C2410C] bg-orange-50 border border-orange-200 rounded px-1 py-0.5 leading-none">
                      <ShieldCheck className="h-2.5 w-2.5" /> HSSE MARSHALL
                    </span>
                  )}
                  {op.todayStatus && (
                    <span className="text-[8.5px] font-black text-[#0066B3] bg-[#EAF4FC] border border-[#BBDFF5] rounded px-1 py-0.5 leading-none">
                      HARI INI: {op.todayStatus.statusLabel}
                    </span>
                  )}
                </div>
                <div className="text-sm font-black text-[#092B57] mt-1 truncate">{op.name}</div>
                <div className="text-[10px] font-semibold text-slate-400">
                  {op.positionSuffix || op.position} · {op.employeeId}
                </div>
                {showContacts && op.phone && (
                  <div className="text-[10px] font-bold text-slate-500 tabular-nums mt-0.5 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-300" /> {op.phone}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[8.5px] font-black uppercase tracking-wide text-slate-400 leading-tight">
                  Pg <span className="text-[#0066B3]">{op.counts.pagi}</span>
                </div>
                <div className="text-[8.5px] font-black uppercase tracking-wide text-slate-400 leading-tight">
                  Mlm <span className="text-[#0F315A]">{op.counts.malam}</span>
                </div>
                <div className="text-[8.5px] font-black uppercase tracking-wide text-slate-400 leading-tight">
                  Off <span className="text-slate-500">{op.counts.off}</span>
                </div>
              </div>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {op.days.map((cell) => (
                <div
                  key={cell.date}
                  className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-1.5 ${
                    cell.isToday ? 'border-[#F59E0B] bg-[#FEF3C7]' : cell.isHoliday ? 'border-red-200 bg-red-50' : 'border-[#EDF2F7] bg-white'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                    {cell.day} {cell.weekday}
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${shiftCellClass(cell)}`}>
                    {shiftShortLabel(cell)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
