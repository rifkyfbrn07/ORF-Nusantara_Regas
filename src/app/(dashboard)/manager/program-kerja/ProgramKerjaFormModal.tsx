'use client';

import React, { useState } from 'react';
import { CheckSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProgramCategory as ProgramKerjaCategory, ProgramStatus } from '@prisma/client';
import { addProgramRealizationAction, createProgramKerjaAction, updateProgramKerjaAction } from '@/server/actions/programKerjaActions';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import { getProgramMetrics } from '@/lib/programKerjaLogic';
import { CATEGORY_LABELS, fmtNumber, fmtPercent } from './shared';

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
  deadline: string;
  picId: string;
  evidenceUrl: string;
  evidenceName: string;
  evidenceMime: string;
  evidenceSize?: number;
  driveFileId: string;
  driveWebViewLink: string;
  storageProvider: string;
  storagePath: string;
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
  deadline: '',
picId: '',
  evidenceUrl: '',
  evidenceName: '',
  evidenceMime: '',
  evidenceSize: undefined,
  driveFileId: '',
  driveWebViewLink: '',
  storageProvider: '',
  storagePath: '',
};

interface ProgramKerjaFormModalProps {
users: { id: string; name: string; username: string; position: string | null }[];
  program: ProgramKerjaDTO | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProgramKerjaFormModal({ program, users, onClose, onSaved }: ProgramKerjaFormModalProps) {
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
          deadline: program.deadline?.slice(0, 10) ?? '',
          picId: program.pic?.id ?? '',
          evidenceUrl: program.evidenceUrl ?? '',
          evidenceName: program.evidenceName ?? '',
          evidenceMime: program.evidenceMime ?? '',
          evidenceSize: program.evidenceSize ?? undefined,
          driveFileId: program.driveFileId ?? '',
          driveWebViewLink: program.driveWebViewLink ?? '',
          storageProvider: program.storageProvider ?? '',
          storagePath: program.storagePath ?? ''
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Update Progress KUMULATIF — user menambahkan N pekerjaan selesai hari ini.
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [todayNote, setTodayNote] = useState('');
  const metrics = program ? getProgramMetrics(program) : undefined;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (uploading || saving) return; // jangan double submit saat upload/simpan berlangsung
    setError(null);
    const isCreate = !program;
    if (form.status === 'BELUM_TEREALISASI' && !form.notes.trim()) {
      setError('Program tidak terealisasi wajib disertai catatan alasan.');
      return;
    }
    if (!Number.isInteger(form.planTarget) || form.planTarget < 0 || form.planTarget > 100) {
      setError('Target Plan harus berupa angka bulat 0–100%.');
      return;
    }
    if (!Number.isInteger(todayCompleted) || todayCompleted < 0) {
      setError('Jumlah realisasi hari ini harus berupa angka bulat >= 0.');
      return;
    }

    // Bukti/evidence: dijalur CREATE (aturan existing — server zod juga menerapkan);
    // dijalur UPDATE, file tetap dikirim bila di-upload maar TIDAK memblokir.
    if (isCreate) {
      const needsEvidence = form.progress > 0 || form.status === 'REALISASI' || form.status === 'ON_PROGRESS';
      if (needsEvidence && !form.driveFileId && !form.driveWebViewLink && !form.evidenceUrl && !form.storagePath) {
        setError('Bukti/evidence wajib dilampirkan untuk program dengan progress atau realisasi.');
        return;
      }
    }
    setSaving(true);
    try {
      // Metadata program — PROGRESS/STATUS TIDAK ikut terkirim (otomatis dari
      // realisation kumulatif + server), agar update progress tidak menimpa.
      const payload = {
        year: form.year,
        category: form.category,
        sequence: form.sequence,
        name: form.name,
        plan: form.plan.trim() || undefined,
        realization: form.realization.trim() || undefined,
        planTarget: form.planTarget,
        notes: form.notes.trim() || undefined,
        deadline: form.deadline || null,
        picId: form.picId || undefined,
        evidenceUrl: form.evidenceUrl || undefined,
        evidenceName: form.evidenceName || undefined,
        evidenceMime: form.evidenceMime || undefined,
        evidenceSize: form.evidenceSize || undefined,
        driveFileId: form.driveFileId || undefined,
        driveWebViewLink: form.driveWebViewLink || undefined,
        storageProvider: form.storageProvider || undefined,
        storagePath: form.storagePath || undefined,
      };
      const result = isCreate
        ? await createProgramKerjaAction({ ...payload, progress: 0, status: 'PLAN' })
        : await updateProgramKerjaAction({ id: program.id, ...payload });
      if (!result.success) {
        setError(result.error || 'Gagal menyimpan data program.');
        return;
      }
      // Update Progress KUMULATIF — menambahkan realisasi vs nilai lama (dikunci Plan).
      if (!isCreate && todayCompleted > 0) {
        const addResult = await addProgramRealizationAction({
          programId: program.id,
          amount: todayCompleted,
          note: todayNote.trim() || undefined,
        });
        if (!addResult.success) {
          setError(addResult.error || 'Gagal menambahkan realisasi hari ini.');
          return;
        }
      }
      toast.success(isCreate ? 'Data program berhasil disimpan.' : todayCompleted > 0 ? `Progress berhasil diperbarui (+${todayCompleted}).` : 'Data program berhasil diperbarui.');
      onSaved();
    } catch (error) {
      // Jangan pernah menelan error — tampilkan pesan yang jelas & log untuk debugging.
      console.error('[ProgramKerjaFormModal] simpan gagal:', error);
      setError('Gagal menyimpan perubahan. Coba lagi — jika berlanjut, hubungi administrator.');
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
          <button type="submit" form="program-kerja-form" disabled={saving || uploading} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#123B6D] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F315A] disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {program ? 'Simpan Perubahan' : 'Tambah Program'}
          </button>
        </div>
      }
    >
      <form id="program-kerja-form" onSubmit={handleSubmit} className="space-y-4 pr-1">
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

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Deadline</label>
          <input type="date" className="field w-full" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
        </div>
<div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">PIC</label>
          <select
            className="field w-full"
            value={form.picId}
            onChange={(e) => set('picId', e.target.value)}
            aria-label="PIC Program Kerja"
          >
            <option value="">Belum ditentukan</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.position ? ` — ${u.position}` : ''} ({u.username})
              </option>
            ))}
          </select>
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

        {/* UPDATE PROGRESS — KUMULATIF "Tambah Realisasi Hari Ini" (solo edit, Plan existing) */}
        {program ? (
          <div className="rounded-xl border border-[#DCE5EF] bg-[#FBFDFE] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500 mb-2">
              <CheckSquare className="h-3.5 w-3.5 text-[#0066B3]" /> Update Progress (Kumulatif)
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:grid-cols-4">
              <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Plan</span><div className="font-black tabular-nums text-[#0B3568]">{metrics ? fmtNumber(metrics.plan) : '—'}</div></div>
              <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Realisasi Saat Ini</span><div className="font-black tabular-nums text-emerald-700">{metrics ? fmtNumber(metrics.realization) : '—'}</div></div>
              <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Sisa</span><div className="font-black tabular-nums text-slate-600">{metrics ? fmtNumber(metrics.remaining) : '—'}</div></div>
              <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Progress</span><div className="font-black tabular-nums text-[#F58220]">{metrics ? `${fmtPercent(metrics.progress)}%` : '—'}</div></div>
            </div>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[1fr_2fr]">
              <div>
                <label htmlFor="today-completed" className="mb-0.5 block text-[9.5px] font-bold uppercase tracking-wide text-slate-500">Realisasi Hari Ini <span className="text-emerald-600">+</span></label>
                <input id="today-completed" type="number" className="field w-full" value={todayCompleted} min={0} max={9999} step={1} onChange={(e) => setTodayCompleted(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                {metrics && metrics.remaining <= 0 && <p className="mt-0.5 text-[9.5px] font-semibold text-amber-600">Program sudah terealisasi penuh — jangan menambahkan realisasi.</p>}
              </div>
              <div>
                <label htmlFor="today-note" className="mb-0.5 block text-[9.5px] font-bold uppercase tracking-wide text-slate-500">Catatan Update (opsional)</label>
                <input id="today-note" type="text" className="field w-full" value={todayNote} onChange={(e) => setTodayNote(e.target.value)} placeholder="cth. +1 pekerjaan selesai hari ini" />
              </div>
            </div>
            <p className="mt-1.5 text-[9.5px] font-semibold text-slate-400">Realisasi kumulatif: setiap simpan menambahkan jumlah di atas terhadap nilai lama (tidak pernah menimpa sebelumnya), dikunci maksimal = Plan.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#DCE5EF] bg-slate-50/60 px-3 py-2.5 text-[10.5px] text-slate-500">
            Progress/realisasi di-track setelah program dipungu via Import Excel (Plan/Realisasi per bulan) — kemudian dibuka &ldquo;Perbarui&rdquo; untuk Update Progress kumulatif.
          </div>
        )}

{program && program.tasks.length > 0 && (
          <div className="rounded-xl border border-[#DCE5EF] bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
              <CheckSquare className="h-3.5 w-3.5 text-[#0066B3]" /> Checklist tersedia
            </div>
            <div className="space-y-1.5">
              {program.tasks.map((task) => <div key={task.id} className="flex items-center gap-2 text-[11px] text-slate-600"><span className={`h-1.5 w-1.5 rounded-full ${task.isDone ? 'bg-emerald-500' : 'bg-slate-300'}`} />{task.label}</div>)}
            </div>
          </div>
        )}

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
          subCategory={form.name?.trim() || form.category}
          descriptiveName={form.name?.trim() || form.category}
          onUploadStateChange={setUploading}
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
                storageProvider: meta.storageProvider || '',
                storagePath: meta.storagePath || ''
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
                storageProvider: '',
                storagePath: '',
              }));
            }
          }}
        />

        {program && <p className="text-[10px] text-slate-400">Terakhir diperbarui: {new Date(program.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>}
      </form>
    </Modal>
  );
}
