'use client';

import React, { useState } from 'react';
import { Plus, Send, CheckCircle, AlertCircle, X, FileText, ExternalLink, Paperclip } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import { submitLeaveAction } from '@/server/actions/leaveActions';
import { useRouter } from 'next/navigation';

export interface LeaveRequestItem {
  id: string;
  type: 'LEAVE' | 'PERMISSION' | 'SICK';
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  reviewerNote?: string | null;
  reviewedBy?: { name: string } | null;
}

interface OperatorRequestsClientProps {
  initialRequests: LeaveRequestItem[];
  today: string;
}

export function OperatorRequestsClient({
  initialRequests,
  today,
}: OperatorRequestsClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Proof Viewer Modal State
  const [previewItem, setPreviewItem] = useState<LeaveRequestItem | null>(null);

  const [formData, setFormData] = useState({
    type: 'LEAVE' as 'LEAVE' | 'PERMISSION' | 'SICK',
    startDate: today,
    endDate: today,
    reason: '',
    attachmentUrl: '',
    attachmentName: '',
    attachmentMime: '',
    attachmentSize: undefined as number | undefined,
    driveFileId: '',
    driveWebViewLink: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bukti/surat wajib client-side (server juga validera via zod)
    const hasProof = Boolean(formData.attachmentUrl || formData.driveWebViewLink || formData.driveFileId);
    if (!hasProof) {
      setError('Bukti surat wajib dilampirkan untuk pengajuan ini.');
      return;
    }

    setLoading(true);

    const res = await submitLeaveAction({
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      attachmentUrl: formData.attachmentUrl || undefined,
      attachmentName: formData.attachmentName || undefined,
      attachmentMime: formData.attachmentMime || undefined,
      attachmentSize: formData.attachmentSize || undefined,
      driveFileId: formData.driveFileId || undefined,
      driveWebViewLink: formData.driveWebViewLink || undefined,
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal mengirimkan pengajuan.');
    } else {
      setSuccess('Pengajuan berhasil dikirimkan ke Manager untuk ditinjau.');
      setShowModal(false);
      setFormData({
        type: 'LEAVE',
        startDate: today,
        endDate: today,
        reason: '',
        attachmentUrl: '',
        attachmentName: '',
        attachmentMime: '',
        attachmentSize: undefined,
        driveFileId: '',
        driveWebViewLink: '',
      });
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between anim-fade">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#0B3568] uppercase tracking-wider">
          Riwayat Pengajuan Saya
        </h3>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#0B3568] hover:bg-[#092B57] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Pengajuan Baru</span>
        </button>
      </div>

      {/* Requests History List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {initialRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada permohonan yang diajukan.
            </div>
          ) : (
            initialRequests.map((r) => {
              const hasProof = Boolean(r.attachmentUrl || r.driveWebViewLink || r.driveFileId);
              return (
                <div
                  key={r.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-[11px] uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B3568] border border-blue-200/60">
                        {r.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {r.startDate} s/d {r.endDate}
                      </span>

                      {/* Evidence Status Badge */}
                      {hasProof ? (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(r)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full transition cursor-pointer"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>✓ Bukti tersedia</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Belum ada bukti
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 font-medium pt-0.5">
                      &ldquo;{r.reason}&rdquo;
                    </p>

                    {r.reviewerNote && (
                      <p className="text-[11px] text-slate-500 italic">
                        Catatan Manager ({r.reviewedBy?.name || 'Superintendent'}): &ldquo;{r.reviewerNote}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {hasProof && (
                      <button
                        type="button"
                        onClick={() => setPreviewItem(r)}
                        className="text-xs font-bold text-[#1769AA] hover:text-[#0B3568] hover:underline cursor-pointer"
                      >
                        Lihat Bukti
                      </button>
                    )}
                    <StatusBadge status={r.status} size="md" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Formulir Pengajuan Cuti / Izin / Sakit"
        eyebrow="OPERATIONAL LEAVE & PERMISSION"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              form="leave-form"
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#0B3568] hover:bg-[#092B57] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{loading ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
            </button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="leave-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Pengajuan</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'LEAVE' | 'PERMISSION' | 'SICK',
                })
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs bg-white focus:outline-none focus:border-[#0B3568]"
            >
              <option value="LEAVE">CUTI TAHUNAN (Annual Leave)</option>
              <option value="PERMISSION">IZIN / DISPENSASI (Special Permission)</option>
              <option value="SICK">SAKIT (Medical Sick Leave)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Selesai</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Alasan &amp; Keterangan Pengajuan
            </label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Jelaskan alasan pengajuan secara rinci..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#0B3568]"
            />
          </div>

          {/* Bukti Surat Cuti — Google Drive Upload */}
          <div className="pt-2 border-t border-slate-100">
            <FileUploadProof
              label="Unggah Berkas Bukti Surat Cuti / Surat Dokter"
              folderCategory="SURAT_CUTI"
              onFileUploaded={(meta) => {
                if (meta) {
                  setFormData({
                    ...formData,
                    attachmentUrl: meta.attachmentUrl,
                    attachmentName: meta.attachmentName,
                    attachmentMime: meta.attachmentMime || '',
                    attachmentSize: meta.attachmentSize,
                    driveFileId: meta.driveFileId || '',
                    driveWebViewLink: meta.driveWebViewLink || '',
                  });
                } else {
                  setFormData({
                    ...formData,
                    attachmentUrl: '',
                    attachmentName: '',
                    attachmentMime: '',
                    attachmentSize: undefined,
                    driveFileId: '',
                    driveWebViewLink: '',
                  });
                }
              }}
            />
          </div>
        </form>
      </Modal>

      {/* Proof Viewer Modal */}
      {previewItem && (
        <Modal
          open={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title="Pratinjau Bukti Surat Cuti"
          eyebrow="DOCUMENT PREVIEW"
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              {previewItem.driveWebViewLink || previewItem.attachmentUrl ? (
                <a
                  href={previewItem.driveWebViewLink || previewItem.attachmentUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka di Google Drive</span>
                </a>
              ) : <div />}
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0B3568]" />
                <span className="font-bold text-xs text-slate-900">
                  {previewItem.attachmentName || 'Berkas Bukti Surat Cuti'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pengajuan {previewItem.type} periode {previewItem.startDate} s/d {previewItem.endDate}
              </p>
            </div>

            {/* Embedded image preview if image */}
            {(previewItem.attachmentUrl?.match(/\.(jpg|jpeg|png|webp)/i) || previewItem.attachmentMime?.startsWith('image/')) ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-80 flex items-center justify-center bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewItem.attachmentUrl || previewItem.driveWebViewLink || ''}
                  alt="Bukti Surat Cuti"
                  className="max-h-80 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <FileText className="h-8 w-8 mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-700">Berkas Dokumen PDF / Terarsip di Google Drive</p>
                <p className="text-[11px] text-slate-500">
                  Klik tombol &quot;Buka di Google Drive&quot; di bawah untuk melihat dokumen lengkap.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
