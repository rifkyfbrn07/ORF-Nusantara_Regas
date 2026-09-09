'use client';

<<<<<<< HEAD
import { useTransition } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { updateProgramTaskAction } from '@/server/actions/programKerjaActions';

type Program = {
  id: string;
  year: number;
  name: string;
  plan: string | null;
  realization: string | null;
  progress: number;
  picProgress: number;
  status: string;
  notes: string | null;
  deadline: Date | null;
  tasks: Array<{ id: string; label: string; isDone: boolean; order: number }>;
};

export function ProgramKerjaOperatorClient({ programs }: { programs: Program[] }) {
  const [pending, startTransition] = useTransition();

  const toggleTask = (taskId: string, isDone: boolean) => {
    startTransition(async () => {
      const result = await updateProgramTaskAction({ taskId, isDone });
      if (!result.success) toast.error(result.error || 'Gagal memperbarui checklist.');
      else toast.success(isDone ? 'Checklist selesai.' : 'Checklist dikembalikan ke pending.');
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600"><Target className="h-5 w-5" /></div>
          <div><p className="text-[10px] font-black uppercase tracking-wider text-orange-600">WORK ASSIGNMENT</p><h1 className="text-xl font-black text-[#092B57]">Program Kerja Saya</h1><p className="mt-1 text-xs text-slate-500">Program dan checklist yang ditugaskan kepada Anda oleh Admin/Manager.</p></div>
        </div>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-bold text-slate-600">Belum ada Program Kerja yang ditugaskan</h2><p className="mt-1 text-xs text-slate-400">Program akan muncul setelah Admin/Manager menetapkan Anda sebagai PIC.</p></div>
      ) : programs.map((program) => {
        const done = program.tasks.filter((task) => task.isDone).length;
        const total = program.tasks.length;
        const checklistProgress = total ? Math.round((done / total) * 100) : program.picProgress;
        return (
          <section key={program.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">PROGRAM {program.year}</p><h2 className="mt-1 text-base font-black text-[#092B57]">{program.name}</h2><p className="mt-1 text-xs text-slate-500">{program.plan || 'Tidak ada deskripsi plan.'}</p></div><span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{program.status.replaceAll('_', ' ')}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Target</p><p className="mt-1 text-lg font-black text-[#092B57]">{program.progress}%</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Checklist</p><p className="mt-1 text-lg font-black text-[#092B57]">{checklistProgress}%</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Selesai</p><p className="mt-1 text-lg font-black text-emerald-600">{done}/{total}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Deadline</p><p className="mt-1 text-xs font-bold text-[#092B57]">{program.deadline ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(program.deadline)) : 'Belum ditentukan'}</p></div></div>

            <div className="mt-5 border-t border-slate-100 pt-4"><div className="mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#1769AA]" /><h3 className="text-xs font-black uppercase tracking-wide text-[#092B57]">Checklist Pekerjaan</h3></div>{program.tasks.length === 0 ? <p className="text-xs text-slate-400">Belum ada checklist untuk program ini.</p> : <div className="space-y-2">{program.tasks.map((task) => <label key={task.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:bg-slate-50"><input type="checkbox" checked={task.isDone} disabled={pending} onChange={(event) => toggleTask(task.id, event.target.checked)} className="h-4 w-4 accent-[#0B3568]" />{task.isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="h-4 w-4" /> }<span className={`flex-1 text-xs font-semibold ${task.isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.label}</span>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}</label>)}</div>}</div>
          </section>
=======
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Square, Plus, Loader2 } from 'lucide-react';
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

export function ProgramKerjaOperatorClient({
  programs,
  viewerId,
}: {
  programs: ProgramKerjaDTO[];
  viewerId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const recompute = (p: ProgramKerjaDTO) => {
    if (p.tasks.length === 0) return 0;
    return Math.round((p.tasks.filter((t) => t.isDone).length / p.tasks.length) * 100);
  };

  async function toggleTask(p: ProgramKerjaDTO, taskId: string, isDone: boolean) {
    setBusy(taskId);
    try {
      await setTaskDoneAction({ taskId, isDone });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function addTask(p: ProgramKerjaDTO) {
    const label = window.prompt('Nama checklist task baru:');
    if (!label || label.trim().length < 3) return;
    setBusy(p.id);
    try {
      await upsertTaskAction({ programId: p.id, label: label.trim(), isDone: false });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function updateProgress(p: ProgramKerjaDTO) {
    const input = window.prompt('Progress (0-100):', String(p.picProgress));
    const num = Number(input);
    if (Number.isNaN(num)) return;
    setBusy(p.id);
    try {
      await updatePicProgressAction({ programId: p.id, progress: num });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (programs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs px-6 py-12 text-center">
        <CheckSquare className="h-7 w-7 mx-auto text-slate-300 mb-2" />
        <p className="text-xs font-bold text-slate-500">Belum ada program kerja yang ditugaskan kepada Anda.</p>
        <p className="text-[11px] text-slate-400 mt-1">Admin/Manager akan tugaskan program bila perlu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {programs.map((p) => {
        const doneCount = p.tasks.filter((t) => t.isDone).length;
        const progress = recompute(p);
        return (
          <div key={p.id} className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EDF2F7] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
                  {p.sequence} · {CATEGORY_LABELS[p.category]} · {p.year}
                </div>
                <h3 className="text-sm font-black text-[#092B57] leading-snug mt-0.5">{p.name}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10.5px] text-slate-500">
                  <span>Target (P): <b className="text-[#0B3568]">{p.planTarget}%</b></span>
                  <span>Realisasi (R): <b className="text-emerald-700">{p.progress}%</b></span>
                  <span>Progress Saya: <b className="text-amber-700">{p.picProgress}%</b></span>
                  {p.deadline && <span>Deadline: <b className="text-red-600">{p.deadline.slice(0, 10)}</b></span>}
                  {p.picName && <span>PIC: <b>{p.picName}</b> @{p.picUsername || '-'}</span>}
                </div>
                {p.plan && <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed"><span className="font-bold text-[#0B3568]">Plan:</span> {p.plan}</p>}
                {p.notes && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed"><span className="font-bold text-[#0B3568]">Catatan:</span> {p.notes}</p>}
              </div>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full border text-[10px] font-black whitespace-nowrap shrink-0 ${STATUS_BADGE[p.status]}`}
              >
                {STATUS_LABELS[p.status]}
              </span>
            </div>

            <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, p.picProgress || progress)}%`, backgroundColor: (p.picProgress || progress) >= 100 ? '#16A34A' : (p.picProgress || progress) > 0 ? '#F59E0B' : '#DC2626' }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-black text-[#0B3568] tabular-nums">{p.picProgress || progress}%</span>
                <button
                  onClick={() => updateProgress(p)}
                  disabled={busy === p.id}
                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg border border-[#CBD7E6] text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Update
                </button>
              </div>
            </div>
            {/* CHECKLIST_BODY */}
            <div className="border-t border-[#EDF2F7]">
              <div className="px-5 pt-2.5 pb-1 flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Checklist Task ({doneCount}/{p.tasks.length})
                </span>
                <button
                  onClick={() => addTask(p)}
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#0066B3] hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Tambah Task
                </button>
              </div>
              {p.tasks.length === 0 ? (
                <p className="px-5 py-2 text-[11px] text-slate-400">
                  Belum ada task. Admin/Manager atau PIC dapat menambahkan checklist.
                </p>
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {p.tasks.map((t) => (
                    <li key={t.id} className="px-5 py-2 flex items-center gap-2.5 hover:bg-[#F8FBFE]">
                      <button
                        type="button"
                        onClick={() => toggleTask(p, t.id, !t.isDone)}
                        disabled={busy === t.id}
                        className="w-5 h-5 shrink-0 cursor-pointer disabled:opacity-50"
                        title={t.isDone ? 'Mark belum selesai' : 'Mark selesai'}
                      >
                        {t.isDone ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                      <span className={`text-[11.5px] flex-1 ${t.isDone ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                        {t.label}
                      </span>
                      {busy === t.id && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
>>>>>>> f728c28 (coba)
        );
      })}
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> f728c28 (coba)
