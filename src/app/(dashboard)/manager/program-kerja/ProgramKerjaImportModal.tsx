'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  previewProgramKerjaImportAction,
  applyProgramKerjaImportAction,
  type ProgramImportPreviewPayload,
} from '@/server/actions/programKerjaImportActions';

type Kind = 'NEW' | 'UPDATED' | 'UNCHANGED' | 'CONFLICT' | 'INVALID';

const KIND_BADGE: Record<Kind, string> = {
  NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATED: 'bg-amber-50 text-amber-700 border-amber-200',
  UNCHANGED: 'bg-slate-100 text-slate-500 border-slate-200',
  CONFLICT: 'bg-purple-50 text-purple-700 border-purple-200',
  INVALID: 'bg-red-50 text-red-700 border-red-200',
};

const KIND_LABEL: Record<Kind, string> = {
  NEW: 'NEW',
  UPDATED: 'UPDATED',
  UNCHANGED: 'UNCHANGED',
  CONFLICT: 'CONFLICT',
  INVALID: 'INVALID',
};

export interface ProgramKerjaImportResult {
  created: number;
  updated: number;
  unchanged: number;
  skippedConflict: number;
  skippedInvalid: number;
  totalRecords: number;
}

export function ProgramKerjaImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ProgramImportPreviewPayload | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProgramKerjaImportResult | null>(null);

  function reset() {
    setPreview(null);
    setFileName(null);
    setError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setPreview(null);
    if (!file.name.match(/\.xlsx$/i)) {
      setError('Format file harus .xlsx');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10 MB.');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await previewProgramKerjaImportAction(formData);
      if (!res.success) {
        setError(res.error);
        setFileName(null);
        return;
      }
      setPreview(res.preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membaca file Excel.');
      setFileName(null);
    } finally {
      setLoading(false);
    }
  }
async function handleApply() {
    if (!preview) return;
    setApplying(true);
    setError(null);
    try {
      const payload = {
        year: preview.year,
        sheets: preview.sheets,
        items: preview.items.map((item) => ({
          classification: item.classification as Kind,
          category: item.category,
          sequence: item.sequence,
          name: item.name,
          notes: item.notes,
          planPeriods: item.planPeriods || [],
          realisasiPeriods: item.realisasiPeriods || [],
        })),
        fileName: preview.fileName,
        fileHash: preview.fileHash,
        fileSize: preview.fileSize,
      };
      const res = await applyProgramKerjaImportAction(payload);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setResult(res.result);
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan hasil import.');
    } finally {
      setApplying(false);
    }
  }

  const counts = preview?.counts ?? { NEW: 0, UPDATED: 0, UNCHANGED: 0, CONFLICT: 0, INVALID: 0 };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!applying) {
          onClose();
          reset();
        }
      }}
      size="lg"
      eyebrow="IMPORT EXCEL"
      title="Import Program Kerja dari Excel"
      footer={
        preview && !result ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={loading || applying}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || applying || counts.INVALID === preview.recordsTotal}
              className="px-5 py-2 text-xs font-bold bg-[#0066B3] hover:bg-[#005596] text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : null}
              Simpan Hasil Import
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Unggah workbook Program Kerja resmi (sheet <span className="font-mono text-[#0066B3]">Plan 2026</span>).
          Sel Plan dibaca dari posisi cell <b>dan</b> warna biru — cell biru kosong tetap Plan.
          Baris P/R dibedakan (P = Plan, R = Realisasi), Keterangan dibaca penuh.
        </p>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FBFE] px-4 py-8 text-xs font-bold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#0066B3]" /> Membaca workbook {fileName ? `· ${fileName}` : ''}…
          </div>
        )}

        {!loading && !preview && !fileName && !result && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#CBD7E6] bg-[#F8FBFE] px-4 py-8 text-center hover:border-[#0066B3] hover:bg-[#EAF4FC] transition">
            <FileSpreadsheet className="h-8 w-8 text-[#0066B3]" />
            <span className="text-xs font-bold text-[#0B3568]">Klik untuk memilih file .xlsx</span>
            <span className="text-[10px] font-semibold text-slate-400">Maksimal 10 MB · cell biru kosong tetap dihitung sebagai Plan</span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
        )}
{fileName && !preview && !result && !loading && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#CBD7E6] bg-[#F8FBFE] px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-[#0B3568]">
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#0066B3]" />
              <span className="truncate">{fileName}</span>
            </span>
            <button type="button" onClick={reset} className="flex shrink-0 cursor-pointer items-center gap-1 text-[10.5px] font-bold text-red-500 hover:underline">
              <Trash2 className="h-3 w-3" /> Hapus &amp; ulangi
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#DC2626]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Import selesai: {result.created} program baru, {result.updated} diperbarui, {result.unchanged} tidak berubah,
                {result.skippedInvalid} dilewati (invalid), {result.skippedConflict} dilewati (konflik).
              </span>
            </div>
            <button type="button" onClick={() => { onClose(); reset(); }} className="rounded-lg border border-[#CBD7E6] px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              Tutup
            </button>
          </div>
        )}
{preview && !result && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-black">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">{preview.recordsTotal} record · tahun {preview.year}</span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">{counts.NEW} NEW</span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">{counts.UPDATED} UPDATED</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">{counts.UNCHANGED} UNCHANGED</span>
              <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-700">{counts.CONFLICT} CONFLICT</span>
              <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-red-700">{counts.INVALID} INVALID</span>
            </div>

            {preview.blockingIssues.length > 0 && (
              <div className="max-h-24 overflow-y-auto rounded-xl border border-red-200 bg-red-50/60 px-3 py-2 text-[10.5px] font-semibold text-red-700">
                {preview.blockingIssues.slice(0, 15).map((issue, index) => (
                  <div key={index}>• {issue.sheet}!{issue.column}{issue.row}: {issue.message}</div>
                ))}
              </div>
            )}

            <div className="max-h-64 overflow-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-left text-[10.5px]">
                <thead className="bg-[#EDF4FB] sticky top-0">
                  <tr>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Status</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">No</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Program Kerja</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Pola Plan</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">P/R</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.items.slice(0, 120).map((item, index) => (
                    <tr key={`${item.name}-${index}`} className="align-top hover:bg-[#F8FBFE]">
                      <td className="px-2.5 py-1.5">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-black ${KIND_BADGE[item.classification as Kind]}`}>
                          {KIND_LABEL[item.classification as Kind]}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 font-bold tabular-nums text-slate-400">{item.sequence}</td>
                      <td className="min-w-[220px] max-w-[260px] px-2.5 py-1.5 font-semibold text-[#0B3568]">
                        {item.name}
                        {item.planCount === 0 && item.realisasiCount === 0 && (
                          <span className="mt-0.5 block text-[9px] font-bold text-red-500">Tanpa sel Plan/Realisasi</span>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 font-semibold text-[#0066B3]">{item.planPattern}</td>
                      <td className="whitespace-nowrap px-2.5 py-1.5 font-black tabular-nums text-slate-500">{item.planCount} P · {item.realisasiCount} R</td>
                      <td className="min-w-[180px] px-2.5 py-1.5 font-semibold text-slate-500">
                        {item.changes.length > 0 ? item.changes.map((change, cIndex) => <div key={cIndex}>• {change}</div>) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.items.length > 120 && (
              <p className="text-[10px] font-bold text-slate-400">Menampilkan 120 dari {preview.items.length} record pada preview.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}