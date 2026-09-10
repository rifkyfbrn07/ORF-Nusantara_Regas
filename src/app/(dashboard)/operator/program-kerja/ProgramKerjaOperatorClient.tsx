'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
<<<<<<< HEAD
import { CheckSquare, Loader2, Plus, Search, Square } from 'lucide-react';
=======
import { CheckSquare, Square, Plus, Loader2, ExternalLink, Send, AlertCircle, History } from 'lucide-react';
>>>>>>> ea15c98 (ini ketinggalan)
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { setTaskDoneAction, upsertTaskAction, updatePicProgressAction } from '@/server/actions/programKerjaActions';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';

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

<<<<<<< HEAD
export function ProgramKerjaOperatorClient({ programs }: { programs: ProgramKerjaDTO[]; viewerId: string }) {
=======
export function ProgramKerjaOperatorClient({
  programs,
}: {
  programs: ProgramKerjaDTO[];
}) {
>>>>>>> ea15c98 (ini ketinggalan)
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

<<<<<<< HEAD
  async function saveProgress(program: ProgramKerjaDTO) {
    const progress = getProgress(program);
    setBusy(program.id);
    try {
      const result = await updatePicProgressAction({ programId: program.id, progress });
      if (!result.success) window.alert(result.error);
      else router.refresh();
    } finally {
      setBusy(null);
=======
  // --- Progress Update Modal State ---
  const [progressProgram, setProgressProgram] = useState<ProgramKerjaDTO | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressNote, setProgressNote] = useState('');
  const [progressEvidence, setProgressEvidence] = useState<{ evidenceUrl?: string; evidenceName?: string; evidenceMime?: string; evidenceSize?: number; driveFileId?: string; driveWebViewLink?: string } | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const openProgressModal = (p: ProgramKerjaDTO) => {
    setProgressProgram(p);
    setProgressValue(p.picProgress);
    setProgressNote('');
    setProgressEvidence(null);
    setProgressError(null);
  };

  const submitProgress = async () => {
    if (!progressProgram) return;
    setProgressLoading(true);
    setProgressError(null);
    const res = await updatePicProgressAction({
      programId: progressProgram.id,
      progress: progressValue,
      note: progressNote,
      evidenceUrl: progressEvidence?.evidenceUrl,
      evidenceName: progressEvidence?.evidenceName,
      evidenceMime: progressEvidence?.evidenceMime,
      evidenceSize: progressEvidence?.evidenceSize,
      driveFileId: progressEvidence?.driveFileId,
      driveWebViewLink: progressEvidence?.driveWebViewLink,
    });
    setProgressLoading(false);
    if (!res.success) {
      setProgressError(res.error || 'Gagal memperbarui progress.');
    } else {
      setShowHistoryFor(null);
      setProgressProgram(null);
      router.refresh();
>>>>>>> ea15c98 (ini ketinggalan)
    }
  };

  // --- Progress History Modal State ---
  const [showHistoryFor, setShowHistoryFor] = useState<ProgramKerjaDTO | null>(null);

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
    <>
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
<<<<<<< HEAD
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
=======
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-black text-[#0B3568] tabular-nums">{p.picProgress || progress}%</span>
                <button
                  type="button"
                  onClick={() => setShowHistoryFor(p)}
                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg border border-[#CBD7E6] text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Riwayat progress & evidence"
                >
                  <History className="h-3 w-3" />
                  Riwayat
                </button>
                <button
                  type="button"
                  onClick={() => openProgressModal(p)}
                  disabled={busy === p.id}
                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg border border-[#CBD7E6] text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Update
                </button>
>>>>>>> ea15c98 (ini ketinggalan)
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

    {/* Progress History Modal */}
    {showHistoryFor && (
      <Modal
        open={Boolean(showHistoryFor)}
        onClose={() => setShowHistoryFor(null)}
        title={`Riwayat Progress — ${showHistoryFor.name}`}
        eyebrow="PROGRAM KERJA · EVIDENCE"
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setShowHistoryFor(null)}
            className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            Tutup
          </button>
        }
      >
        {showHistoryFor.progressLogs.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">
            Belum ada riwayat perubahan progress dengan evidence.
          </p>
        ) : (
          <div className="space-y-2.5">
            {showHistoryFor.progressLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#0F2F63]">
                    {log.oldProgress}% → <span className="text-emerald-700">{log.newProgress}%</span>
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {log.userName || 'Sistem'} · {log.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                {log.note && <p className="text-[11px] text-slate-500 mt-1 leading-snug">{log.note}</p>}
                {log.driveWebViewLink && (
                  <a href={log.driveWebViewLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#1769AA] hover:underline">
                    <ExternalLink className="h-3 w-3" /> Lihat Evidence
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    )}

    {/* Progress Update Modal */}
    {progressProgram && (
      <Modal
        open={Boolean(progressProgram)}
        onClose={() => setProgressProgram(null)}
        title={`Update Progress — ${progressProgram.name}`}
        eyebrow="PROGRAM KERJA · EVIDENCE WAJIB"
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProgressProgram(null)}
              className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submitProgress}
              disabled={progressLoading}
              className="px-5 py-2 text-xs font-bold bg-[#0B3568] hover:bg-[#092B57] text-white rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{progressLoading ? 'Simpan...' : 'Simpan Progress'}</span>
            </button>
          </div>
        }
      >
        {progressError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="leading-snug">{progressError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Progress Baru</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-center">
                <span
                  className="text-3xl font-black text-[#0B3568] tabular-nums transition-all duration-200"
                  style={{ color: progressValue >= 100 ? '#16A34A' : progressValue > 0 ? '#F59E0B' : '#DC2626' }}
                >
                  {progressValue}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={progressValue}
                onChange={(e) => {
                  const clamped = Math.min(100, Math.max(0, Number(e.target.value)));
                  setProgressValue(Number.isNaN(clamped) ? 0 : clamped);
                }}
                className="w-full mt-2 accent-[#0B3568]"
                aria-label="Progress slider 0-100%"
              />
              <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                <span>0%</span>
                <span>100%</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setProgressValue(Math.max(0, progressValue - 5))}
                  className="px-3 py-1.5 text-[10.5px] font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  −5%
                </button>
                <button
                  type="button"
                  onClick={() => setProgressValue(Math.min(100, progressValue + 5))}
                  className="px-3 py-1.5 text-[10.5px] font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  +5%
                </button>
                <span className="text-[10px] text-slate-400 ml-auto">0 – 100 · integer</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Catatan (opsional)</label>
            <textarea
              rows={3}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="Deskripsi progress, kegiatan yang selesai, atau halangan..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B3568]"
            />
          </div>

          <FileUploadProof
            label="Bukti / Evidence (wajib saat progress naik)"
            folderCategory="PROGRAM_KERJA"
            subCategory={progressProgram.category}
            required
            onFileUploaded={(meta) => {
              setProgressEvidence(meta ? { ...meta } : null);
            }}
          />
        </div>
      </Modal>
    )}
    </>
  );
}
