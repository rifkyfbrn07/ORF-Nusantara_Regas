'use client';
/* eslint-disable @next/next/no-img-element -- authenticated runtime evidence URLs cannot use Next image optimization. */

import { Download, Eye, FileText, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

export interface EvidenceFile {
  fileId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  legacyUrl?: string | null;
  uploadedAt?: string | Date | null;
  uploadedBy?: string | null;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return 'Ukuran tidak diketahui';
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function legacyUrl(url?: string | null) {
  if (!url || (!url.startsWith('/uploads/') && !/^https:\/\//i.test(url))) return null;
  return url;
}

export function EvidenceViewer({ file, label = 'Lihat Bukti', className }: { file: EvidenceFile; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const isLocalFallback = file.fileId?.startsWith('local_');
  const source = file.fileId && !isLocalFallback ? `/api/files/${encodeURIComponent(file.fileId)}` : legacyUrl(file.legacyUrl);
  const downloadUrl = file.fileId && !isLocalFallback ? `${source}?download=1` : source;
  const mime = file.mimeType || '';
  const image = mime.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.fileName || '');
  const pdf = mime === 'application/pdf' || /\.pdf$/i.test(file.fileName || '');

  return <>
    <button type="button" onClick={() => setOpen(true)} className={className || 'inline-flex items-center gap-1 rounded-md border border-[#CBD7E6] px-2 py-1 text-[10px] font-bold text-[#0066B3] hover:bg-[#EAF4FC]'}>
      {image ? <ImageIcon className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {label}
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title={file.fileName || 'Bukti Dokumen'} eyebrow="DOCUMENT VIEWER" size="2xl" bodyClassName="p-0">
      <div className="flex min-h-[45dvh] items-center justify-center bg-slate-100 p-3 sm:min-h-[62dvh]">
        {!source ? <div className="max-w-sm rounded-xl border border-rose-200 bg-white p-5 text-center text-sm text-rose-700"><FileText className="mx-auto mb-2 h-7 w-7" />Dokumen tidak dapat dibuka. File lama tidak memiliki lokasi penyimpanan yang valid.</div>
          : image ? <img src={source} alt={file.fileName || 'Bukti dokumen'} className="max-h-[70dvh] max-w-full rounded-lg object-contain shadow-sm" />
          : pdf ? <iframe src={source} title={file.fileName || 'Pratinjau PDF'} className="h-[68dvh] w-full rounded-lg border-0 bg-white" />
          : <div className="max-w-sm rounded-xl bg-white p-6 text-center shadow-sm"><FileText className="mx-auto mb-3 h-9 w-9 text-[#1769AA]" /><p className="font-bold text-slate-800">Pratinjau tidak tersedia</p><p className="mt-1 text-xs text-slate-500">Unduh file untuk membukanya dengan aplikasi yang sesuai.</p></div>}
      </div>
      <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"><p className="truncate font-bold text-slate-800">{file.fileName || 'Dokumen bukti'}</p><p>{mime || 'Tipe tidak diketahui'} · {formatBytes(file.fileSize)}{file.uploadedBy ? ` · ${file.uploadedBy}` : ''}</p></div>
      <div className="flex items-center justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Tutup</button>{downloadUrl && <a href={downloadUrl} className="inline-flex items-center gap-1.5 rounded-lg bg-[#123B6D] px-3 py-2 text-xs font-bold text-white" download><Download className="h-3.5 w-3.5" />Unduh</a>}</div>
    </Modal>
  </>;
}
