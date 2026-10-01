'use client';

import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import { submitProgramUpdateAction } from '@/server/actions/programKerjaActions';
import type { ProgramKerjaDTO, ProgramUpdateDTO } from '@/server/services/programKerjaService';

interface ProgramUpdateFormModalProps {
  program: ProgramKerjaDTO;
  onClose: () => void;
  /** Dipanggil saat update berhasil disimpan — parent langsung memperbarui Riwayat (tanpa refresh manual). */
  onSubmitted: (update: ProgramUpdateDTO) => void;
}

/** Periode default = bulan + tahun berjalan (mis. "September 2026"). */
function defaultPeriod(): string {
  const now = new Date();
  return `${now.toLocaleDateString('id-ID', { month: 'long' })} ${now.getFullYear()}`;
}

interface FileMeta {
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  storageProvider?: string;
  storagePath?: string;
}

export function ProgramUpdateFormModal({ program, onClose, onSubmitted }: ProgramUpdateFormModalProps) {
  const [period, setPeriod] = useState(defaultPeriod());
  const [notes, setNotes] = useState('');
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (uploading || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await submitProgramUpdateAction({
        programId: program.id,
        period: period.trim(),
        notes: notes.trim() || undefined,
        fileName: fileMeta?.fileName,
        mimeType: fileMeta?.mimeType,
        fileSize: fileMeta?.fileSize,
        storageProvider: fileMeta?.storageProvider,
        storagePath: fileMeta?.storagePath,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSubmitted(result.update);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim update.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Kirim Update" eyebrow="RIWAYAT UPDATE" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/60 px-3 py-2.5 text-[11px] text-slate-600">
          <span className="font-black uppercase tracking-wide text-slate-400">Program </span>
          <span className="font-bold text-[#0B3568]">{program.name}</span>
        </div>

        <div>
          <label htmlFor="update-period" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Periode Update <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="update-period"
            type="text"
            className="field w-full text-xs"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="cth. September 2026"
          />
          <p className="mt-1 text-[9.5px] font-semibold text-slate-400">Periode yang dilaporkan pada update ini (mis. September 2026).</p>
        </div>

        <div>
          <label htmlFor="update-notes" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Catatan Update
          </label>
          <textarea
            id="update-notes"
            className="field w-full"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="cth. Realisasi September telah dikirimkan beserta file pendukung."
          />
        </div>

        <FileUploadProof
          label="File Realisasi (Excel / PDF / Gambar)"
          folderCategory="PROGRAM_KERJA"
          subCategory={program.name?.trim() || program.category}
          descriptiveName={program.name?.trim() || program.category}
          onUploadStateChange={setUploading}
          onFileUploaded={(meta) => {
            setFileMeta(
              meta
                ? {
                    fileName: meta.attachmentName,
                    mimeType: meta.attachmentMime,
                    fileSize: meta.attachmentSize,
                    storageProvider: meta.storageProvider,
                    storagePath: meta.storagePath,
                  }
                : null
            );
          }}
        />

        <p className="text-[9.5px] font-semibold text-slate-400">
          Setiap update disimpan sebagai riwayat terpisah — file lama tidak akan ditimpa dan Plan program tidak berubah.
        </p>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#DC2626]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Batal
          </button>
          <button
            type="submit"
            disabled={uploading || submitting}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#123B6D] px-3 py-2 text-xs font-bold text-white hover:bg-[#0F315A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Kirim Update
          </button>
        </div>
      </form>
    </Modal>
  );
}