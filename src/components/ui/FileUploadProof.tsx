'use client';

import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, FileText, Upload } from 'lucide-react';
import { uploadEvidenceFileAction } from '@/server/actions/evidenceUploadActions';
import type { BlobEvidenceMetadata } from '@/server/services/vercelBlobService';

export type EvidenceFolderCategory = 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA';

interface FileUploadProofProps {
  label?: string;
  folderCategory: EvidenceFolderCategory;
  departmentName?: string;
  subCategory?: string;
  /** Deskripsi tambahan untuk path di storage (eg. nama program kerja). Server-side only. */
  descriptiveName?: string;
  initialValue?: {
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    driveFileId?: string | null;
    driveWebViewLink?: string | null;
  };
  onFileUploaded: (metadata: {
    attachmentUrl: string;
    attachmentName: string;
    attachmentMime?: string;
    attachmentSize?: number;
    driveFileId?: string;
    driveWebViewLink?: string;
    storageProvider?: string;
    storagePath?: string;
  } | null) => void;
  /** Notify parent form untuk disable submit saat upload berlangsung — jangan double submit. */
  onUploadStateChange?: (uploading: boolean) => void;
  required?: boolean;
}

interface SelectedFile {
  file: File;
  name: string;
  size: number;
  mime: string;
  objectUrl: string | null;
  isImage: boolean;
}

const VALID_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB — sama dengan bodySizeLimit server actions.

const MIME_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
};

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadProof({
  label = 'Unggah Berkas Bukti (Penyimpanan Aman)',
  folderCategory,
  departmentName,
  subCategory,
  descriptiveName,
  initialValue,
  onFileUploaded,
  onUploadStateChange,
  required = false,
}: FileUploadProofProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [uploadedFile, setUploadedFile] = useState<BlobEvidenceMetadata | null>(
    initialValue?.attachmentUrl || initialValue?.driveWebViewLink
      ? {
          storageProvider: 'vercel_blob',
          storagePath: '',
          storageUrl: initialValue.driveWebViewLink || initialValue.attachmentUrl || '',
          fileName: initialValue.attachmentName || 'Berkas Bukti',
          mimeType: '',
          fileSize: 0,
          uploadedAt: new Date(),
          isDriveStorage: false,
        }
      : null
  );
// Revoke lokal object URL saat selected ganti / component unmount.
  useEffect(() => {
    return () => {
      if (selected?.objectUrl) URL.revokeObjectURL(selected.objectUrl);
    };
  }, [selected]);

  // Synthetic progress (server action tidak memberi progress callback).
  useEffect(() => {
    if (!isUploading) return;
    const timer = setInterval(() => {
      setUploadProgress((p) => {
        if (p <= 0) return 15;
        return p >= 90 ? 90 : p + 8;
      });
    }, 180);
    return () => clearInterval(timer);
  }, [isUploading]);

  const handleSelectFile = (file: File) => {
    if (isUploading) return;
    const mime = (file.type || '').toLowerCase();
    if (!VALID_MIMES.includes(mime)) {
      setUploadError('Format tidak didukung. Harap pilih berkas PDF, JPG, JPEG, PNG, atau WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError(`Ukuran berkas melebihi batas 10 MB (${formatBytes(file.size)}).`);
      return;
    }

    let objectUrl: string | null = null;
    try {
      objectUrl = mime.startsWith('image/') ? URL.createObjectURL(file) : null;
    } catch {
      objectUrl = null;
    }
    setSelected({ file, name: file.name, size: file.size, mime, objectUrl, isImage: mime.startsWith('image/') });
    setUploadError(null);
  };

  const handleConfirmUpload = async () => {
    if (!selected || isUploading) return;

    setUploadProgress(15);
    setIsUploading(true);
    setUploadError(null);
    onUploadStateChange?.(true);

    try {
      const formData = new FormData();
      formData.append('file', selected.file);
      formData.append('folderCategory', folderCategory);
      if (departmentName) formData.append('departmentName', departmentName);
      if (subCategory) formData.append('subCategory', subCategory);
      if (descriptiveName) formData.append('descriptiveName', descriptiveName);

      const res = await uploadEvidenceFileAction(formData);
      if (!res.success || !res.file) {
        throw new Error(res.error || 'Upload gagal — coba lagi');
      }

      setUploadedFile(res.file);
      setUploadProgress(100);
      onFileUploaded({
        attachmentUrl: res.file.storageUrl,
        attachmentName: res.file.fileName,
        attachmentMime: res.file.mimeType,
        attachmentSize: res.file.fileSize,
        driveFileId: res.file.storagePath,
        driveWebViewLink: res.file.storageUrl,
        storageProvider: res.file.storageProvider,
        storagePath: res.file.storagePath,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload gagal — coba lagi';
      setUploadError(msg);
      onFileUploaded(null);
    } finally {
      setIsUploading(false);
      onUploadStateChange?.(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selected?.objectUrl) URL.revokeObjectURL(selected.objectUrl);
    setSelected(null);
    setUploadedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileUploaded(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[10px] font-semibold text-slate-400">PDF, JPG, PNG, WEBP (maks 10MB)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        onChange={handleFileChange}
        className="hidden"
      />
{/* Dropzone — Pilih File */}
      {!uploadedFile && !isUploading && !selected && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className={`flex items-center justify-between rounded-xl border-2 border-dashed px-4 py-3 text-left cursor-pointer transition ${
            isDragging ? 'border-[#0088D8] bg-blue-50/60' : 'border-[#1769AA]/40 hover:border-[#1769AA]/70 bg-slate-50/70 bg-white'
          }`}
        >
          <div className="p-2 rounded-full bg-[#0B3568]/10 text-[#0B3568]">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              Tarik &amp; letakkan berkas di sini, atau <span className="text-[#1769AA] underline">Pilih File</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Disimpan aman (private) di storage server &mdash; otomatis tervalidasi
            </p>
            {required && (
              <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Bukti wajib dilampirkan
              </p>
            )}
          </div>
        </div>
      )}

      {/* Informasi file terpilih + tombol Upload */}
      {selected && !isUploading && !uploadedFile && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center gap-2.5">
            {selected.isImage && selected.objectUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={selected.objectUrl} alt="Preview" className="h-12 w-12 shrink-0 rounded-lg object-contain border border-[#DCE5EF]" />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-[#0B3568]/10 p-2 text-[#0B3568]"><FileText className="h-6 w-6" /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{selected.name}</p>
              <p className="text-[10px] text-slate-500">
                Type: {MIME_LABEL[selected.mime] || selected.mime || 'Dokumen'} &middot; Size: {formatBytes(selected.size)}
              </p>
            </div>
            <button type="button" onClick={handleClear} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer" title="Batal pilih">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleConfirmUpload}
            className="w-full flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#123B6D] px-3 py-2 text-xs font-bold text-white hover:bg-[#0F315A]"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        </div>
      )}

      {/* Preview saat upload / sukses */}
      {selected && (isUploading || uploadedFile) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
          {selected.isImage && selected.objectUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={selected.objectUrl} alt="Preview" className="h-14 w-14 shrink-0 rounded-lg object-contain border border-[#DCE5EF]" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg bg-[#0B3568]/10 p-2 text-[#0B3568]"><FileText className="h-6 w-6" /></div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">{selected.name}</p>
            <p className="text-[10px] text-slate-500">{MIME_LABEL[selected.mime] || selected.mime} · {formatBytes(selected.size)}</p>
          </div>
        </div>
      )}
{/* Uploading State + progress */}
      {isUploading && (
        <div className="border border-blue-200 bg-blue-50/70 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#0B3568]">
            <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</span>
            <span className="tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-[#1769AA] transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-[10px] text-blue-600 font-medium">Menyimpan bukti ke storage &amp; validasi format...</p>
        </div>
      )}

      {/* Upload Success */}
      {uploadedFile && !isUploading && (
        <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-950 truncate">✓ Bukti berhasil disimpan</p>
              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-2">
                <span className="truncate">{uploadedFile.fileName}</span>
                {uploadedFile.fileSize ? <span>• {formatBytes(uploadedFile.fileSize)}</span> : null}
              </p>
              <p className="text-[10px] text-emerald-600/80">Buka lewat tombol &ldquo;Lihat Surat&rdquo; / &ldquo;Lihat Bukti&rdquo; pada daftar.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
            title="Ganti Berkas"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error */}
      {uploadError && !isUploading && (
        <div className="flex items-start justify-between gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="leading-snug">{uploadError}</span>
          </div>
          <button type="button" onClick={handleClear} className="p-1 rounded-md text-rose-500 hover:text-rose-700 cursor-pointer" title="Tutup">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}