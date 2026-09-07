'use client';

import React, { useState } from 'react';
import { Plus, ArrowLeftRight, CheckCircle, AlertCircle, Send, X } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { submitShiftExchangeAction } from '@/server/actions/shiftExchangeActions';
import { useRouter } from 'next/navigation';

export interface ShiftExchangeItem {
  id: string;
  status: string;
  reason: string;
  targetDate: string;
  requester: {
    id?: string;
    name: string;
    employeeId?: string | null;
  };
  targetUser: {
    id?: string;
    name: string;
    employeeId?: string | null;
  };
  requesterSchedule: {
    id: string;
    date: string;
    shift: {
      id: string;
      name: string;
      startTime?: string;
      endTime?: string;
    };
  };
}

export interface ScheduleItem {
  id: string;
  date: string;
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
}

export interface PeerOperatorItem {
  id: string;
  name: string;
  employeeId?: string | null;
  position?: string | null;
}

interface OperatorShiftExchangeClientProps {
  initialExchanges: ShiftExchangeItem[];
  mySchedules: ScheduleItem[];
  peerOperators: PeerOperatorItem[];
  today: string;
}

export function OperatorShiftExchangeClient({
  initialExchanges,
  mySchedules,
  peerOperators,
  today,
}: OperatorShiftExchangeClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    requesterScheduleId: mySchedules[0]?.id || '',
    targetUserId: peerOperators[0]?.id || '',
    targetDate: today,
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await submitShiftExchangeAction(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal mengajukan pergantian shift.');
    } else {
      setSuccess('Permintaan pergantian shift berhasil diajukan dan menunggu persetujuan Manager.');
      setShowModal(false);
      setFormData({
        requesterScheduleId: mySchedules[0]?.id || '',
        targetUserId: peerOperators[0]?.id || '',
        targetDate: today,
        reason: '',
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

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-[#0F2F63] uppercase tracking-wider">
          Daftar Pengajuan Tukar Shift
        </h3>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="h-4 w-4" />
          <span>Ajukan Tukar Shift</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {initialExchanges.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada permohonan pergantian shift yang tercatat.
            </div>
          ) : (
            initialExchanges.map((ex) => (
              <div key={ex.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span>{ex.requester.name}</span>
                    <ArrowLeftRight className="h-3.5 w-3.5 text-[#1D5FA7]" />
                    <span>{ex.targetUser.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Jadwal Asal: {ex.requesterSchedule.date} ({ex.requesterSchedule.shift.name}) ↔ Target: {ex.targetDate}
                  </div>
                  <p className="text-xs text-slate-700 pt-0.5">
                    Alasan: &ldquo;{ex.reason}&rdquo;
                  </p>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={ex.status} size="md" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Formulir Pergantian Shift
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
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
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Jadwal Anda yang Akan Ditukar
                </label>
                <select
                  value={formData.requesterScheduleId}
                  onChange={(e) => setFormData({ ...formData, requesterScheduleId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  {mySchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} — {s.shift.name} ({s.shift.startTime} - {s.shift.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Operator Tujuan (Rekan Dituju)
                </label>
                <select
                  value={formData.targetUserId}
                  onChange={(e) => setFormData({ ...formData, targetUserId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  {peerOperators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.employeeId || '-'} - {op.position || 'Operator'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal Target Pengganti
                </label>
                <input
                  type="date"
                  required
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Alasan Pergantian Shift
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Contoh: Menghadiri keperluan keluarga mendesak..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold bg-[#123E7A] hover:bg-[#0F2F63] text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{loading ? 'Mengirim...' : 'Kirim Permintaan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

