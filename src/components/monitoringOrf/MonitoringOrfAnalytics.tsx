'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search } from 'lucide-react';
import { InfoOrfReportDTO } from '@/lib/infoOrfTypes';
import { getInfoOrfReportsInRangeAction } from '@/server/actions/infoOrfActions';
import { MonitoringOrfCharts } from './MonitoringOrfCharts';
import { MonitoringOrfOverview } from './MonitoringOrfOverview';

const PAGE_SIZE = 20;

function totalFlow(report: InfoOrfReportDTO) {
  const value = report.metrics.find((metric) => metric.key === 'TOTAL_FLOW');
  return value ? `${value.value.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${value.unit}` : '—';
}

export function MonitoringOrfAnalytics({
  initialDate,
  initialReports,
  latestReport,
  canEdit,
  onEdit,
  onCreate,
}: {
  initialDate: string;
  initialReports: InfoOrfReportDTO[];
  latestReport: InfoOrfReportDTO | null;
  canEdit: boolean;
  onEdit: (report: InfoOrfReportDTO) => void;
  onCreate: () => void;
}) {
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [startHour, setStartHour] = useState('00');
  const [endHour, setEndHour] = useState('23');
  const [reports, setReports] = useState(initialReports);
  const [page, setPage] = useState(0);
  const [selectedReport, setSelectedReport] = useState<InfoOrfReportDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedReports = useMemo(() => {
    const merged = new Map(reports.map((report) => [report.id, report]));
    if (latestReport && latestReport.reportDate >= startDate && latestReport.reportDate <= endDate &&
        latestReport.reportHour >= startHour && latestReport.reportHour <= endHour) {
      merged.set(latestReport.id, latestReport);
    }
    return [...merged.values()].sort((a, b) => a.reportTime.localeCompare(b.reportTime));
  }, [reports, latestReport, startDate, endDate, startHour, endHour]);
  const pageCount = Math.ceil(orderedReports.length / PAGE_SIZE);
  const currentReports = orderedReports.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSelectedReport(null);
    setLoading(true);
    try {
      const result = await getInfoOrfReportsInRangeAction({ startDate, endDate, startHour, endHour });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReports(result.reports);
      setPage(0);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Gagal memuat histori Monitoring ORF.');
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = 'rounded-lg border border-[#DCE5EF] bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-[#0077C8]';

  return (
    <div className="space-y-5">
      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 rounded-xl border border-[#DCE5EF] bg-white p-4">
        <label className="text-[10px] font-bold uppercase text-[#5F718A]">
          Tanggal mulai
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${fieldClass} mt-1 block`} required />
        </label>
        <label className="text-[10px] font-bold uppercase text-[#5F718A]">
          Tanggal akhir
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={`${fieldClass} mt-1 block`} required />
        </label>
        <label className="text-[10px] font-bold uppercase text-[#5F718A]">
          Jam dari (WIB)
          <select value={startHour} onChange={(event) => setStartHour(event.target.value)} className={`${fieldClass} mt-1 block`}>
            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((hour) => <option key={hour}>{hour}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase text-[#5F718A]">
          Jam sampai (WIB)
          <select value={endHour} onChange={(event) => setEndHour(event.target.value)} className={`${fieldClass} mt-1 block`}>
            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((hour) => <option key={hour}>{hour}</option>)}
          </select>
        </label>
        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066B3] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          <Search className="h-3.5 w-3.5" /> {loading ? 'Memuat…' : 'Terapkan Filter'}
        </button>
        <p className="w-full text-[10px] text-[#73869A]">Maksimal rentang 90 hari. Filter jam berlaku setiap tanggal dalam rentang yang dipilih.</p>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}

      <MonitoringOrfCharts reports={orderedReports} />

      <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wide text-[#123D70]">Histori Laporan</h2>
            <p className="mt-1 text-[10px] text-[#73869A]">{orderedReports.length} laporan pada filter ini · data tidak dijumlahkan lintas jam.</p>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center gap-2 text-xs text-[#52677F]">
              <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded border p-1.5 disabled:opacity-40" aria-label="Halaman sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
              <span>{page + 1} / {pageCount}</span>
              <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((value) => value + 1)} className="rounded border p-1.5 disabled:opacity-40" aria-label="Halaman selanjutnya"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        {orderedReports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#BDCDDE] px-4 py-8 text-center text-xs font-semibold text-[#64758A]">Tidak ada laporan tersimpan untuk periode ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-xs">
              <thead><tr className="border-b border-[#E7EDF4] text-[10px] uppercase text-[#64758A]">
                <th className="py-2 pr-3">Tanggal</th><th className="px-2 py-2">Jam WIB</th><th className="px-2 py-2 text-right">Total Penyaluran</th><th className="px-2 py-2">Diperbarui</th><th className="px-2 py-2">Aksi</th>
              </tr></thead>
              <tbody>
                {currentReports.map((report) => (
                  <tr key={report.id} onClick={() => setSelectedReport(report)} className="cursor-pointer border-b border-[#F0F3F7] hover:bg-[#F7FAFD]">
                    <td className="py-2.5 pr-3 font-semibold text-[#183C63]">{report.reportDate}</td>
                    <td className="px-2 py-2.5 font-mono font-bold">{report.reportHour}:00</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums">{totalFlow(report)}</td>
                    <td className="px-2 py-2.5 text-[10px] text-[#64758A]">{new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.updatedAt))} WIB</td>
                    <td className="px-2 py-2.5">
                      {canEdit && <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(report); }} className="inline-flex items-center gap-1 font-bold text-[#0066B3]"><Pencil className="h-3 w-3" /> Edit</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedReport && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-[#123D70]">Detail Laporan {selectedReport.reportDate} · {selectedReport.reportHour}:00 WIB</h2>
            <button type="button" onClick={() => setSelectedReport(null)} className="text-xs font-semibold text-[#0066B3]">Tutup detail</button>
          </div>
          <MonitoringOrfOverview report={selectedReport} canEdit={canEdit} onEdit={onEdit} onCreate={onCreate} />
        </section>
      )}
    </div>
  );
}
