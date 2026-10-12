'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NextCargoDTO } from '@/lib/infoOrfTypes';
import { NEXT_CARGO_STATUS_LABELS } from '@/lib/infoOrfConfig';
import { upsertNextCargoAction } from '@/server/actions/infoOrfActions';
import { TIMEZONE_JAKARTA } from '@/lib/time';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

interface Props {
  open: boolean;
  onClose: () => void;
  cargo: NextCargoDTO | null;
  onSaved: (saved: NextCargoDTO) => void;
}

function toDatetimeLocal(iso: string): string {
  const zoned = toZonedTime(new Date(iso), TIMEZONE_JAKARTA);
  return formatTz(zoned, "yyyy-MM-dd'T'HH:mm", { timeZone: TIMEZONE_JAKARTA });
}

export function NextCargoFormModal({ open, onClose, cargo, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState(cargo ? toDatetimeLocal(cargo.eta) : '');
  const [cargoCode, setCargoCode] = useState(cargo?.cargoCode || '');
  const [vesselName, setVesselName] = useState(cargo?.vesselName || '');
  const [volumeLng, setVolumeLng] = useState(cargo?.volumeLng != null ? String(cargo.volumeLng) : '');
  const [status, setStatus] = useState<'SCHEDULED' | 'DISCHARGING' | 'COMPLETED' | 'CANCELLED'>(cargo?.status || 'SCHEDULED');
  const [note, setNote] = useState(cargo?.note || '');

  async function handleSubmit() {
    setError(null);
    if (!eta) {
      setError('ETA (waktu perkiraan tiba) wajib diisi.');
      return;
    }
    if (!cargoCode.trim()) {
      setError('Kode cargo wajib diisi.');
      return;
    }
    const parsedVolume = volumeLng.trim() === '' ? null : Number(volumeLng);
    if (parsedVolume !== null && (!Number.isFinite(parsedVolume) || parsedVolume < 0)) {
      setError('Volume LNG harus berupa angka valid (≥ 0).');
      return;
    }

    setLoading(true);
    let result: Awaited<ReturnType<typeof upsertNextCargoAction>>;
    try {
      result = await upsertNextCargoAction({
        id: cargo?.id || null,
        eta: `${eta}:00+07:00`,
        cargoCode: cargoCode.trim(),
        vesselName: vesselName.trim() || null,
        volumeLng: parsedVolume,
        status,
        note: note.trim() || null,
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Gagal menyimpan Next Cargo.');
      setLoading(false);
      return;
    }
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal menyimpan Next Cargo.');
      return;
    }
    onSaved(result.cargo);
  }

  const inputCls = 'w-full rounded-lg border border-[#DCE5EF] bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-[#0077C8]';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cargo ? `Perbarui Next Cargo ${cargo.cargoCode}` : 'Tambah Next Cargo'}
      eyebrow="MASA KEDATANGAN KARGO LNG"
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#DCE5EF] px-4 py-2 text-xs font-bold text-[#5F718A] hover:bg-[#F4F9FC] transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0077C8] px-4 py-2 text-xs font-bold text-white hover:bg-[#005B9E] transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Menyimpan…' : 'Simpan Next Cargo'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Kode Cargo</label>
            <input value={cargoCode} onChange={(e) => setCargoCode(e.target.value)} placeholder="mis. LNG-2026-10-A" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">ETA (WIB)</label>
            <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Nama Vessel</label>
            <input value={vesselName} onChange={(e) => setVesselName(e.target.value)} placeholder="mis. LNG Surya" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Volume LNG (m³)</label>
            <input type="number" min="0" step="any" value={volumeLng} onChange={(e) => setVolumeLng(e.target.value)} placeholder="mis. 170000" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
              {Object.entries(NEXT_CARGO_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Catatan (opsional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Informasi tambahan kargo…" className={inputCls} />
        </div>
      </div>
    </Modal>
  );
}
