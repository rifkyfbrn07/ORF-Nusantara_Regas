'use client';

import React, { useState } from 'react';
import { Check, X, UserCheck, ArrowLeftRight, AlertCircle, CheckCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { reviewLeaveAction } from '@/server/actions/leaveActions';
import { reviewShiftExchangeAction } from '@/server/actions/shiftExchangeActions';
import { useRouter } from 'next/navigation';

export interface ManagerLeaveRequestItem {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  reviewerNote?: string | null;
  user: {
    id?: string;
    name: string;
    employeeId: string;
  };
  reviewedBy?: {
    id?: string;
    name: string;
    position?: string | null;
  } | null;
}

export interface ManagerShiftExchangeItem {
  id: string;
  status: string;
  targetDate: string;
  reason: string;
  requester: {
    id?: string;
    name: string;
    employeeId?: string | null;
    position?: string | null;
  };
  targetUser: {
    id?: string;
    name: string;
    employeeId?: string | null;
    position?: string | null;
  };
  requesterSchedule: {
    id: string;
    date: string;
    shift: {
      id: string;
      name: string;
    };
  };
}

interface ManagerRequestsClientProps {
  leaveRequests: ManagerLeaveRequestItem[];
  shiftExchanges: ManagerShiftExchangeItem[];
  defaultTab: 'leave' | 'shift';
}

export function ManagerRequestsClient({
  leaveRequests,
  shiftExchanges,
  defaultTab,
}: ManagerRequestsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'leave' | 'shift'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Review Modal State
  const [reviewItem, setReviewItem] = useState<{
    id: string;
    type: 'leave' | 'shift';
    decision: 'APPROVED' | 'REJECTED';
    title: string;
  } | null>(null);
  const [reviewerNote, setReviewerNote] = useState('');

  const handleOpenReview = (id: string, type: 'leave' | 'shift', decision: 'APPROVED' | 'REJECTED', title: string) => {
    setReviewItem({ id, type, decision, title });
    setReviewerNote('');
    setError(null);
  };

  const handleConfirmReview = async () => {
    if (!reviewItem) return;
    setLoading(true);
    setError(null);

    try {
      if (reviewItem.type === 'leave') {
        const res = await reviewLeaveAction({
          requestId: reviewItem.id,
          status: reviewItem.decision,
          reviewerNote: reviewerNote.trim() || undefined,
        });
        if (!res.success) throw new Error(res.error);
        setSuccess(`Pengajuan cuti/izin berhasil di-${reviewItem.decision === 'APPROVED' ? 'setujui' : 'tolak'}.`);
      } else {
        const res = await reviewShiftExchangeAction({
          exchangeId: reviewItem.id,
          status: reviewItem.decision,
          reviewerNote: reviewerNote.trim() || undefined,
        });
        if (!res.success) throw new Error(res.error);
        setSuccess(`Permintaan tukar shift berhasil di-${reviewItem.decision === 'APPROVED' ? 'setujui dan jadwal otomatis diperbarui' : 'tolak'}.`);
      }

      setReviewItem(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memproses keputusan.');
    } finally {
      setLoading(false);
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('leave')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'leave'
              ? 'bg-[#123E7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Pengajuan Cuti & Izin ({leaveRequests.filter((r) => r.status === 'PENDING').length} Baru)</span>
        </button>

        <button
          onClick={() => setTab('shift')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'shift'
              ? 'bg-[#123E7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>Pergantian Shift ({shiftExchanges.filter((s) => s.status === 'PENDING').length} Baru)</span>
        </button>
      </div>

      {/* Leave Requests Tab */}
      {tab === 'leave' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Jenis</th>
                  <th className="px-5 py-3">Periode Tanggal</th>
                  <th className="px-5 py-3">Alasan</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Catatan Reviewer</th>
                  <th className="px-5 py-3 text-right">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      Belum ada permohonan cuti atau izin.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{r.user.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{r.user.employeeId}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800 uppercase px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                          {r.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                        {r.startDate} s/d {r.endDate}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs text-slate-700">
                        {r.reason}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-slate-500 italic max-w-xs">
                        {r.reviewerNote ? `"${r.reviewerNote}" (${r.reviewedBy?.name || 'Manager'})` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenReview(r.id, 'leave', 'APPROVED', `${r.user.name} (${r.type})`)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                            >
                              <Check className="h-3 w-3" />
                              <span>Setujui</span>
                            </button>
                            <button
                              onClick={() => handleOpenReview(r.id, 'leave', 'REJECTED', `${r.user.name} (${r.type})`)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                            >
                              <X className="h-3 w-3" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift Exchanges Tab */}
      {tab === 'shift' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Pemohon</th>
                  <th className="px-5 py-3">Jadwal Pemohon</th>
                  <th className="px-5 py-3">Operator Tujuan</th>
                  <th className="px-5 py-3">Tanggal Tujuan</th>
                  <th className="px-5 py-3">Alasan</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {shiftExchanges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      Belum ada permohonan tukar shift.
                    </td>
                  </tr>
                ) : (
                  shiftExchanges.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{ex.requester.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{ex.requester.employeeId}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span className="font-bold text-slate-800">{ex.requesterSchedule.date}</span>
                        <div className="text-[11px] text-slate-500">{ex.requesterSchedule.shift.name}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{ex.targetUser.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{ex.targetUser.employeeId}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                        {ex.targetDate}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs text-slate-700">
                        {ex.reason}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={ex.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {ex.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenReview(ex.id, 'shift', 'APPROVED', `Tukar shift ${ex.requester.name} ↔ ${ex.targetUser.name}`)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                            >
                              <Check className="h-3 w-3" />
                              <span>Setujui</span>
                            </button>
                            <button
                              onClick={() => handleOpenReview(ex.id, 'shift', 'REJECTED', `Tukar shift ${ex.requester.name} ↔ ${ex.targetUser.name}`)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                            >
                              <X className="h-3 w-3" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Konfirmasi {reviewItem.decision === 'APPROVED' ? 'Persetujuan' : 'Penolakan'}
              </h3>
              <button onClick={() => setReviewItem(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Anda akan <b>{reviewItem.decision === 'APPROVED' ? 'menyetujui' : 'menolak'}</b> permohonan untuk: <br />
              <span className="text-slate-900 font-bold">{reviewItem.title}</span>
            </p>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Manager (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Contoh: Disetujui, pastikan handover aman..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReview}
                  disabled={loading}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition ${
                    reviewItem.decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {loading ? 'Memproses...' : `Ya, ${reviewItem.decision === 'APPROVED' ? 'Setujui' : 'Tolak'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
