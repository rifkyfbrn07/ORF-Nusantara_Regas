'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ProgramCategory as ProgramKerjaCategory, ProgramStatus } from '@prisma/client';
import {
  createProgramKerjaAction,
  updateProgramKerjaAction,
} from '@/server/actions/programKerjaActions';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';
import { Modal } from '@/components/ui/Modal';
import { CATEGORY_LABELS, STATUS_LABELS } from './shared';

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
};

interface ProgramKerjaFormModalProps {
  program: ProgramKerjaDTO | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}

export function ProgramKerjaFormModal({ program, onClose, onSaved }: ProgramKerjaFormModalProps) {
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
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.status === 'BELUM_TEREALISASI' && !form.notes.trim()) {
      setError('Program tidak terealisasi wajib disertai catatan alasan.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        plan: form.plan.trim() || undefined,
        realization: form.realization.trim() || undefined,
        notes: form.notes.trim() || undefined,
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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-[#CBD7E6] text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="program-kerja-form"
            disabled={saving}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#123B6D] text-white hover:bg-[#0F315A] disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {program ? 'Simpan Perubahan' : 'Tambah Program'}
          </button>
        </div>
      }
    >
      <form id="program-kerja-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Tahun</label>
              <input
                type="number"
                className="field w-full"
                value={form.year}
                min={2020}
                max={2100}
                onChange={(e) => set('year', Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">No. Urut</label>
              <input
                type="number"
                className="field w-full"
                value={form.sequence}
                min={1}
                max={999}
                onChange={(e) => set('sequence', Number(e.target.value))}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Kategori</label>
              <select
                className="field w-full"
                value={form.category}
                onChange={(e) => set('category', e.target.value as ProgramKerjaCategory)}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              Nama Program
            </label>
            <input
              type="text"
              className="field w-full"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="cth. Pengadaan Barton Chart"
              required
              minLength={3}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Plan (P)
              </label>
              <input
                type="text"
                className="field w-full"
                value={form.plan}
                onChange={(e) => set('plan', e.target.value)}
                placeholder="Deskripsi rencana (opsional)"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Realisasi (R)
              </label>
              <input
                type="text"
                className="field w-full"
                value={form.realization}
                onChange={(e) => set('realization', e.target.value)}
                placeholder="Deskripsi realisasi (opsional)"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Target P (%)
              </label>
              <input
                type="number"
                className="field w-full"
                value={form.planTarget}
                min={0}
                max={100}
                onChange={(e) => set('planTarget', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Realisasi (R) %
              </label>
              <input
                type="number"
                className="field w-full"
                value={form.progress}
                min={0}
                max={100}
                onChange={(e) => set('progress', Number(e.target.value))}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Status</label>
              <select
                className="field w-full"
                value={form.status}
                onChange={(e) => set('status', e.target.value as ProgramStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

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

          {error && (
            <div className="text-xs font-semibold text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
    </Modal>
  );
}
