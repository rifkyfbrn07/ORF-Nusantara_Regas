'use client';

import React, { useState } from 'react';
import { Plus, Send, CheckCircle, AlertCircle, X } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { submitLeaveAction } from '@/server/actions/leaveActions';
import { useRouter } from 'next/navigation';

export interface LeaveRequestItem {
  id: string;
  type: 'LEAVE' | 'PERMISSION' | 'SICK';
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
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

  const [formData, setFormData] = useState({
    type: 'LEAVE' as 'LEAVE' | 'PERMISSION' | 'SICK',
    startDate: today,
    endDate: today,
    reason: '',
    attachmentUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await submitLeaveAction(formData);
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
      });
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#0F2F63] uppercase tracking-wider">
          Riwayat Pengajuan Saya
        </h3>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Pengajuan Baru</span>
        </button>
      </div>

      {/* Requests History List */}
      <div className="bg-white rounded-2xl border border-[#DCE6F2] shadow-xs overflow-hidden">
        <div className="divide-y divide-[#F1F5F9]">
          {initialRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">
              Belum ada permohonan yang diajukan.
            </div>
          ) : (
            initialRequests.map((r) => (
              <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-xs uppercase px-2 py-0.5 rounded-full bg-[#EAF0F8] text-[#123E7A]">
                      {r.type}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#0F2F63]">
                      {r.startDate} s/d {r.endDate}
                    </span>
                  </div>
                  <p className="text-xs text-[#172033] font-medium pt-1">
                    &ldquo;{r.reason}&rdquo;
                  </p>
                  {r.reviewerNote && (
                    <p className="text-[11px] text-[#64748B] italic">
                      Catatan Manager ({r.reviewedBy?.name || 'Superintendent'}): &ldquo;{r.reviewerNote}&rdquo;
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  <StatusBadge status={r.status} size="md" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DCE6F2] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-black text-base text-[#0F2F63]">
                Formulir Pengajuan Cuti / Izin / Sakit
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#172033]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">Jenis Pengajuan</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'LEAVE' | 'PERMISSION' | 'SICK' })}
                  className="field w-full text-xs"
                >
                  <option value="LEAVE">CUTI TAHUNAN (Annual Leave)</option>
                  <option value="PERMISSION">IZIN / DISPENSASI (Special Permission)</option>
                  <option value="SICK">SAKIT (Medical Sick Leave)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="field w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">
                  Alasan &amp; Keterangan Pengajuan
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Jelaskan alasan pengajuan secara rinci..."
                  className="field w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="button-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="button-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{loading ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
