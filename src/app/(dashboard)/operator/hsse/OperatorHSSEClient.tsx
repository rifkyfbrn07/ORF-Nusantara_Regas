'use client';

import React, { useState } from 'react';
import { Plus, ShieldCheck, CheckCircle2, AlertCircle, Send, Check, X, Minus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { submitHSSEAction } from '@/server/actions/hsseActions';
import { useRouter } from 'next/navigation';

export interface HSSEChecklistRecord {
  id: string;
  date: string;
  shiftId: string;
  locationId: string;
  operatorId: string;
  notes?: string | null;
  status: string;
  shift: { name: string };
  location: { name: string };
  items: {
    id: string;
    itemKey: string;
    label: string;
    status: string;
    note?: string | null;
  }[];
}

export interface ShiftRef {
  id: string;
  name: string;
}

export interface LocationRef {
  id: string;
  name: string;
}

interface OperatorHSSEClientProps {
  initialChecklists: HSSEChecklistRecord[];
  shifts: ShiftRef[];
  locations: LocationRef[];
  template: { itemKey: string; label: string }[];
  today: string;
}

export function OperatorHSSEClient({
  initialChecklists,
  shifts,
  locations,
  template,
  today,
}: OperatorHSSEClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formHeader, setFormHeader] = useState({
    date: today,
    shiftId: shifts[0]?.id || '',
    locationId: locations[0]?.id || '',
    notes: '',
  });

  const [itemsState, setItemsState] = useState(
    template.map((t) => ({
      itemKey: t.itemKey,
      label: t.label,
      status: 'YES' as 'YES' | 'NO' | 'NA',
      note: 'Verified OK',
    }))
  );

  const handleItemStatusChange = (index: number, status: 'YES' | 'NO' | 'NA') => {
    const updated = [...itemsState];
    updated[index].status = status;
    setItemsState(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await submitHSSEAction({
      date: formHeader.date,
      shiftId: formHeader.shiftId,
      locationId: formHeader.locationId,
      notes: formHeader.notes.trim() || undefined,
      items: itemsState,
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal menyimpan checklist.');
    } else {
      setSuccess('Checklist keselamatan HSSE berhasil disubmit dan tercatat dalam sistem.');
      setShowModal(false);
      router.refresh();
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
          Riwayat Pengisian Checklist HSSE
        </h3>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Isi Checklist Pre-Shift</span>
        </button>
      </div>

      <div className="space-y-4">
        {initialChecklists.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#DCE6F2] text-xs text-[#64748B]">
            Belum ada formulir checklist keselamatan yang diisi.
          </div>
        ) : (
          initialChecklists.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-[#DCE6F2] shadow-xs p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-[#0F2F63]">{c.date}</span>
                    <p className="text-xs font-bold text-[#172033] mt-0.5">
                      {c.shift.name} • {c.location.name}
                    </p>
                  </div>
                </div>

                <StatusBadge status={c.status} label="COMPLETED" size="sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {c.items.map((item) => (
                  <div key={item.id} className="p-2.5 bg-[#F8FAFC] rounded-xl flex items-center justify-between gap-2 border border-[#F1F5F9]">
                    <span className="truncate text-[#172033]">{item.label}</span>
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#DCE6F2] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-base text-[#0F2F63]">
                  Formulir Checklist Keselamatan Pre-Shift
                </h3>
              </div>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formHeader.date}
                    onChange={(e) => setFormHeader({ ...formHeader, date: e.target.value })}
                    className="field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">Shift</label>
                  <select
                    value={formHeader.shiftId}
                    onChange={(e) => setFormHeader({ ...formHeader, shiftId: e.target.value })}
                    className="field w-full text-xs"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2.5 pt-1">
                <label className="text-xs font-black text-[#0F2F63] uppercase tracking-wider block">
                  Daftar Pengecekan APD &amp; Keselamatan Operasional:
                </label>

                {itemsState.map((item, idx) => (
                  <div key={item.itemKey} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] space-y-2">
                    <p className="text-xs font-bold text-[#172033]">{item.label}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(idx, 'YES')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                          item.status === 'YES'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-[#64748B] border border-[#CBD5E1]'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                        <span>YES / OK</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(idx, 'NO')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                          item.status === 'NO'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-white text-[#64748B] border border-[#CBD5E1]'
                        }`}
                      >
                        <X className="h-3 w-3" />
                        <span>NO / TEMUAN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(idx, 'NA')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                          item.status === 'NA'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-white text-[#64748B] border border-[#CBD5E1]'
                        }`}
                      >
                        <Minus className="h-3 w-3" />
                        <span>N/A</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={formHeader.notes}
                  onChange={(e) => setFormHeader({ ...formHeader, notes: e.target.value })}
                  placeholder="Catatan kondisi area, cuaca, atau perizinan khusus..."
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
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{loading ? 'Menyimpan...' : 'Submit Checklist Safety'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
