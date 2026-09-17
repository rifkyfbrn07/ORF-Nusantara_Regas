'use client';

import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, FileText } from 'lucide-react';
import { uploadProofFileAction } from '@/server/actions/driveUploadActions';
import { DriveFileMetadata } from '@/server/services/googleDriveService';

interface FileUploadProofProps {
  label?: string;
  folderCategory: 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA';
  departmentName?: string;
  subCategory?: string;
  /** Tambahan untuk nama file di Drive (eg. nama program kerja). Server-side only. */
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
  } | null) => void;
  /** Notify parent form untuk disable submit saat upload berlangsung — jangan double submit. */
  onUploadStateChange?: (uploading: boolean) => void;
  required?: boolean;
}

interface PendingPreview {
  name: string;
  size: number;
  objectUrl: string | null;
  isImage: boolean;
  mime: string;
}

const VALID_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadProof({
  label = 'Unggah Berkas Bukti (Terkoneksi Google Drive)',
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PendingPreview | null>(null);
  const [uploadedFile, setUploadedFile] = useState<DriveFileMetadata | {
    fileName: string;
    webViewLink: string;
    isDriveStorage?: boolean;
    fileSize?: number;
    mimeType?: string;
  } | null>(
    initialValue?.attachmentUrl || initialValue?.driveWebViewLink
      ? {
          fileName: initialValue.attachmentName || 'Berkas Bukti',
          webViewLink: initialValue.driveWebViewLink || initialValue.attachmentUrl || '',
          isDriveStorage: Boolean(initialValue.driveFileId),
        }
      : null
  );

  // Revoke lokal object URL saat preview ganti atau component unmount.
  useEffect(() => {
    return () => {
      if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    };
  }, [preview]);
const handleUpload = async (file: File) => {
    // Jangan start upload dobel / upload saat sedang berlangsung
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

    // Preview gambar lokal (local object URL — file belum diupload ke server).
    let objectUrl: string | null = null;
    try {
      objectUrl = mime.startsWith('image/') ? URL.createObjectURL(file) : null;
    } catch {
      objectUrl = null;
    }
    setPreview({ name: file.name, size: file.size, mime, objectUrl, isImage: mime.startsWith('image/') });
    setIsUploading(true);
    setUploadError(null);
    onUploadStateChange?.(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderCategory', folderCategory);
      if (departmentName) formData.append('departmentName', departmentName);
      if (subCategory) formData.append('subCategory', subCategory);
      if (descriptiveName) formData.append('descriptiveName', descriptiveName);

      const res = await uploadProofFileAction(formData);

      if (!res.success || !res.file) {
        throw new Error(res.error || 'Upload gagal — coba lagi');
      }

      setUploadedFile(res.file);
      onFileUploaded({
        attachmentUrl: res.file.webViewLink,
        attachmentName: res.file.fileName,
        attachmentMime: res.file.mimeType,
        attachmentSize: res.file.fileSize,
        driveFileId: res.file.fileId,
        driveWebViewLink: res.file.webViewLink,
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
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
    setUploadedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileUploaded(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[10px] font-semibold text-slate-400">PDF, JPG, PNG, WEBP (Maks 10MB)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        onChange={handleFileChange}
        className="hidden"
      />
{/* Upload Box — dropzone hidden saat preview/upload/success */}
      {!uploadedFile && !isUploading && !preview && (
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
              Otomatis diunggah &amp; diarsipkan ke folder Google Drive ORF
            </p>
            {required && (
              <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Bukti wajib dilampirkan
              </p>
            )}
          </div>
        </div>
      )}

      {/* File Preview (nama, ukuran, thumbnail gambar / ikon PDF) — terlihat saat preview tersedia */}
      {preview && (isUploading || uploadedFile || uploadError) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
          {preview.isImage && preview.objectUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview.objectUrl} alt="Preview" className="h-14 w-14 shrink-0 rounded-lg object-contain border border-[#DCE5EF]" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg bg-[#0B3568]/10 p-2 text-[#0B3568]"><FileText className="h-6 w-6" /></div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">{preview.name}</p>
            <p className="text-[10px] text-slate-500">{formatBytes(preview.size)} · {preview.isImage ? 'Image' : 'PDF / Dokumen'}</p>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {isUploading && (
        <div className="border border-blue-200 bg-blue-50/70 rounded-xl p-4 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
          <div className="text-left">
            <p className="text-xs font-bold text-[#0B3568]">Mengupload ke Google Drive...</p>
            <p className="text-[10px] text-blue-600 font-medium">Memverifikasi berkas &amp; folder tujuan ({preview?.name || '...'})</p>
          </div>
        </div>
      )}

      {/* Upload Success State */}
      {uploadedFile && !isUploading && (
        <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950 truncate">
                  {uploadedFile.fileName}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-2">
                <span>Upload berhasil — Bukti tersedia</span>
                {uploadedFile.fileSize && <span>• {formatBytes(uploadedFile.fileSize)}</span>}
                {uploadedFile.isDriveStorage && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-200/70 text-emerald-900 font-bold text-[9px]">
                    Google Drive
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Ganti Berkas"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
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