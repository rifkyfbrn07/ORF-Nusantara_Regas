'use client';

import React from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import {
  CATEGORY_LABELS,
  ProgressCell,
  StatusBadge,
  EmptyState,
} from './shared';

interface ProgramListViewProps {
  programs: ProgramKerjaDTO[];
  deletingId: string | null;
  onEdit: (p: ProgramKerjaDTO) => void;
  onDelete: (p: ProgramKerjaDTO) => void;
}

export function ProgramListView({ programs, deletingId, onEdit, onDelete }: ProgramListViewProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#DCE5EF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 bg-[#EDF4FB]">
                <th className="px-3 py-3 font-black w-10">No</th>
                <th className="px-3 py-3 font-black">Program Kerja</th>
                <th className="px-3 py-3 font-black w-44">Kategori</th>
                <th className="px-3 py-3 font-black w-32">Plan (P)</th>
                <th className="px-3 py-3 font-black w-32">Realisasi (R)</th>
                <th className="px-3 py-3 font-black w-36">Progress</th>
                <th className="px-3 py-3 font-black w-44">Status</th>
                <th className="px-3 py-3 font-black">Keterangan</th>
                <th className="px-3 py-3 font-black w-20 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF2F7]">
              {programs.map((p) => (
                <tr key={p.id} className="align-top hover:bg-[#F8FBFE]">
                  <td className="px-3 py-3 text-xs font-black text-slate-400 tabular-nums">{p.sequence}</td>
                  <td className="px-3 py-3 text-xs font-bold text-[#0B3568] max-w-[280px]">{p.name}</td>
                  <td className="px-3 py-3 text-[11px] font-semibold text-slate-500">{CATEGORY_LABELS[p.category]}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">
                    <div className="font-bold text-[#0B3568]">{p.planTarget}%</div>
                    {p.plan && <div className="text-[10px] text-slate-400 mt-0.5">{p.plan}</div>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">
                    <div className="font-bold text-[#0B3568]">{p.progress}%</div>
                    {p.realization && <div className="text-[10px] text-slate-400 mt-0.5">{p.realization}</div>}
                  </td>
                  <td className="px-3 py-3"><ProgressCell value={p.progress} target={p.planTarget} /></td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-3 text-[11px] text-slate-500 max-w-[180px]">
                    {p.notes || '—'}
                    {p.status === 'BELUM_TEREALISASI' && !p.notes && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                        Belum ada catatan alasan
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-[#0066B3] hover:bg-[#EAF4FC] cursor-pointer"
                        title="Perbarui"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        disabled={deletingId === p.id}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                        title="Hapus"
                      >
                        {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {programs.length === 0 && <EmptyState />}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {programs.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9.5px] font-black tracking-wider uppercase text-[#1769AA]">
                  {p.sequence} · {CATEGORY_LABELS[p.category]}
                </div>
                <div className="text-xs font-bold text-[#0B3568] leading-snug mt-0.5">{p.name}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <ProgressCell value={p.progress} target={p.planTarget} />
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="font-black uppercase tracking-wide text-slate-400">Plan (P)</span>
                <div className="font-semibold text-slate-600">{p.plan || `${p.planTarget}%`}</div>
              </div>
              <div>
                <span className="font-black uppercase tracking-wide text-slate-400">Realisasi (R)</span>
                <div className="font-semibold text-slate-600">{p.realization || `${p.progress}%`}</div>
              </div>
            </div>
            {p.notes && <p className="text-[10.5px] text-slate-500 leading-relaxed">{p.notes}</p>}
            {p.status === 'BELUM_TEREALISASI' && !p.notes && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                Belum ada catatan alasan — lengkapi keterangan
              </span>
            )}
            <div className="flex items-center gap-2 pt-1 border-t border-[#EDF2F7]">
              <button onClick={() => onEdit(p)} className="flex-1 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#CBD7E6] text-slate-600 hover:bg-slate-50 cursor-pointer">
                Perbarui
              </button>
              <button onClick={() => onDelete(p)} disabled={deletingId === p.id} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                Hapus
              </button>
            </div>
          </div>
        ))}
        {programs.length === 0 && (
          <div className="bg-white rounded-xl border border-[#DCE5EF] p-4"><EmptyState /></div>
        )}
      </div>
    </>
  );
}
