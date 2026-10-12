'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Calendar, Clock3, History, Info } from 'lucide-react';
import { InfoOrfDashboardDTO, InfoOrfReportDTO } from '@/lib/infoOrfTypes';
import { formatValue } from '@/lib/infoOrfConfig';
import { formatIndonesianDate, formatJakartaDate, formatJakartaTime } from '@/lib/time';
import { getInfoOrfReportsForDateAction } from '@/server/actions/infoOrfActions';
import { InfoOrfReportView } from '@/components/infoOrf/InfoOrfReportView';
import { NextCargoPanel } from '@/components/infoOrf/NextCargoPanel';

interface Props {
  initialData: InfoOrfDashboardDTO;
}

export function InfoOrfOperatorClient({ initialData }: Props) {
  const [reportsByDate, setReportsByDate] = useState<Record<string, InfoOrfReportDTO[]>>({
    [initialData.selectedDate]: initialData.reportsForSelectedDate,
  });
  const [selectedDate, setSelectedDate] = useState(initialData.selectedDate);
  const [loadingDate, setLoadingDate] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);
  const [selectedReport, setSelectedReport] = useState<InfoOrfReportDTO | null>(() => {
    const reports = initialData.reportsForSelectedDate;
    return reports[reports.length - 1] || null;
  });

  const reportsForDate = useMemo(() => reportsByDate[selectedDate] || [], [reportsByDate, selectedDate]);
  const latest = initialData.latest;

  const loadDate = useCallback(
    async (date: string) => {
      const currentRequest = ++requestId.current;
      setSelectedDate(date);
      setLoadError(null);
      setLoadingDate(false);
      const cached = reportsByDate[date];
      if (cached) {
        setSelectedReport(cached[cached.length - 1] || null);
        return;
      }

      setSelectedReport(null);
      setLoadingDate(true);
      try {
        const res = await getInfoOrfReportsForDateAction(date);
        if (currentRequest !== requestId.current) return;
        if (res.success) {
          setReportsByDate((prev) => ({ ...prev, [date]: res.reports }));
          setSelectedReport(res.reports[res.reports.length - 1] || null);
        } else {
          setLoadError(res.error || 'Gagal memuat laporan Info ORF.');
        }
      } catch (error: unknown) {
        if (currentRequest === requestId.current) {
          setLoadError(error instanceof Error ? error.message : 'Gagal memuat laporan Info ORF.');
        }
      } finally {
        if (currentRequest === requestId.current) setLoadingDate(false);
      }
    },
    [reportsByDate]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#0077C8] text-white flex items-center justify-center shrink-0">
              <Clock3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#0077C8]">Info ORF Terakhir</p>
              {latest ? (
                <>
                  <p className="text-2xl font-black text-[#092B57]">{latest.reportHour}:00 WIB</p>
                  <p className="text-xs font-semibold text-[#5F718A]">{formatIndonesianDate(latest.reportDate)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#5F718A]">
                    Diperbarui: {formatJakartaDate(latest.updatedAt)} {formatJakartaTime(latest.updatedAt)} WIB
                  </p>
                </>
              ) : (
                <p className="text-base font-bold text-[#5F718A]">Belum ada laporan tercatat</p>
              )}
            </div>
          </div>
          {latest && latest.metrics.length > 0 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {latest.metrics.slice(0, 3).map((metric) => (
                <div key={`${metric.section}-${metric.key}`} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F718A]">{metric.label}</p>
                  <p className="mt-1 text-xl font-black text-[#092B57] tabular-nums">
                    {formatValue(metric.value)}
                    <span className="ml-1 text-[10.5px] font-bold text-[#0077C8]">{metric.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <NextCargoPanel cargo={initialData.nextCargo} />
      </div>

      <div className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-[#EDF2F7] pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#EDF4FB] text-[#0077C8] p-1.5"><History className="h-4 w-4" /></div>
            <h3 className="text-sm font-black text-[#092B57] uppercase tracking-wide">Riwayat Laporan</h3>
          </div>
          <span className="text-[11px] font-bold text-[#5F718A]">{initialData.totalReports} laporan tercatat</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0077C8]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => event.target.value && loadDate(event.target.value)}
              className="rounded-lg border border-[#DCE5EF] bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-[#0077C8]"
              aria-label="Pilih tanggal laporan"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {initialData.availableDates.slice(0, 8).map((date) => (
              <button
                key={date.date}
                type="button"
                onClick={() => loadDate(date.date)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                  selectedDate === date.date ? 'bg-[#0077C8] text-white border-[#0077C8]' : 'border-[#DCE5EF] text-[#3F5570] hover:bg-[#F4F9FC]'
                }`}
              >
                {date.date} <span className="opacity-70">({date.count})</span>
              </button>
            ))}
          </div>
          {loadingDate && <span className="text-[11px] font-semibold text-[#8A9DB4] animate-pulse">Memuat…</span>}
        </div>

        {loadError && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{loadError}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#5F718A] mr-1">Jam tersedia:</span>
          {reportsForDate.length === 0 ? (
            <span className="text-[11px] text-[#8A9DB4]">Belum ada laporan pada tanggal ini.</span>
          ) : (
            reportsForDate.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReport(report)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black font-mono transition cursor-pointer ${
                  selectedReport?.id === report.id ? 'bg-[#092B57] text-white' : 'bg-[#EDF4FB] text-[#0066B3] hover:bg-[#DCEAF6]'
                }`}
              >
                {report.reportHour}:00
              </button>
            ))
          )}
        </div>

        <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-[11px] text-[#5F718A]">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#0077C8]" />
          <p>Data mengikuti laporan pada jam yang dipilih; nilai Flow, Volume, Energy, dan parameter lainnya tidak dijumlahkan lintas jam.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 min-w-0 rounded-2xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-[#5F718A]">
            Laporan {formatIndonesianDate(selectedDate)}
          </h4>
          <div className="mt-3 space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {reportsForDate.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReport(report)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedReport?.id === report.id ? 'border-[#0077C8] bg-[#EDF4FB]' : 'border-[#E2E8F0] bg-white hover:border-[#A9C8E6]'
                }`}
              >
                <span className="block text-xs font-black text-[#092B57]">{report.reportHour}:00 WIB</span>
                <span className="mt-1 block text-[10px] font-semibold text-[#5F718A]">
                  Diperbarui {formatJakartaDate(report.updatedAt)} {formatJakartaTime(report.updatedAt)}
                </span>
              </button>
            ))}
            {!loadingDate && reportsForDate.length === 0 && !loadError && (
              <p className="py-5 text-center text-xs font-bold text-[#5F718A]">Belum ada laporan.</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-8 min-w-0">
          <InfoOrfReportView report={selectedReport} emptyMessage="Pilih tanggal dan jam untuk melihat laporan." />
        </div>
      </div>
    </div>
  );
}
