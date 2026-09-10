'use client';

import React from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { CATEGORY_LABELS, EmptyState, ProgressCell, StatusBadge } from './shared';

interface ProgramListViewProps {
  programs: ProgramKerjaDTO[];
  deletingId: string | null;
  onEdit: (p: ProgramKerjaDTO) => void;
  onDelete: (p: ProgramKerjaDTO) => void;
}

export function ProgramListView({ programs, deletingId, onEdit, onDelete }: ProgramListViewProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-[#DCE5EF] bg-white shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead>
              <tr className="bg-[#EDF4FB] text-[10px] uppercase tracking-wider text-slate-500">
                <th className="w-10 px-3 py-3 font-black">No</th>
                <th className="px-3 py-3 font-black">Program Kerja</th>
                <th className="w-40 px-3 py-3 font-black">Kategori</th>
                <th className="w-32 px-3 py-3 font-black">PIC</th>
                <th className="w-28 px-3 py-3 font-black">Deadline</th>
                <th className="w-28 px-3 py-3 font-black">Plan (P)</th>
                <th className="w-28 px-3 py-3 font-black">Realisasi (R)</th>
                <th className="w-36 px-3 py-3 font-black">Progress</th>
                <th className="w-40 px-3 py-3 font-black">Status</th>
                <th className="px-3 py-3 font-black">Keterangan</th>
                <th className="w-20 px-3 py-3 text-right font-black">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF2F7]">
              {programs.map((p) => (
                <tr key={p.id} className="align-top hover:bg-[#F8FBFE]">
                  <td className="px-3 py-3 text-xs font-black tabular-nums text-slate-400">{p.sequence}</td>
                  <td className="max-w-[280px] px-3 py-3 text-xs font-bold text-[#0B3568]">{p.name}</td>
                  <td className="px-3 py-3 text-[11px] font-semibold text-slate-500">{CATEGORY_LABELS[p.category]}</td>
                  <td className="px-3 py-3 text-[10.5px] text-slate-500">{p.picName ? <><div className="font-bold text-[#0B3568]">{p.picName}</div><div className="font-mono text-slate-400">@{p.picUsername || '—'}</div></> : 'Belum ditugaskan'}</td>
                  <td className="px-3 py-3 text-[10.5px] font-semibold text-slate-600">{p.deadline ? new Date(p.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500"><div className="font-bold text-[#0B3568]">{p.planTarget}%</div>{p.plan && <div className="mt-0.5 text-[10px] text-slate-400">{p.plan}</div>}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500"><div className="font-bold text-[#0B3568]">{p.progress}%</div>{p.realization && <div className="mt-0.5 text-[10px] text-slate-400">{p.realization}</div>}</td>
                  <td className="px-3 py-3"><ProgressCell value={p.progress} target={p.planTarget} /></td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="max-w-[180px] px-3 py-3 text-[11px] text-slate-500">{p.notes || '—'}{p.status === 'BELUM_TEREALISASI' && !p.notes && <span className="mt-1 inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9.5px] font-bold text-red-600">Belum ada catatan alasan</span>}</td>
                  <td className="px-3 py-3"><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => onEdit(p)} className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-[#EAF4FC] hover:text-[#0066B3]" title="Perbarui"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onDelete(p)} disabled={deletingId === p.id} className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" title="Hapus">{deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {programs.length === 0 && <EmptyState />}
      </div>

      <div className="space-y-3 md:hidden">
        {programs.map((p) => (
          <article key={p.id} className="space-y-2.5 rounded-xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="text-[9.5px] font-black uppercase tracking-wider text-[#1769AA]">{p.sequence} · {CATEGORY_LABELS[p.category]}</div><div className="mt-0.5 text-xs font-bold leading-snug text-[#0B3568]">{p.name}</div></div><StatusBadge status={p.status} /></div>
            <ProgressCell value={p.progress} target={p.planTarget} />
            <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-3"><div><span className="font-black uppercase tracking-wide text-slate-400">PIC</span><div className="font-semibold text-slate-600">{p.picName || '—'}</div></div><div><span className="font-black uppercase tracking-wide text-slate-400">Deadline</span><div className="font-semibold text-slate-600">{p.deadline ? p.deadline.slice(0, 10) : '—'}</div></div><div><span className="font-black uppercase tracking-wide text-slate-400">Progress</span><div className="font-semibold text-slate-600">{p.progress}%</div></div></div>
            {p.plan && <p className="text-[10.5px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Plan:</span> {p.plan}</p>}
            {p.realization && <p className="text-[10.5px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Realisasi:</span> {p.realization}</p>}
            {p.notes && <p className="text-[10.5px] leading-relaxed text-slate-500">{p.notes}</p>}
            <div className="flex items-center gap-2 border-t border-[#EDF2F7] pt-1"><button type="button" onClick={() => onEdit(p)} className="flex-1 cursor-pointer rounded-lg border border-[#CBD7E6] px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Perbarui</button><button type="button" onClick={() => onDelete(p)} disabled={deletingId === p.id} className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">Hapus</button></div>
          </article>
        ))}
        {programs.length === 0 && <div className="rounded-xl border border-[#DCE5EF] bg-white p-4"><EmptyState /></div>}
      </div>
    </>
  );
}
