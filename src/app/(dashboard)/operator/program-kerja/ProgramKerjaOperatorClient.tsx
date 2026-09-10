'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Loader2, Plus, Search, Square, ExternalLink, Send, AlertCircle, History } from 'lucide-react';
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

export function ProgramKerjaOperatorClient({
  programs,
}: {
  programs: ProgramKerjaDTO[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const visiblePrograms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((program) => {
      if (category !== 'all' && program.category !== category) return false;
      if (!q) return true;
      const haystack = `${program.name} ${CATEGORY_LABELS[program.category]} ${program.picName ?? ''} ${program.picUsername ?? ''} ${program.plan ?? ''} ${program.notes ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [programs, query, category]);

  async function toggleTask(program: ProgramKerjaDTO, taskId: string, isDone: boolean) {
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
// --- Progress Update Modal State ---
  const [progressProgram, setProgressProgram] = useState<ProgramKerjaDTO | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressNote, setProgressNote] = useState('');
  const [progressEvidence, setProgressEvidence] = useState<{
    evidenceUrl?: string;
    evidenceName?: string;
    evidenceMime?: string;
    evidenceSize?: number;
    driveFileId?: string;
    driveWebViewLink?: string;
  } | null>(null);
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
    }
  };

  // --- Progress History Modal State ---
  const [showHistoryFor, setShowHistoryFor] = useState<ProgramKerjaDTO | null>(null);

  const recomputeTasks = (p: ProgramKerjaDTO) => {
    if (p.tasks.length === 0) return 0;
    return Math.round((p.tasks.filter((t) => t.isDone).length / p.tasks.length) * 100);
  };

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
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
{visiblePrograms.map((p) => {
        const doneCount = p.tasks.filter((t) => t.isDone).length;
        const progressFromTasks = recomputeTasks(p);
        const showProgress = Math.max(p.picProgress, progressFromTasks);
        return (
          <div key={p.id} className="overflow-hidden rounded-xl border border-[#DCE5EF] bg-white shadow-xs">
            <div className="flex flex-col gap-3 border-b border-[#EDF2F7] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
                  {p.sequence} · {CATEGORY_LABELS[p.category]} · {p.year}
                </div>
                <h3 className="mt-0.5 text-sm font-black text-[#092B57] leading-snug">{p.name}</h3>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
                  <span>Target (P): <b className="text-[#0B3568]">{p.planTarget}%</b></span>
                  <span>Realisasi (R): <b className="text-emerald-700">{p.progress}%</b></span>
                  <span>Progress Saya: <b className="text-amber-700">{p.picProgress}%</b></span>
                  {p.deadline && <span>Deadline: <b className="text-red-600">{p.deadline.slice(0, 10)}</b></span>}
                  {p.picName && <span>PIC: <b>{p.picName}</b> @{p.picUsername || '-'}</span>}
                </div>
                {p.plan && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Plan:</span> {p.plan}</p>}
                {p.realization && <p className="mt-1 text-[11px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Realisasi:</span> {p.realization}</p>}
                {p.notes && <p className="mt-1 text-[11px] leading-relaxed text-slate-500"><span className="font-bold text-[#0B3568]">Catatan:</span> {p.notes}</p>}
                <p className="mt-1 text-[10px] text-slate-400">Terakhir diperbarui: {new Date(p.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[10px] font-black whitespace-nowrap ${STATUS_BADGE[p.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{STATUS_LABELS[p.status] || p.status}</span>
            </div>

            <div className="px-5 py-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="text-[10.5px] font-black uppercase tracking-wide text-slate-500">Progress</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tabular-nums text-[#0066B3]">{showProgress}%</span>
                  <button type="button" onClick={() => setShowHistoryFor(p)} className="inline-flex items-center gap-1 rounded-lg border border-[#CBD7E6] px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50" title="Riwayat progress & evidence">
                    <History className="h-3 w-3" /> Riwayat
                  </button>
                  <button type="button" onClick={() => openProgressModal(p)} disabled={busy === p.id} className="rounded-lg bg-[#123B6D] px-2.5 py-1 text-[10.5px] font-bold text-white hover:bg-[#0F315A] disabled:opacity-50">
                    Update
                  </button>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0066B3] transition-all duration-500" style={{ width: `${Math.min(100, showProgress)}%` }} />
              </div>
            </div>

            <div className="border-t border-[#EDF2F7]">
              <div className="flex items-center justify-between px-5 py-2.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Checklist Task ({doneCount}/{p.tasks.length}){p.tasks.length > 0 ? ` · ${progressFromTasks}%` : ''}
                </span>
                <button type="button" onClick={() => addTask(p)} className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#0066B3] hover:underline">
                  <Plus className="h-3 w-3" /> Tambah Task
                </button>
              </div>
              {p.tasks.length === 0 ? (
                <p className="px-5 py-2 text-[11px] text-slate-400">Belum ada task. Admin/Manager atau PIC dapat menambahkan checklist.</p>
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {p.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2.5 px-5 py-2 hover:bg-[#F8FBFE]">
                      <button type="button" onClick={() => toggleTask(p, t.id, !t.isDone)} disabled={busy === t.id} className="h-5 w-5 shrink-0 cursor-pointer disabled:opacity-50" title={t.isDone ? 'Mark belum selesai' : 'Mark selesai'}>
                        {t.isDone ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5 text-slate-400" />}
                      </button>
                      <span className={`flex-1 text-[11.5px] ${t.isDone ? 'line-through text-slate-400' : 'font-medium text-slate-700'}`}>{t.label}</span>
                      {busy === t.id && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
{/* Progress History Modal */}
      {showHistoryFor && (
        <Modal
          open={Boolean(showHistoryFor)}
          onClose={() => setShowHistoryFor(null)}
          title={`Riwayat Progress — ${showHistoryFor.name}`}
          eyebrow="PROGRAM KERJA · EVIDENCE"
          size="lg"
          footer={
            <button type="button" onClick={() => setShowHistoryFor(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              Tutup
            </button>
          }
        >
          {showHistoryFor.progressLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada riwayat perubahan progress dengan evidence.</p>
          ) : (
            <div className="space-y-2.5">
              {showHistoryFor.progressLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#0F2F63]">{log.oldProgress}% → <span className="text-emerald-700">{log.newProgress}%</span></p>
                    <span className="text-[10px] text-slate-400">{log.userName || 'Sistem'} · {log.createdAt.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  {log.note && <p className="mt-1 text-[11px] leading-snug text-slate-500">{log.note}</p>}
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
          eyebrow="PROGRAM KERJA · EVIDENCE"
          size="lg"
          footer={
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setProgressProgram(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" onClick={submitProgress} disabled={progressLoading} className="flex items-center gap-1.5 rounded-xl bg-[#0B3568] px-5 py-2 text-xs font-bold text-white hover:bg-[#092B57] disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />
                {progressLoading ? 'Simpan...' : 'Simpan Progress'}
              </button>
            </div>
          }
        >
          {progressError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="leading-snug">{progressError}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-center">
                <span className="text-3xl font-black tabular-nums transition-all duration-200" style={{ color: progressValue >= 100 ? '#16A34A' : progressValue > 0 ? '#F59E0B' : '#DC2626' }}>
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
                className="mt-2 w-full accent-[#0B3568]"
                aria-label="Progress slider 0-100%"
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-slate-400"><span>0%</span><span>100%</span></div>
              <div className="mt-1.5 flex items-center gap-2">
                <button type="button" onClick={() => setProgressValue(Math.max(0, progressValue - 5))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-600 hover:bg-slate-50">−5%</button>
                <button type="button" onClick={() => setProgressValue(Math.min(100, progressValue + 5))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-600 hover:bg-slate-50">+5%</button>
                <span className="ml-auto text-[10px] text-slate-400">0 – 100 · integer</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Catatan (opsional)</label>
              <textarea rows={3} value={progressNote} onChange={(e) => setProgressNote(e.target.value)} placeholder="Deskripsi progress, kegiatan yang selesai, atau halangan..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0B3568] focus:outline-none" />
            </div>

            <FileUploadProof
              label="Bukti / Evidence (wajib saat progress naik)"
              folderCategory="PROGRAM_KERJA"
              subCategory={progressProgram.category}
              required
              onFileUploaded={(meta) => setProgressEvidence(meta ? { ...meta } : null)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}