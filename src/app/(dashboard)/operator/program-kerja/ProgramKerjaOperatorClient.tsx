'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Loader2, Plus, Search, Square } from 'lucide-react';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { setTaskDoneAction, upsertTaskAction, updatePicProgressAction } from '@/server/actions/programKerjaActions';

export const CATEGORY_LABELS: Record<string, string> = {
  PENGADAAN: 'A. Pengadaan',
  RAPAT_KOORDINASI: 'B. Rapat Koordinasi',
  OPERASIONAL_RUTIN: 'C. Operasional Rutin',
  AUDIT: 'D. Audit',
};

export const STATUS_LABELS: Record<string, string> = {
  PLAN: 'PLAN',
  REALISASI: 'REALISASI',
  ON_PROGRESS: 'ON PROGRESS',
  BELUM_TEREALISASI: 'BELUM TERREALISASI',
};

const STATUS_BADGE: Record<string, string> = {
  PLAN: 'bg-slate-100 text-slate-600 border-slate-200',
  REALISASI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  BELUM_TEREALISASI: 'bg-red-50 text-red-700 border-red-200',
};

export function ProgramKerjaOperatorClient({ programs }: { programs: ProgramKerjaDTO[]; viewerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [progressDraft, setProgressDraft] = useState<Record<string, number>>({});

  const visiblePrograms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((program) => {
      if (category !== 'all' && program.category !== category) return false;
      if (!q) return true;
      const haystack = `${program.name} ${CATEGORY_LABELS[program.category]} ${program.picName ?? ''} ${program.picUsername ?? ''} ${program.plan ?? ''} ${program.notes ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [programs, query, category]);

  const getProgress = (program: ProgramKerjaDTO) => progressDraft[program.id] ?? program.picProgress;

  async function toggleTask(taskId: string, isDone: boolean) {
    setBusy(taskId);
    try {
      const result = await setTaskDoneAction({ taskId, isDone });
      if (!result.success) window.alert(result.error);
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function addTask(program: ProgramKerjaDTO) {
    const label = window.prompt('Nama checklist task baru:');
    if (!label || label.trim().length < 3) return;
    setBusy(program.id);
    try {
      const result = await upsertTaskAction({ programId: program.id, label: label.trim(), isDone: false });
      if (!result.success) window.alert(result.error);
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function saveProgress(program: ProgramKerjaDTO) {
    const progress = getProgress(program);
    setBusy(program.id);
    try {
      const result = await updatePicProgressAction({ programId: program.id, progress });
      if (!result.success) window.alert(result.error);
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (programs.length === 0) {
    return (
      <div className="rounded-xl border border-[#DCE5EF] bg-white px-6 py-12 text-center shadow-xs">
        <CheckSquare className="mx-auto mb-2 h-7 w-7 text-slate-300" />
        <p className="text-xs font-bold text-slate-500">Belum ada program kerja yang ditugaskan kepada Anda.</p>
        <p className="mt-1 text-[11px] text-slate-400">Admin/Manager akan menugaskan program bila diperlukan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#DCE5EF] bg-white p-3 shadow-xs">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="relative">
            <span className="sr-only">Cari Program Kerja</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari program, kategori, catatan..." className="field w-full pl-9 text-xs" />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="field text-xs" aria-label="Filter kategori">
            <option value="all">Semua Kategori</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <p className="mt-2 text-[10px] font-semibold text-slate-400">Program Kerja Saya · {visiblePrograms.length} program tampil</p>
      </div>

      {visiblePrograms.length === 0 ? (
        <div className="rounded-xl border border-[#DCE5EF] bg-white px-6 py-10 text-center shadow-xs text-xs font-bold text-slate-400">Tidak ada program yang cocok dengan pencarian/kategori.</div>
      ) : visiblePrograms.map((program) => {
        const doneCount = program.tasks.filter((task) => task.isDone).length;
        const progress = getProgress(program);
        const progressFromTasks = program.tasks.length > 0 ? Math.round((doneCount / program.tasks.length) * 100) : 0;
        return (
          <article key={program.id} className="overflow-hidden rounded-xl border border-[#DCE5EF] bg-white shadow-xs">
            <div className="flex flex-col justify-between gap-3 border-b border-[#EDF2F7] px-5 py-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#1769AA]">{program.sequence} · {CATEGORY_LABELS[program.category]} · {program.year}</div>
                <h3 className="mt-0.5 text-sm font-black leading-snug text-[#092B57]">{program.name}</h3>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
                  <span>Target: <b className="text-[#0B3568]">{program.planTarget}%</b></span>
                  <span>Realisasi: <b className="text-emerald-700">{program.progress}%</b></span>
                  <span>Progress PIC: <b className="text-[#0066B3]">{progress}%</b></span>
                  {program.deadline && <span>Deadline: <b className="text-red-600">{program.deadline.slice(0, 10)}</b></span>}
                  {program.picName && <span>PIC: <b>{program.picName}</b> @{program.picUsername || '-'}</span>}
                </div>
                {program.plan && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Plan:</span> {program.plan}</p>}
                {program.realization && <p className="mt-1 text-[11px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Realisasi:</span> {program.realization}</p>}
                {program.notes && <p className="mt-1 text-[11px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Catatan:</span> {program.notes}</p>}
                <p className="mt-1 text-[10px] text-slate-400">Terakhir diperbarui: {new Date(program.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[10px] font-black whitespace-nowrap ${STATUS_BADGE[program.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{STATUS_LABELS[program.status] || program.status}</span>
            </div>

            <div className="border-b border-[#EDF2F7] px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={`progress-${program.id}`} className="text-[10.5px] font-black uppercase tracking-wide text-slate-500">Progress Program Kerja</label>
                <output htmlFor={`progress-${program.id}`} className="text-lg font-black tabular-nums text-[#0066B3]" aria-live="polite">{progress}%</output>
              </div>
              <input
                id={`progress-${program.id}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={progress}
                aria-label={`Progress Program Kerja ${program.name}`}
                onChange={(event) => setProgressDraft((current) => ({ ...current, [program.id]: Number(event.target.value) }))}
                className="h-5 w-full cursor-pointer accent-[#0066B3] touch-none"
              />
              <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>0%</span><span>100%</span></div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[10px] text-slate-400">Checklist: {doneCount}/{program.tasks.length} selesai{program.tasks.length > 0 ? ` · ${progressFromTasks}%` : ''}</span>
                <button type="button" onClick={() => saveProgress(program)} disabled={busy === program.id} className="rounded-lg bg-[#123B6D] px-3 py-1.5 text-[10.5px] font-bold text-white hover:bg-[#0F315A] disabled:opacity-50">{busy === program.id ? 'Menyimpan...' : 'Simpan Progress'}</button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-5 pb-1 pt-2.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Checklist Task ({doneCount}/{program.tasks.length})</span>
                <button type="button" onClick={() => addTask(program)} disabled={busy === program.id} className="inline-flex cursor-pointer items-center gap-1 text-[10.5px] font-bold text-[#0066B3] hover:underline disabled:opacity-50"><Plus className="h-3 w-3" /> Tambah Task</button>
              </div>
              {program.tasks.length === 0 ? (
                <p className="px-5 py-2 text-[11px] text-slate-400">Belum ada task. Admin/Manager atau PIC dapat menambahkan checklist.</p>
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {program.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2.5 px-5 py-2 hover:bg-[#F8FBFE]">
                      <button type="button" onClick={() => toggleTask(task.id, !task.isDone)} disabled={busy === task.id} className="h-5 w-5 shrink-0 cursor-pointer disabled:opacity-50" aria-label={task.isDone ? `Tandai ${task.label} belum selesai` : `Tandai ${task.label} selesai`}>
                        {task.isDone ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5 text-slate-400" />}
                      </button>
                      <span className={`flex-1 text-[11.5px] ${task.isDone ? 'text-slate-400 line-through' : 'font-medium text-slate-700'}`}>{task.label}</span>
                      {busy === task.id && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
