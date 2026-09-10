'use client';

import React, { useState } from 'react';
import { CheckSquare, Loader2 } from 'lucide-react';
import { ProgramCategory as ProgramKerjaCategory, ProgramStatus } from '@prisma/client';
import { createProgramKerjaAction, updateProgramKerjaAction } from '@/server/actions/programKerjaActions';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import { CATEGORY_LABELS, STATUS_LABELS } from './shared';

interface PicUserOption {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
}

interface FormState {
  year: number;
  category: ProgramKerjaCategory;
  sequence: number;
  name: string;
  plan: string;
  realization: string;
  planTarget: number;
  progress: number;
  status: ProgramStatus;
  notes: string;
<<<<<<< HEAD
  deadline: string;
  picId: string;
=======
  evidenceUrl: string;
  evidenceName: string;
  evidenceMime: string;
  evidenceSize?: number;
  driveFileId: string;
  driveWebViewLink: string;
>>>>>>> ea15c98 (ini ketinggalan)
}

const EMPTY_FORM: FormState = {
  year: new Date().getFullYear(),
  category: 'PENGADAAN',
  sequence: 1,
  name: '',
  plan: '',
  realization: '',
  planTarget: 100,
  progress: 0,
  status: 'PLAN',
  notes: '',
<<<<<<< HEAD
  deadline: '',
  picId: '',
=======
  evidenceUrl: '',
  evidenceName: '',
  evidenceMime: '',
  evidenceSize: undefined,
  driveFileId: '',
  driveWebViewLink: '',
>>>>>>> ea15c98 (ini ketinggalan)
};

interface ProgramKerjaFormModalProps {
  program: ProgramKerjaDTO | null;
  picUsers: PicUserOption[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProgramKerjaFormModal({ program, picUsers, onClose, onSaved }: ProgramKerjaFormModalProps) {
  const [form, setForm] = useState<FormState>(
    program
      ? {
          year: program.year,
          category: program.category,
          sequence: program.sequence,
          name: program.name,
          plan: program.plan ?? '',
          realization: program.realization ?? '',
          planTarget: program.planTarget,
          progress: program.progress,
          status: program.status,
          notes: program.notes ?? '',
<<<<<<< HEAD
          deadline: program.deadline?.slice(0, 10) ?? '',
          picId: program.picId ?? '',
=======
          evidenceUrl: program.evidenceUrl ?? '',
          evidenceName: program.evidenceName ?? '',
          evidenceMime: program.evidenceMime ?? '',
          evidenceSize: program.evidenceSize ?? undefined,
          driveFileId: program.driveFileId ?? '',
          driveWebViewLink: program.driveWebViewLink ?? '',
>>>>>>> ea15c98 (ini ketinggalan)
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.status === 'BELUM_TEREALISASI' && !form.notes.trim()) {
      setError('Program tidak terealisasi wajib disertai catatan alasan.');
      return;
    }
<<<<<<< HEAD
    if (!Number.isInteger(form.progress) || form.progress < 0 || form.progress > 100) {
      setError('Progress harus berupa angka bulat 0–100%.');
      return;
    }
    if (!Number.isInteger(form.planTarget) || form.planTarget < 0 || form.planTarget > 100) {
      setError('Target Plan harus berupa angka bulat 0–100%.');
      return;
    }

=======
    // Bukti/evidence wajib saat progress > 0 atau status realisasi/on-progress
    const needsEvidence = form.progress > 0 || form.status === 'REALISASI' || form.status === 'ON_PROGRESS';
    if (needsEvidence && !form.driveFileId && !form.driveWebViewLink && !form.evidenceUrl) {
      setError('Bukti/evidence wajib dilampirkan untuk program dengan progress atau realisasi.');
      return;
    }
>>>>>>> ea15c98 (ini ketinggalan)
    setSaving(true);
    try {
      const payload = {
        ...form,
        plan: form.plan.trim() || undefined,
        realization: form.realization.trim() || undefined,
        notes: form.notes.trim() || undefined,
<<<<<<< HEAD
        deadline: form.deadline || null,
        picId: form.picId || null,
=======
        evidenceUrl: form.evidenceUrl || undefined,
        evidenceName: form.evidenceName || undefined,
        evidenceMime: form.evidenceMime || undefined,
        evidenceSize: form.evidenceSize || undefined,
        driveFileId: form.driveFileId || undefined,
        driveWebViewLink: form.driveWebViewLink || undefined,
>>>>>>> ea15c98 (ini ketinggalan)
      };
      const result = program
        ? await updateProgramKerjaAction({ id: program.id, ...payload })
        : await createProgramKerjaAction(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      eyebrow={program ? 'Perbarui Data' : 'Program Baru'}
      title={program ? program.name : 'Tambah Program Kerja'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-[#CBD7E6] px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" form="program-kerja-form" disabled={saving} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#123B6D] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F315A] disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {program ? 'Simpan Perubahan' : 'Tambah Program'}
          </button>
        </div>
      }
    >
      <form id="program-kerja-form" onSubmit={handleSubmit} className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Tahun</label>
            <input type="number" className="field w-full" value={form.year} min={2020} max={2100} onChange={(e) => set('year', Number(e.target.value))} required />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">No. Urut</label>
            <input type="number" className="field w-full" value={form.sequence} min={1} max={999} onChange={(e) => set('sequence', Number(e.target.value))} required />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Kategori</label>
            <select className="field w-full" value={form.category} onChange={(e) => set('category', e.target.value as ProgramKerjaCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Nama Program</label>
          <input type="text" className="field w-full" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nama Program Kerja" required minLength={3} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">PIC / Penanggung Jawab</label>
            <select className="field w-full" value={form.picId} onChange={(e) => set('picId', e.target.value)}>
              <option value="">Belum ditugaskan</option>
              {picUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · @{user.username} ({user.role})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Deadline</label>
            <input type="date" className="field w-full" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Plan (P)</label>
            <input type="text" className="field w-full" value={form.plan} onChange={(e) => set('plan', e.target.value)} placeholder="Deskripsi rencana (opsional)" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Realisasi (R)</label>
            <input type="text" className="field w-full" value={form.realization} onChange={(e) => set('realization', e.target.value)} placeholder="Deskripsi realisasi (opsional)" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Target P (%)</label>
            <input type="number" className="field w-full" value={form.planTarget} min={0} max={100} onChange={(e) => set('planTarget', Number(e.target.value))} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="program-progress" className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Progress Program Kerja</label>
              <span className="text-lg font-black tabular-nums text-[#0066B3]" aria-live="polite">{form.progress}%</span>
            </div>
            <input
              id="program-progress"
              type="range"
              value={form.progress}
              min={0}
              max={100}
              step={1}
              aria-label="Progress Program Kerja"
              onChange={(event) => set('progress', Number(event.target.value))}
              className="h-5 w-full cursor-pointer accent-[#0066B3] touch-none"
            />
            <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>0%</span><span>100%</span></div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</label>
          <select className="field w-full" value={form.status} onChange={(e) => set('status', e.target.value as ProgramStatus)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

<<<<<<< HEAD
        {program && program.tasks.length > 0 && (
          <div className="rounded-xl border border-[#DCE5EF] bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
              <CheckSquare className="h-3.5 w-3.5 text-[#0066B3]" /> Checklist tersedia
=======
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              Keterangan {form.status === 'BELUM_TEREALISASI' && <span className="text-[#DC2626]">(wajib — alasan tidak terealisasi)</span>}
            </label>
            <textarea
              className="field w-full"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="cth. Kegiatan belum dapat dilaksanakan karena perubahan jadwal operasional."
            />
          </div>

          <FileUploadProof
            label="Bukti / Evidence (wajib saat progress>0 atau status REALISASI/ON_PROGRESS)"
            folderCategory="PROGRAM_KERJA"
            subCategory={form.category}
            required={form.progress > 0 || form.status === 'REALISASI' || form.status === 'ON_PROGRESS'}
            initialValue={
              form.driveFileId || form.driveWebViewLink
                ? {
                    attachmentUrl: form.driveWebViewLink || undefined,
                    attachmentName: form.evidenceName || 'Berkas Bukti',
                    driveFileId: form.driveFileId || undefined,
                    driveWebViewLink: form.driveWebViewLink || undefined,
                  }
                : undefined
            }
            onFileUploaded={(meta) => {
              if (meta) {
                setForm((f) => ({
                  ...f,
                  evidenceUrl: meta.attachmentUrl,
                  evidenceName: meta.attachmentName,
                  evidenceMime: meta.attachmentMime || '',
                  evidenceSize: meta.attachmentSize,
                  driveFileId: meta.driveFileId || '',
                  driveWebViewLink: meta.driveWebViewLink || '',
                }));
              } else {
                setForm((f) => ({
                  ...f,
                  evidenceUrl: '',
                  evidenceName: '',
                  evidenceMime: '',
                  evidenceSize: undefined,
                  driveFileId: '',
                  driveWebViewLink: '',
                }));
              }
            }}
          />

          {error && (
            <div className="text-xs font-semibold text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
>>>>>>> ea15c98 (ini ketinggalan)
            </div>
            <div className="space-y-1.5">
              {program.tasks.map((task) => <div key={task.id} className="flex items-center gap-2 text-[11px] text-slate-600"><span className={`h-1.5 w-1.5 rounded-full ${task.isDone ? 'bg-emerald-500' : 'bg-slate-300'}`} />{task.label}</div>)}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Keterangan {form.status === 'BELUM_TEREALISASI' && <span className="text-[#DC2626]">(wajib — alasan tidak terealisasi)</span>}</label>
          <textarea className="field w-full" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Catatan Program Kerja" />
        </div>

        {program && <p className="text-[10px] text-slate-400">Terakhir diperbarui: {new Date(program.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>}
      </form>
    </Modal>
  );
}
