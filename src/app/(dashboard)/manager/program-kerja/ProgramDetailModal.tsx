'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, Download, Eye, FileText, History, Info, Plus, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EvidenceViewer } from '@/components/ui/EvidenceViewer';
import type { ProgramKerjaDTO, ProgramUpdateDTO } from '@/server/services/programKerjaService';
import { CATEGORY_LABELS, MONTH_SHORT, StatusBadge, fmtNumber, fmtPercent } from './shared';
import { getProgramMetrics } from '@/lib/programKerjaLogic';
import { ProgramUpdateFormModal } from './ProgramUpdateFormModal';
import type { ProgramUpdateStatus } from '@prisma/client';

const UPDATE_STATUS_LABELS: Record<ProgramUpdateStatus, string> = {
  DRAFT: 'DRAFT',
  TERKIRIM: 'TERKIRIM',
  DIVERIFIKASI: 'DIVERIFIKASI',
  DITOLAK: 'DITOLAK',
};

const UPDATE_STATUS_STYLES: Record<ProgramUpdateStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-300',
  TERKIRIM: 'bg-blue-50 text-[#0066B3] border-blue-200',
  DIVERIFIKASI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DITOLAK: 'bg-red-50 text-red-700 border-red-200',
};

function UpdateStatusBadge({ status }: { status: ProgramUpdateStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black tracking-wide whitespace-nowrap ${UPDATE_STATUS_STYLES[status]}`}>
      {UPDATE_STATUS_LABELS[status]}
    </span>
  );
}

function updateFileKey(u: ProgramUpdateDTO): string | null {
  return u.storagePath || u.driveFileId || null;
}

function updateDownloadUrl(u: ProgramUpdateDTO): string | null {
  const key = updateFileKey(u);
  if (key) return `/api/files/${encodeURIComponent(key)}?download=1`;
  return u.driveWebViewLink || u.fileUrl || null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return 'Ukuran tidak diketahui';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Field({ label, value, span }: { label: string; value: string; span?: 2 | 3 }) {
  const spanClass = span === 2 ? 'col-span-2' : span === 3 ? 'col-span-2 sm:col-span-3' : undefined;
  return (
    <div className={spanClass}>
      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <div className="mt-0.5 font-bold text-slate-700">{value}</div>
    </div>
  );
}

/** Jadwal bulan program — Plan (biru) dan Realisasi (hijau) dari periode Excel. */
function MonthSchedule({ program }: { program: ProgramKerjaDTO }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const entries = program.months.filter((m) => m.month === i + 1);
    const plan = entries.some((e) => e.target !== null);
    const realValues = entries.filter((e) => e.realization !== null).map((e) => e.realization as number);
    const maxReal = realValues.length ? Math.max(...realValues) : null;
    return { plan, maxReal };
  });
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {months.map((m, idx) => (
        <div key={idx} className="rounded-lg border border-[#E2E8F0] bg-[#FBFDFE] px-2 py-2 text-center">
          <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">{MONTH_SHORT[idx]}</div>
          <div className="mt-1.5 space-y-1">
            <div className={`h-1.5 rounded-full ${m.plan ? 'bg-[#0088D8]' : 'bg-slate-200/70'}`} title="Plan (P)" />
            <div className={`h-1.5 rounded-full ${m.maxReal === 0 ? 'bg-red-400' : m.maxReal && m.maxReal > 0 ? 'bg-emerald-500' : 'bg-slate-200/70'}`} title="Realisasi (R)" />
          </div>
          <div className="mt-1 text-[8.5px] font-black tabular-nums text-slate-500">{m.maxReal !== null ? `${m.maxReal}%` : m.plan ? 'P' : '—'}</div>
        </div>
      ))}
    </div>
  );
}
/** Detail satu update — [Lihat / Preview] dan [Download File] via /api/files (authorized). */
function UpdateDetailModal({ update, programName, onClose }: { update: ProgramUpdateDTO; programName: string; onClose: () => void }) {
  const fileKey = updateFileKey(update);
  const downloadUrl = updateDownloadUrl(update);
  const hasFile = Boolean(fileKey || downloadUrl);

  return (
    <Modal open onClose={onClose} title="Detail Update" eyebrow="RIWAYAT UPDATE" size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px] sm:grid-cols-3">
          <Field label="Program" value={programName} span={2} />
          <Field label="Periode" value={update.period ?? '—'} />
          <Field label="Tanggal" value={formatDate(update.createdAt)} />
          <Field label="Pengirim" value={update.submittedBy?.name ?? '—'} />
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Status</span>
            <div className="mt-1"><UpdateStatusBadge status={update.status} /></div>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">File</span>
            <div className="mt-1 flex items-center gap-1.5 text-slate-700">
              <FileText className="h-3.5 w-3.5 shrink-0 text-[#1769AA]" />
              <span className="truncate font-bold">{update.fileName || 'Tanpa lampiran'}</span>
            </div>
          </div>
          <Field label="Tipe" value={update.mimeType || '—'} />
          <Field label="Ukuran" value={formatBytes(update.fileSize)} />
        </div>

        {update.notes ? (
          <div className="rounded-lg border border-[#DCE5EF] bg-slate-50/60 px-3 py-2.5">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Catatan</span>
            <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{update.notes}</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-[#DCE5EF] bg-slate-50/60 p-3">
          {hasFile ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">File attachment</span>
                <span className="truncate text-[11px] font-bold text-slate-700">{update.fileName || 'Berkas'}</span>
              </div>
              <div className="flex items-center gap-2">
                <EvidenceViewer
                  file={{ fileId: fileKey, fileName: update.fileName, mimeType: update.mimeType, fileSize: update.fileSize, legacyUrl: update.driveWebViewLink || update.fileUrl }}
                  label="Lihat / Preview"
                />
                {downloadUrl && (
                  <a href={downloadUrl} download className="inline-flex items-center gap-1 rounded-md border border-[#CBD7E6] bg-white px-2 py-1 text-[10px] font-bold text-[#0066B3] hover:bg-[#EAF4FC]">
                    <Download className="h-3.5 w-3.5" /> Download File
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-[11px] font-semibold text-slate-400">Update ini tidak memiliki lampiran file.</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
interface ProgramDetailModalProps {
  program: ProgramKerjaDTO;
  /** Manager/Admin dapat mengirim update; operator read-only. */
  canSubmit?: boolean;
  onClose: () => void;
}

export function ProgramDetailModal({ program, canSubmit = true, onClose }: ProgramDetailModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'riwayat' | 'info' | 'jadwal'>('riwayat');
  const [updates, setUpdates] = useState<ProgramUpdateDTO[]>(program.updates ?? []);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<ProgramUpdateDTO | null>(null);
  const metrics = useMemo(() => getProgramMetrics(program), [program]);

  function handleSubmitted(update: ProgramUpdateDTO) {
    // Update terbaru langsung muncul tanpa refresh manual (Rule 8).
    setUpdates((prev) => [update, ...prev.filter((u) => u.id !== update.id)]);
    setFormOpen(false);
    router.refresh();
  }

  const tabs = [
    { id: 'riwayat', label: `Riwayat Update (${updates.length})`, icon: History },
    { id: 'info', label: 'Informasi / Progress', icon: Info },
    { id: 'jadwal', label: 'Jadwal', icon: CalendarRange },
  ] as const;

  return (
    <Modal open onClose={onClose} title={program.name} eyebrow={`DETAIL PROGRAM · ${CATEGORY_LABELS[program.category]}`} size="2xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[9.5px] font-black uppercase tracking-wider text-[#1769AA]">{program.sequence} · {CATEGORY_LABELS[program.category]} · Tahun {program.year}</div>
          <div className="mt-0.5 text-sm font-black text-[#0B3568]">{program.name}</div>
        </div>
        {canSubmit && (
          <button type="button" onClick={() => setFormOpen(true)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#123B6D] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#0F315A]">
            <Send className="h-3.5 w-3.5" /> Kirim Update
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[#EDF2F7] pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10.5px] font-bold transition-colors ${tab === t.id ? 'bg-[#0066B3] text-white' : 'bg-[#F1F5F9] text-slate-500 hover:bg-slate-200/60'}`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'riwayat' && (
        <div>
          <div className="hidden overflow-hidden rounded-lg border border-[#DCE5EF] md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#EDF4FB] text-[9.5px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 font-black">Tanggal</th>
                  <th className="px-3 py-2 font-black">Periode</th>
                  <th className="px-3 py-2 font-black">Pengirim</th>
                  <th className="px-3 py-2 font-black">File</th>
                  <th className="px-3 py-2 font-black">Status</th>
                  <th className="px-3 py-2 text-right font-black">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF2F7]">
                {updates.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FBFE]">
                    <td className="whitespace-nowrap px-3 py-2 text-[10.5px] font-bold text-slate-700">{formatDate(u.createdAt)}</td>
                    <td className="px-3 py-2 text-[10.5px] font-semibold text-slate-600">{u.period || '—'}</td>
                    <td className="px-3 py-2 text-[10.5px] font-semibold text-slate-600">{u.submittedBy?.name || '—'}</td>
                    <td className="max-w-[180px] px-3 py-2">
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-700"><FileText className="h-3 w-3 shrink-0 text-[#1769AA]" /><span className="truncate">{u.fileName || 'Tanpa lampiran'}</span></span>
                    </td>
                    <td className="px-3 py-2"><UpdateStatusBadge status={u.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => setViewing(u)} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#CBD7E6] px-2 py-1 text-[9.5px] font-bold text-[#0066B3] hover:bg-[#EAF4FC]">
                        <Eye className="h-3 w-3" /> Lihat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 md:hidden">
            {updates.map((u) => (
              <div key={u.id} className="rounded-lg border border-[#DCE5EF] bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black text-slate-700">{u.period || '—'}</div>
                  <UpdateStatusBadge status={u.status} />
                </div>
                <div className="mt-1 text-[10px] font-semibold text-slate-400">{formatDate(u.createdAt)} · {u.submittedBy?.name || '—'}</div>
                <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-slate-700"><FileText className="h-3 w-3 shrink-0 text-[#1769AA]" /><span className="truncate">{u.fileName || 'Tanpa lampiran'}</span></div>
                <button type="button" onClick={() => setViewing(u)} className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#CBD7E6] bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#0066B3] hover:bg-[#EAF4FC]">
                  <Eye className="h-3.5 w-3.5" /> Lihat Detail
                </button>
              </div>
            ))}
          </div>

          {updates.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#CBD7E6] bg-slate-50/60 px-4 py-8 text-center">
              <History className="mx-auto mb-2 h-5 w-5 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Tidak ada update yang dikirim.</p>
              {canSubmit && (
                <button type="button" onClick={() => setFormOpen(true)} className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#CBD7E6] bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#0066B3] hover:bg-[#EAF4FC]">
                  <Plus className="h-3.5 w-3.5" /> Kirim Update
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'info' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] sm:grid-cols-3">
            <Field label="Kategori" value={CATEGORY_LABELS[program.category]} />
            <Field label="Tahun" value={String(program.year)} />
            <Field label="Nomor Urut" value={String(program.sequence)} />
            <Field label="PIC" value={program.pic?.name || 'Belum ditentukan'} />
            <Field label="Deadline" value={program.deadline ? program.deadline.slice(0, 10) : '—'} />
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Status</span>
              <div className="mt-1"><StatusBadge status={metrics.status} /></div>
            </div>
            <Field label="Plan (P)" value={fmtNumber(metrics.plan)} />
            <Field label="Realisasi (R)" value={fmtNumber(metrics.realization)} />
            <Field label="Tidak Terealisasi" value={fmtNumber(metrics.notRealized)} />
          </div>
          <div className="rounded-xl border border-[#DCE5EF] bg-[#FBFDFE] p-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
              <span>Progress</span>
              <span className="tabular-nums text-[#0B3568]">{fmtPercent(metrics.progress)}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${metrics.progress >= 100 ? 'bg-emerald-500' : metrics.progress > 0 ? 'bg-[#F58220]' : 'bg-red-400'}`} style={{ width: `${Math.min(100, Math.round(metrics.progress))}%` }} />
            </div>
          </div>
          {program.plan && (
            <div className="rounded-lg border border-[#DCE5EF] bg-slate-50/60 px-3 py-2.5">
              <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Rencana / Plan</span>
              <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{program.plan}</p>
            </div>
          )}
          {program.realization && (
            <div className="rounded-lg border border-[#DCE5EF] bg-slate-50/60 px-3 py-2.5">
              <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Realisasi (deskripsi)</span>
              <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{program.realization}</p>
            </div>
          )}
          {program.notes && (
            <div className="rounded-lg border border-[#DCE5EF] bg-slate-50/60 px-3 py-2.5">
              <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Keterangan</span>
              <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{program.notes}</p>
            </div>
          )}
          {program.tasks.length > 0 && (
            <div className="rounded-lg border border-[#DCE5EF] bg-slate-50/60 px-3 py-2.5">
              <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Checklist</span>
              <div className="mt-1 space-y-1">
                {program.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className={`h-1.5 w-1.5 rounded-full ${task.isDone ? 'bg-emerald-500' : 'bg-slate-300'}`} /> {task.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'jadwal' && (
        <div className="space-y-2">
          <MonthSchedule program={program} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[9.5px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0088D8]" /> Plan (P)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Realisasi (R)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> R = 0 (belum terealisasi)</span>
          </div>
        </div>
      )}

      {formOpen && canSubmit && <ProgramUpdateFormModal program={program} onClose={() => setFormOpen(false)} onSubmitted={handleSubmitted} />}
      {viewing && <UpdateDetailModal update={viewing} programName={program.name} onClose={() => setViewing(null)} />}
    </Modal>
  );
}