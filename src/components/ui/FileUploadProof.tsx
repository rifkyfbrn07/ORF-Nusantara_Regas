'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, FileText, ExternalLink } from 'lucide-react';
import { uploadProofFileAction } from '@/server/actions/driveUploadActions';
import { DriveFileMetadata } from '@/server/services/googleDriveService';

interface FileUploadProofProps {
  label?: string;
  folderCategory: 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA';
  departmentName?: string;
  subCategory?: string;
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
  required?: boolean;
}

export function FileUploadProof({
  label = 'Unggah Berkas Bukti (Terkoneksi Google Drive)',
  folderCategory,
  departmentName,
  subCategory,
  initialValue,
  onFileUploaded,
  required = false,
}: FileUploadProofProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<DriveFileMetadata | {
    fileName: string;
    webViewLink: string;
    isDriveStorage?: boolean;
    fileSize?: number;
  } | null>(
    initialValue?.attachmentUrl || initialValue?.driveWebViewLink
      ? {
          fileName: initialValue.attachmentName || 'Berkas Bukti',
          webViewLink: initialValue.driveWebViewLink || initialValue.attachmentUrl || '',
          isDriveStorage: Boolean(initialValue.driveFileId),
        }
      : null
  );

  const handleUpload = async (file: File) => {
    // Basic client validation
    const validMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setUploadError('Format tidak didukung. Harap pilih berkas PDF, PNG, atau JPG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran berkas melebihi batas 10 MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderCategory', folderCategory);
      if (departmentName) formData.append('departmentName', departmentName);
      if (subCategory) formData.append('subCategory', subCategory);

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
    setUploadedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileUploaded(null);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[10px] font-semibold text-slate-400">PDF, JPG, PNG (Maks 10MB)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Box */}
      {!uploadedFile && !isUploading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? 'border-[#0B3568] bg-[#0B3568]/5 scale-[0.99]'
              : 'border-slate-200 hover:border-[#1769AA] hover:bg-slate-50/70 bg-white'
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
              Otomatis diunggah &amp; diarsipkan ke struktur Google Drive ORF
            </p>
            {required && (
              <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Bukti wajib dilampirkan
              </p>
            )}
          </div>
        </div>
      )}

      {/* Uploading State */}
      {isUploading && (
        <div className="border border-blue-200 bg-blue-50/70 rounded-xl p-4 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
          <div className="text-left">
            <p className="text-xs font-bold text-[#0B3568]">Mengupload ke Google Drive...</p>
            <p className="text-[10px] text-blue-600 font-medium">Memverifikasi berkas &amp; membuat direktori</p>
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
                <span>Upload berhasil</span>
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
            {uploadedFile.webViewLink && (
              <a
                href={uploadedFile.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100 transition"
                title="Buka Pratinjau Berkas"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
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
      {uploadError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="leading-snug">{uploadError}</span>
        </div>
      )}
    </div>
  );
}
