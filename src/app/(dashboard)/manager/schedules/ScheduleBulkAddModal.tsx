'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { bulkAddSchedulesAction } from '@/server/actions/scheduleBulkActions';
import { WORK_PATTERNS, patternShiftLabel } from '@/lib/schedule/workPatterns';

interface Option {
  id: string;
  label: string;
}

interface ScheduleBulkAddModalProps {
  open: boolean;
  onClose: () => void;
  operators: Option[];
  shifts: Option[];
  locations: Option[];
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Sen' },
  { value: 2, label: 'Sel' },
  { value: 3, label: 'Rab' },
  { value: 4, label: 'Kam' },
  { value: 5, label: 'Jum' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Min' },
];

export function ScheduleBulkAddModal({ open, onClose, operators, shifts, locations }: ScheduleBulkAddModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'SINGLE_SHIFT' | 'PATTERN'>('PATTERN');
  const [operatorIds, setOperatorIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [shiftId, setShiftId] = useState('');
  const [patternKey, setPatternKey] = useState<'REGULAR' | 'FIELD'>('REGULAR');
  const [patternOffset, setPatternOffset] = useState(0);
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pattern = WORK_PATTERNS[patternKey];

  function toggleOperator(id: string) {
    setOperatorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (operatorIds.length === 0) {
      setError('Pilih minimal satu operator.');
      return;
    }
    if (!startDate || !endDate || startDate > endDate) {
      setError('Rentang tanggal tidak valid.');
      return;
    }
    setLoading(true);
    try {
      const res = await bulkAddSchedulesAction({
        operatorIds,
        startDate,
        endDate,
        locationId,
        mode,
        shiftId: mode === 'SINGLE_SHIFT' ? shiftId : undefined,
        patternKey: mode === 'PATTERN' ? patternKey : undefined,
        patternOffset: mode === 'PATTERN' ? patternOffset : undefined,
        weekdays: mode === 'SINGLE_SHIFT' ? weekdays : undefined,
        notes: notes.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSuccessMsg(`Berhasil: ${res.result.created} jadwal baru dibuat, ${res.result.updated} diperbarui.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="BULK SCHEDULE"
      title="Tambah Banyak Jadwal"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-[#CBD7E6] text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="submit"
            form="bulk-schedule-form"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#123B6D] text-white hover:bg-[#0F315A] disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Generate Jadwal
          </button>
        </div>
      }
    >
      <form id="bulk-schedule-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Mode */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: 'PATTERN', label: 'Work Pattern', desc: 'Pola kerja otomatis' },
              { key: 'SINGLE_SHIFT', label: 'Shift Sama', desc: 'Semua hari satu shift' },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`text-left px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                mode === m.key
                  ? 'border-[#0066B3] bg-[#EAF4FC] ring-1 ring-[#0066B3]/30'
                  : 'border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-black text-[#0B3568]">{m.label}</div>
              <div className="text-[10px] font-semibold text-slate-400">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Operator multi-select */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
            Operator ({operatorIds.length} dipilih)
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl border border-[#E2E8F0] bg-[#FBFDFE]">
            {operators.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => toggleOperator(op.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  operatorIds.includes(op.id)
                    ? 'bg-[#0066B3] text-white border-[#0066B3]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {op.label}
              </button>
            ))}
            {operators.length === 0 && (
              <span className="text-[11px] text-slate-400">Tidak ada operator.</span>
            )}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Tanggal Mulai</label>
            <input type="date" className="field w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Tanggal Selesai</label>
            <input type="date" className="field w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
        </div>

        {mode === 'SINGLE_SHIFT' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Shift</label>
                <select className="field w-full" value={shiftId} onChange={(e) => setShiftId(e.target.value)} required>
                  <option value="">Pilih shift...</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Lokasi</label>
                <select className="field w-full" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Hari yang dijadwalkan (kosongkan = semua hari)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() =>
                      setWeekdays((prev) =>
                        prev.includes(d.value) ? prev.filter((x) => x !== d.value) : [...prev, d.value]
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      weekdays.includes(d.value)
                        ? 'bg-[#123B6D] text-white border-[#123B6D]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Work Pattern</label>
                <select
                  className="field w-full"
                  value={patternKey}
                  onChange={(e) => {
                    setPatternKey(e.target.value as 'REGULAR' | 'FIELD');
                    setPatternOffset(0);
                  }}
                >
                  <option value="REGULAR">{WORK_PATTERNS.REGULAR.label}</option>
                  <option value="FIELD">{WORK_PATTERNS.FIELD.label}</option>
                </select>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{pattern.description}</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Titik Awal Siklus (offset)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {pattern.cycle.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPatternOffset(i)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-black border transition cursor-pointer ${
                        patternOffset === i
                          ? 'bg-[#123B6D] text-white border-[#123B6D]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {i + 1}. {patternShiftLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Catatan (opsional)</label>
          <input type="text" className="field w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="cth. Generated roster batch #1" />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs font-semibold text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
          </div>
        )}
      </form>
    </Modal>
  );
}

export function BulkAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg border border-[#0066B3] text-[#0066B3] hover:bg-[#EAF4FC] cursor-pointer whitespace-nowrap"
    >
      <CalendarPlus className="h-3.5 w-3.5" /> Tambah Banyak Jadwal
    </button>
  );
}
