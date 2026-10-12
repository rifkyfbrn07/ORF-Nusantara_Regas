'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Clock3, Pencil, History, ChevronRight, Info } from 'lucide-react';
import { InfoOrfDashboardDTO, InfoOrfReportDTO, NextCargoDTO } from '@/lib/infoOrfTypes';
import { formatValue } from '@/lib/infoOrfConfig';
import { formatIndonesianDate, formatJakartaDate, formatJakartaTime } from '@/lib/time';
import { getInfoOrfReportsForDateAction } from '@/server/actions/infoOrfActions';
import { InfoOrfReportView } from '@/components/infoOrf/InfoOrfReportView';
import { NextCargoPanel } from '@/components/infoOrf/NextCargoPanel';
import { InfoOrfReportFormModal } from './InfoOrfReportFormModal';
import { NextCargoFormModal } from './NextCargoFormModal';

interface Props {
  initialData: InfoOrfDashboardDTO;
}

function compareReport(a: InfoOrfReportDTO, b: InfoOrfReportDTO): number {
  return a.reportTime.localeCompare(b.reportTime);
}

function upsertReportIntoList(list: InfoOrfReportDTO[], report: InfoOrfReportDTO): InfoOrfReportDTO[] {
  const rest = list.filter((r) => r.id !== report.id);
  return [...rest, report].sort(compareReport);
}

export function InfoOrfClient({ initialData }: Props) {
  const router = useRouter();

  const [latest, setLatest] = useState<InfoOrfReportDTO | null>(initialData.latest);
  const [nextCargo, setNextCargo] = useState<NextCargoDTO | null>(initialData.nextCargo);
  const [availableDates, setAvailableDates] = useState(initialData.availableDates);
  const [totalReports, setTotalReports] = useState(initialData.totalReports);
  const [reportsByDate, setReportsByDate] = useState<Record<string, InfoOrfReportDTO[]>>({
    [initialData.selectedDate]: initialData.reportsForSelectedDate,
  });
  const [selectedDate, setSelectedDate] = useState(initialData.selectedDate);
  const [loadingDate, setLoadingDate] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);

  const [selectedReport, setSelectedReport] = useState<InfoOrfReportDTO | null>(() => {
    const forDate = initialData.reportsForSelectedDate;
    const target = initialData.latest && initialData.latest.reportDate === initialData.selectedDate ? initialData.latest : forDate[forDate.length - 1] || null;
    return target;
  });

  const [showForm, setShowForm] = useState(false);
  const [formReport, setFormReport] = useState<InfoOrfReportDTO | null>(null);
  const [showCargoForm, setShowCargoForm] = useState(false);

  const reportsForDate = useMemo(() => reportsByDate[selectedDate] || [], [reportsByDate, selectedDate]);
  const hoursWithReports = useMemo(() => reportsForDate.map((r) => r.reportHour), [reportsForDate]);

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

  const selectReport = useCallback((r: InfoOrfReportDTO) => {
    setSelectedReport(r);
    if (r.reportDate !== selectedDate) {
      setSelectedDate(r.reportDate);
      setReportsByDate((prev) => (prev[r.reportDate] ? prev : { ...prev, [r.reportDate]: [r] }));
    }
  }, [selectedDate]);

  const openAdd = useCallback(() => {
    setFormReport(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((r: InfoOrfReportDTO) => {
    setFormReport(r);
    setShowForm(true);
  }, []);

  const handleSaved = useCallback(
    (saved: InfoOrfReportDTO) => {
      setShowForm(false);
      // Perbarui cache lokal untuk tanggal terkait.
      setReportsByDate((prev) => {
        const list = prev[saved.reportDate] || [];
        const updated = upsertReportIntoList(list, saved);
        return { ...prev, [saved.reportDate]: updated };
      });
      if (!formReport) setTotalReports((t) => t + 1);
      // Update Info ORF Terakhir bila laporan ini lebih baru.
      setLatest((prev) => {
        if (!prev || prev.id === saved.id || compareReport(saved, prev) > 0) return saved;
        return prev;
      });
      setAvailableDates((prev) => {
        if (formReport) return prev;
        const existing = prev.find((d) => d.date === saved.reportDate);
        if (existing) return prev.map((d) => (d.date === saved.reportDate ? { ...d, count: d.count + 1 } : d));
        return [{ date: saved.reportDate, count: 1 }, ...prev].slice(0, 60);
      });
      if (saved.reportDate === selectedDate) setSelectedReport(saved);
      router.refresh();
    },
    [formReport, selectedDate, router]
  );

  const handleCargoSaved = useCallback(
    (saved: NextCargoDTO) => {
      setShowCargoForm(false);
      setNextCargo(saved);
      router.refresh();
    },
    [router]
  );

  return (
    <div className="space-y-6">
      {/* ===== INFO ORF TERAKHIR + NEXT CARGO ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hero Info ORF Terakhir */}
        <div className="lg:col-span-2 rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[radial-gradient(circle_at_top_right,rgba(0,119,200,0.6),transparent_60%)]" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#0077C8] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#0077C8]/20">
                <Clock3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#0077C8]">Info ORF Terakhir</p>
                {latest ? (
                  <>
                    <p className="text-2xl font-black text-[#092B57]">
                      {latest.reportHour}:00 <span className="text-sm font-bold text-[#3F5570]">WIB</span>
                    </p>
                    <p className="text-xs font-semibold text-[#5F718A]">{formatIndonesianDate(latest.reportDate)}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#5F718A]">
                      Diperbarui:{' '}
                      <span className="font-mono font-bold text-[#092B57]">
                        {formatJakartaDate(latest.updatedAt)} {formatJakartaTime(latest.updatedAt)} WIB
                      </span>{' '}
                      • oleh {latest.recordedBy?.name}
                    </p>
                  </>
                ) : (
                  <p className="text-base font-bold text-[#5F718A]">Belum ada laporan tercatat</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0077C8] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#005B9E] transition cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Tambah Laporan
              </button>
              {latest && (
                <button
                  type="button"
                  onClick={() => openEdit(latest)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE5EF] bg-white px-4 py-2.5 text-xs font-bold text-[#0077C8] hover:bg-[#F4F9FC] transition cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Terakhir
                </button>
              )}
            </div>
          </div>

          {latest && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {latest.metrics.slice(0, 3).map((m) => (
                <div key={`${m.section}-${m.key}`} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F718A]">{m.label}</p>
                  <p className="mt-1 text-xl font-black text-[#092B57] tabular-nums">
                    {formatValue(m.value)}
                    <span className="ml-1 text-[10.5px] font-bold text-[#0077C8]">{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Cargo panel terpisah */}
        <div className="lg:col-span-1 min-w-0">
          <NextCargoPanel cargo={nextCargo} onEdit={() => setShowCargoForm(true)} />
        </div>
      </div>

      {/* ===== RIWAYAT & PEMILIHAN PERIODE ===== */}
      <div className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-[#EDF2F7] pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#EDF4FB] text-[#0077C8] p-1.5">
              <History className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-[#092B57] uppercase tracking-wide">Riwayat Laporan & Pemilihan Periode</h3>
          </div>
          <span className="text-[11px] font-bold text-[#5F718A]">{totalReports} laporan tercatat</span>
        </div>

        {/* Pilih tanggal */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0077C8]" />
            <input type="date" value={selectedDate} onChange={(e) => e.target.value && loadDate(e.target.value)} className="rounded-lg border border-[#DCE5EF] bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-[#0077C8]" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableDates.slice(0, 8).map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => loadDate(d.date)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                  selectedDate === d.date ? 'bg-[#0077C8] text-white border-[#0077C8]' : 'border-[#DCE5EF] text-[#3F5570] hover:bg-[#F4F9FC]'
                }`}
              >
                {d.date} <span className="opacity-70">({d.count})</span>
              </button>
            ))}
          </div>
          {loadingDate && <span className="text-[11px] font-semibold text-[#8A9DB4] animate-pulse">Memuat…</span>}
        </div>
        {loadError && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{loadError}</p>}

        {/* Pilih jam */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#5F718A] mr-1">Jam tersedia:</span>
          {hoursWithReports.length === 0 ? (
            <span className="text-[11px] text-[#8A9DB4]">Belum ada laporan pada tanggal ini.</span>
          ) : (
            hoursWithReports.map((h) => {
              const isActive = selectedReport?.reportHour === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    const r = reportsForDate.find((x) => x.reportHour === h);
                    if (r) selectReport(r);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-black font-mono transition cursor-pointer ${
                    isActive ? 'bg-[#092B57] text-white' : 'bg-[#EDF4FB] text-[#0066B3] hover:bg-[#DCEAF6]'
                  }`}
                >
                  {h}:00
                </button>
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-[11px] text-[#5F718A]">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#0077C8]" />
          <p>
            Nilai ditampilkan <strong>sesuai laporan pada jam yang dipilih</strong> — Flow, Volume, Energy, dan metrik lain tidak dijumlahkan lintas jam.
          </p>
        </div>
      </div>

      {/* ===== DAFTAR LAPORAN TANGGAL TERPILIH ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Riwayat kronologis */}
        <div className="lg:col-span-4 min-w-0">
          <div className="rounded-2xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#5F718A]">Laporan {selectedDate}</h4>
            <div className="mt-3 space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {reportsForDate.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#CBD8E6] p-6 text-center">
                  <p className="text-xs font-bold text-[#3F5570]">Belum ada laporan.</p>
                  <button type="button" onClick={openAdd} className="mt-2 text-[11px] font-bold text-[#0077C8] hover:underline cursor-pointer">
                    + Tambah laporan jam pertama
                  </button>
                </div>
              )}
              {reportsForDate.map((r) => {
                const active = selectedReport?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => selectReport(r)}
                    className={`rounded-xl border p-3 cursor-pointer transition ${
                      active ? 'border-[#0077C8] bg-[#EDF4FB] shadow-xs' : 'border-[#E2E8F0] bg-white hover:border-[#A9C8E6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-9 w-9 rounded-lg flex items-center justify-center font-black font-mono text-xs ${active ? 'bg-[#0077C8] text-white' : 'bg-[#EDF4FB] text-[#0066B3]'}`}>
                          {r.reportHour}
                        </span>
                        <div>
                          <p className="text-xs font-black text-[#092B57]">{r.reportHour}:00 WIB</p>
                          <p className="text-[10px] font-semibold text-[#5F718A]">
                            {formatJakartaDate(r.updatedAt)} {formatJakartaTime(r.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 ${active ? 'text-[#0077C8]' : 'text-[#A9B8C9]'}`} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[10px] text-[#5F718A] truncate">
                        {r.metrics.length} metrik • {r.lines.length} line • {r.recordedBy?.name}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(r);
                        }}
                        className="text-[10px] font-black text-[#0077C8] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail laporan terpilih */}
        <div className="lg:col-span-8 min-w-0">
          <InfoOrfReportView
            report={selectedReport}
            emptyMessage="Pilih jam pada daftar di samping untuk melihat laporannya."
          />
        </div>
      </div>

      {/* Modals */}
      <InfoOrfReportFormModal
        key={`${showForm ? 'open' : 'closed'}-${formReport?.id || selectedDate}-${nextCargo?.id || ''}`}
        open={showForm}
        onClose={() => setShowForm(false)}
        report={formReport}
        defaultDate={selectedDate}
        nextCargo={nextCargo}
        onSaved={handleSaved}
      />
      <NextCargoFormModal
        key={`${showCargoForm ? 'open' : 'closed'}-${nextCargo?.id || ''}`}
        open={showCargoForm}
        onClose={() => setShowCargoForm(false)}
        cargo={nextCargo}
        onSaved={handleCargoSaved}
      />
    </div>
  );
}
