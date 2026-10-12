// ============================================================================
// InfoOrfWidget — widget "INFO ORF TERAKHIR" untuk dashboard (server component).
// Menampilkan laporan paling mutakhir (tanggal + jam + total penyaluran) dan
// tautan ke halaman Info ORF. Tidak ada agregasi lintas jam.
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { Activity, ChevronRight } from 'lucide-react';
import { getLatestInfoOrfSummary } from '@/server/services/infoOrfService';
import { formatIndonesianDate, formatJakartaDate, formatJakartaTime } from '@/lib/time';

export async function InfoOrfWidget({ href }: { href: string }) {
  const latest = await getLatestInfoOrfSummary();

  return (
    <div className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[#1E456A] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-[#0077C8]/10 text-[#0077C8] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#0066B3] dark:text-[#38BDF8]">Info ORF Terakhir</p>
            {latest ? (
              <>
                <p className="mt-0.5 truncate text-base sm:text-lg font-black text-[#092B57] dark:text-[#F8FAFC]">
                  {latest.reportHour}:00 WIB
                  <span className="ml-2 text-xs font-bold text-[#5F718A] dark:text-[#8EA7BD]">{formatIndonesianDate(latest.reportDate)}</span>
                </p>
                <p className="text-[11px] font-semibold text-[#5F718A] dark:text-[#8EA7BD]">
                  Diperbarui:{' '}
                  <span className="font-mono font-bold">
                    {formatJakartaDate(latest.updatedAt)} {formatJakartaTime(latest.updatedAt)} WIB
                  </span>
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-sm font-bold text-[#5F718A] dark:text-[#8EA7BD]">Belum ada laporan tercatat</p>
            )}
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#0066B3] px-3.5 py-2 text-[11px] font-bold text-white hover:bg-[#005091] transition"
        >
          Buka Info ORF <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {latest && latest.metrics.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {latest.metrics.slice(0, 3).map((m) => (
            <div key={`${m.section}-${m.key}`} className="rounded-xl border border-[#E2E8F0] dark:border-[#1A3F63] bg-[#F8FAFC] dark:bg-[#0D2339] p-3">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#5F718A] dark:text-[#8EA7BD]">{m.label}</p>
              <p className="mt-1 text-lg font-black text-[#092B57] dark:text-[#F8FAFC] tabular-nums">
                {m.value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                <span className="ml-1 text-[10px] font-bold text-[#0077C8]">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
