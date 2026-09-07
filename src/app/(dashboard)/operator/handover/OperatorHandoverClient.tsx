'use client';

import React, { useState } from 'react';
import { Plus, CheckCircle2, AlertCircle, Send, Check, X, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { saveHandoverAction, acknowledgeHandoverAction } from '@/server/actions/handoverActions';
import { useRouter } from 'next/navigation';

export interface HandoverItem {
  id: string;
  date: string;
  shiftId: string;
  outgoingOperatorId: string;
  incomingOperatorId: string;
  operationalNotes: string;
  equipmentStatus: string;
  issues?: string | null;
  pendingTasks?: string | null;
  safetyNotes?: string | null;
  status: string;
  outgoingOperator: { name: string };
  incomingOperator: { name: string };
  shift: { name: string };
}

export interface ShiftItem {
  id: string;
  name: string;
}

export interface PeerOperatorItem {
  id: string;
  name: string;
  employeeId: string;
}

interface OperatorHandoverClientProps {
  initialHandovers: HandoverItem[];
  shifts: ShiftItem[];
  peerOperators: PeerOperatorItem[];
  today: string;
  currentUserId: string;
}

export function OperatorHandoverClient({
  initialHandovers,
  shifts,
  peerOperators,
  today,
  currentUserId,
}: OperatorHandoverClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: today,
    shiftId: shifts[0]?.id || '',
    incomingOperatorId: peerOperators[0]?.id || '',
    operationalNotes: '',
    equipmentStatus: 'Normal / All operational within standard operating parameters',
    issues: '',
    pendingTasks: '',
    safetyNotes: 'APD & SIKA terverifikasi aman',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await saveHandoverAction({
      ...formData,
      status: 'SUBMITTED',
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal menyimpan handover.');
    } else {
      setSuccess('Log serah terima shift berhasil diserahkan ke operator penerima.');
      setShowModal(false);
      router.refresh();
    }
  };

  const handleAcknowledge = async (id: string) => {
    setLoading(true);
    const res = await acknowledgeHandoverAction(id);
    setLoading(false);
    if (res.success) {
      setSuccess('Handover berhasil dikonfirmasi (Acknowledged).');
      router.refresh();
    } else {
      alert(res.error || 'Gagal mengonfirmasi');
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#0F2F63] uppercase tracking-wider">
          Log Handover Saya
        </h3>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Tulis Handover Shift</span>
        </button>
      </div>

      <div className="space-y-4">
        {initialHandovers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#DCE6F2] text-xs text-[#64748B]">
            Belum ada catatan serah terima shift.
          </div>
        ) : (
          initialHandovers.map((h) => {
            const isIncomingToMe = h.incomingOperatorId === currentUserId;
            const canAcknowledge = isIncomingToMe && h.status === 'SUBMITTED';

            return (
              <div key={h.id} className="bg-white rounded-2xl border border-[#DCE6F2] shadow-xs p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#172033]">{h.date}</span>
                      <span>•</span>
                      <span className="font-bold text-xs text-[#123E7A]">{h.shift.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-bold text-[#0F2F63]">{h.outgoingOperator.name}</span>
                      <ArrowRight className="h-3 w-3 text-[#64748B]" />
                      <span className="font-bold text-[#0F2F63]">{h.incomingOperator.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={h.status} size="sm" />
                    {canAcknowledge && (
                      <button
                        onClick={() => handleAcknowledge(h.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1.5">
                  <p className="text-[#172033] leading-relaxed font-medium">
                    <b>Catatan Operasional:</b> {h.operationalNotes}
                  </p>
                  <p className="text-[#64748B]">
                    <b>Peralatan:</b> {h.equipmentStatus}
                  </p>
                  {h.issues && <p className="text-[#F58220] font-medium"><b>Isu:</b> {h.issues}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#DCE6F2] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-black text-base text-[#0F2F63]">
                Formulir Serah Terima Shift (Handover)
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Shift</label>
                  <select
                    value={formData.shiftId}
                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                    className="field w-full text-xs"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">
                  Operator Penerima Handover (Incoming)
                </label>
                <select
                  value={formData.incomingOperatorId}
                  onChange={(e) => setFormData({ ...formData, incomingOperatorId: e.target.value })}
                  className="field w-full text-xs"
                >
                  {peerOperators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name} ({op.employeeId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">
                  Catatan Operasional Lapangan / Control Room
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.operationalNotes}
                  onChange={(e) => setFormData({ ...formData, operationalNotes: e.target.value })}
                  placeholder="Flow rate gas, tekanan inlet/outlet, scrubber, slug catcher..."
                  className="field w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">
                  Status Peralatan & Mesin Kompresor
                </label>
                <input
                  type="text"
                  required
                  value={formData.equipmentStatus}
                  onChange={(e) => setFormData({ ...formData, equipmentStatus: e.target.value })}
                  className="field w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Isu / Anomali (Opsional)</label>
                  <input
                    type="text"
                    value={formData.issues}
                    onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                    placeholder="Misal: Kalibrasi transmitter..."
                    className="field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Tugas Tertunda (Opsional)</label>
                  <input
                    type="text"
                    value={formData.pendingTasks}
                    onChange={(e) => setFormData({ ...formData, pendingTasks: e.target.value })}
                    placeholder="Misal: Cek filter F-102..."
                    className="field w-full text-xs"
                  />
                </div>
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
                  <span>{loading ? 'Menyerahkan...' : 'Serahkan Handover'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
