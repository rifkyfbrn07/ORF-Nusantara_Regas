// ============================================================================
// InfoOrfReportView — tampilan SATU laporan Info ORF (presentasional, tanpa state).
// Menampilkan nilai SESUAI laporan pada jam terpilih — TIDAK menjumlahkan
// Flow/Volume/Energy lintas jam.
// ============================================================================

import React from 'react';
import { Clock3, FileText, Activity, Gauge, Waves, Layers } from 'lucide-react';
import { InfoOrfReportDTO } from '@/lib/infoOrfTypes';
import { INFO_ORF_SECTION_LABELS, INFO_ORF_SECTION_ORDER } from '@/lib/infoOrfConfig';
import { formatIndonesianDate, formatJakartaDate, formatJakartaTime } from '@/lib/time';

interface Props {
  report: InfoOrfReportDTO | null;
  emptyMessage?: string;
  showRecordedBy?: boolean;
}

function MetricCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F718A]">{label}</p>
      <p className="mt-1 text-xl font-black text-[#092B57] tabular-nums truncate">
        {Number.isFinite(value) ? value.toLocaleString('id-ID', { maximumFractionDigits: 4 }) : '0'}
      </p>
      <p className="text-[10.5px] font-semibold text-[#0077C8]">{unit}</p>
    </div>
  );
}

export function InfoOrfReportView({ report, emptyMessage, showRecordedBy = true }: Props) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CBD8E6] bg-white p-10 text-center">
        <FileText className="h-10 w-10 mx-auto text-[#9FB3C8]" />
        <p className="mt-3 text-sm font-bold text-[#3F5570]">{emptyMessage || 'Belum ada laporan untuk periode ini.'}</p>
        <p className="mt-1 text-xs text-[#5F718A]">Nilai ditampilkan sesuai laporan pada jam yang dipilih — tidak dijumlahkan lintas jam.</p>
      </div>
    );
  }

  const sections = INFO_ORF_SECTION_ORDER.map((s) => ({
    section: s,
    label: INFO_ORF_SECTION_LABELS[s],
    metrics: report.metrics.filter((m) => m.section === s),
  }));

  return (
    <div className="space-y-4">
      {/* Header laporan */}
      <div className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#0077C8]/10 text-[#0077C8] flex items-center justify-center shrink-0">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#0077C8]">Laporan Pencatatan</p>
              <p className="text-xl font-black text-[#092B57]">
                {report.reportHour}:00 <span className="text-sm font-bold text-[#3F5570]">WIB</span>
              </p>
              <p className="text-xs font-semibold text-[#5F718A]">{formatIndonesianDate(report.reportDate)}</p>
            </div>
          </div>
          <div className="text-left sm:text-right space-y-1">
            <p className="text-[11px] font-semibold text-[#5F718A]">
              Waktu terakhir diperbarui:{' '}
              <span className="font-black text-[#092B57] font-mono">
                {formatJakartaDate(report.updatedAt)} {formatJakartaTime(report.updatedAt)} WIB
              </span>
            </p>
            {showRecordedBy && report.recordedBy && (
              <p className="text-[11px] font-semibold text-[#5F718A]">
                Dicatat oleh:{' '}
                <span className="font-black text-[#092B57]">
                  {report.recordedBy.name}
                  {report.recordedBy.position ? ` • ${report.recordedBy.position}` : ''}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sections: UP STREAM / TOTAL / FSRU */}
      {sections.map(({ section, label, metrics }) => {
        if (metrics.length === 0) return null;
        const Icon = section === 'UPSTREAM' ? Activity : section === 'FSRU' ? Waves : Layers;
        return (
          <div key={section} className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#EDF2F7] pb-3">
              <div className="rounded-lg bg-[#EDF4FB] text-[#0077C8] p-1.5">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black text-[#092B57] uppercase tracking-wide">{label}</h3>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.map((m) => (
                <MetricCard key={m.id} label={m.label} value={m.value} unit={m.unit} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Line penyaluran gas */}
      {report.lines.length > 0 && (
        <div className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#EDF2F7] pb-3">
            <div className="rounded-lg bg-[#EDF4FB] text-[#0077C8] p-1.5">
              <Gauge className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-[#092B57] uppercase tracking-wide">Line Penyaluran Gas</h3>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-[#132238]">
              <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#5F718A]">
                <tr>
                  <th className="px-3 py-2.5">LINE</th>
                  <th className="px-3 py-2.5 text-right">FLOW</th>
                  <th className="px-3 py-2.5 text-right">VOLUME</th>
                  <th className="px-3 py-2.5 text-right">ENERGY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {report.lines.map((l) => (
                  <tr key={l.id} className="hover:bg-[#F8FBFE]">
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-[#0077C8]">{l.lineCode}</span>
                      <span className="ml-2 font-semibold text-[#132238]">{l.lineName}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold tabular-nums">
                      {l.flowRate != null ? `${l.flowRate.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${l.flowUnit}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold tabular-nums">
                      {l.volume != null ? `${l.volume.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${l.volumeUnit}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold tabular-nums">
                      {l.energy != null ? `${l.energy.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${l.energyUnit}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catatan */}
      {report.note ? (
        <div className="rounded-2xl border border-[#DCE5EF] bg-[#FFFBF0] p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#B98A2F]">Catatan Laporan</p>
          <p className="mt-1 text-xs font-semibold text-[#6B5B26] leading-relaxed whitespace-pre-wrap">{report.note}</p>
        </div>
      ) : null}
    </div>
  );
}
