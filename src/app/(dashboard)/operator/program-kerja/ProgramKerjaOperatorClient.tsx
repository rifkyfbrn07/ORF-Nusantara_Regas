'use client';

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
        );
      })}
    </div>
  );
}
