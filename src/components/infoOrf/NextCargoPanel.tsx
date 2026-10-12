// ============================================================================
// NextCargoPanel — panel Info Next Cargo (entitas terpisah dari laporan jam).
// ETA / kode cargo hanya berubah lewat mekanisme pembaruan (upsert), bukan
// otomatis berubah setiap jam.
// ============================================================================

import React from 'react';
import { Ship, Pencil, CalendarClock, PackageSearch } from 'lucide-react';
import { NextCargoDTO } from '@/lib/infoOrfTypes';
import { NEXT_CARGO_STATUS_LABELS } from '@/lib/infoOrfConfig';
import { formatIndonesianDate, formatJakartaTime } from '@/lib/time';

interface Props {
  cargo: NextCargoDTO | null;
  onEdit?: () => void;
}

function statusStyle(status: string) {
  switch (status) {
    case 'DISCHARGING':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-[#EAF4FC] text-[#0066B3] border-[#BBDFF5]';
  }
}

export function NextCargoPanel({ cargo, onEdit }: Props) {
  return (
    <div className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#EDF2F7] pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[#EDF4FB] text-[#0077C8] p-1.5">
            <Ship className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-black text-[#092B57] uppercase tracking-wide">Next Cargo</h3>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE5EF] px-3 py-1.5 text-[11px] font-bold text-[#0077C8] hover:bg-[#F4F9FC] transition cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" /> Perbarui
          </button>
        )}
      </div>

      {!cargo ? (
        <div className="py-8 text-center">
          <PackageSearch className="h-9 w-9 mx-auto text-[#9FB3C8]" />
          <p className="mt-2 text-xs font-bold text-[#3F5570]">Belum ada data Next Cargo.</p>
          {onEdit && <p className="mt-1 text-[11px] text-[#5F718A]">Gunakan tombol Perbarui untuk mencatat kargo berikutnya.</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-black text-[#092B57] text-lg">{cargo.cargoCode}</span>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black ${statusStyle(cargo.status)}`}>
              {NEXT_CARGO_STATUS_LABELS[cargo.status] || cargo.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F718A] flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> ETA
              </p>
              <p className="mt-1 text-sm font-black text-[#092B57]">{formatIndonesianDate(cargo.eta)}</p>
              <p className="text-[11px] font-bold text-[#0077C8] font-mono">{formatJakartaTime(cargo.eta)} WIB</p>
            </div>
            {cargo.vesselName && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F718A]">Vessel</p>
                <p className="mt-1 text-sm font-black text-[#092B57]">{cargo.vesselName}</p>
              </div>
            )}
            {cargo.volumeLng != null && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F718A]">Volume LNG</p>
                <p className="mt-1 text-sm font-black text-[#092B57] tabular-nums">{cargo.volumeLng.toLocaleString('id-ID')} m³</p>
              </div>
            )}
          </div>

          {cargo.note && <p className="text-[11px] font-semibold text-[#5F718A] leading-relaxed">{cargo.note}</p>}

          <p className="text-[10.5px] text-[#8A9DB4]">
            Diperbarui oleh: <span className="font-bold text-[#3F5570]">{cargo.lastUpdatedBy?.name || '—'}</span>
            {' • '}
            <span className="font-mono">
              {formatIndonesianDate(cargo.updatedAt)} {formatJakartaTime(cargo.updatedAt)} WIB
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
