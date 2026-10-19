'use client';

import React, { useState, useTransition } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { MonthlyOvertimeReport } from '@/server/services/overtimeService';
import { getOvertimeReportAction } from '@/server/actions/overtimeActions';

interface OperatorOption {
  id: string;
  name: string;
  employeeId: string;
  position: string;
  role: string;
  department?: { name: string } | null;
}

interface OvertimeViewerProps {
  initialReport: MonthlyOvertimeReport;
  isManagerOrAdmin?: boolean;
  operatorList?: OperatorOption[];
  currentUserId: string;
}

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

export function OvertimeViewer({
  initialReport,
  isManagerOrAdmin = false,
  operatorList = [],
  currentUserId,
}: OvertimeViewerProps) {
  const [report, setReport] = useState<MonthlyOvertimeReport>(initialReport);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialReport.user.id);
  const [selectedYear, setSelectedYear] = useState<number>(initialReport.period.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialReport.period.month);
  const [activeTab, setActiveTab] = useState<'rekap' | 'spl'>('rekap');
  const [selectedSplIndex, setSelectedSplIndex] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  // Operator search (nama / NIP) untuk Manager/Admin
  const [operatorQuery, setOperatorQuery] = useState('');
  // Konfirmasi unduh: tampilkan operator + periode sebelum evidence diunduh
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);

  const handleFetchReport = (userId: string, year: number, month: number) => {
    startTransition(async () => {
      const res = await getOvertimeReportAction({ userId, year, month });
      if (res.success && res.report) {
        setReport(res.report);
      }
    });
  };

  const handleUserChange = (newUserId: string) => {
    setSelectedUserId(newUserId);
    handleFetchReport(newUserId, selectedYear, selectedMonth);
  };

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    handleFetchReport(selectedUserId, selectedYear, newMonth);
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    handleFetchReport(selectedUserId, newYear, selectedMonth);
  };

  const downloadExcelUrl = `/api/export/overtime-excel?userId=${selectedUserId}&year=${selectedYear}&month=${selectedMonth}`;

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || String(selectedMonth);
  const query = operatorQuery.trim().toLowerCase();
  const matchedOperators = query
    ? operatorList.filter((op) => `${op.name} ${op.employeeId}`.toLowerCase().includes(query))
    : operatorList;
  const selectedOperator = operatorList.find((op) => op.id === selectedUserId);
  // Pilihan tetap menampilkan operator terpilih meski tidak cocok dengan pencarian.
  const visibleOperators =
    query && selectedOperator && !matchedOperators.some((op) => op.id === selectedUserId)
      ? [selectedOperator, ...matchedOperators]
      : matchedOperators;

  const currentSpl = report.splList[selectedSplIndex] || report.splList[0];

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTROL BAR */}
      <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-[#0B3568] dark:text-[#38BDF8] border border-blue-200/60 dark:border-blue-800">
                PT Nusantara Regas • Penempatan ORF
              </span>
              <span className="text-xs text-slate-400">• Form Lembur Resmi</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Rekapitulasi Absensi &amp; Lembur Pekerja
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perhitungan jam lembur otomatis berdasarkan roster jadwal kerja operasional (ON/OFF) dan jam aktual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download Master XLSX Button — konfirmasi operator & periode dahulu */}
            <button
              type="button"
              onClick={() => setShowDownloadConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B3568] hover:bg-[#092B57] dark:bg-[#0284C7] dark:hover:bg-[#0369A1] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="Unduh Rekapitulasi dan SPL Lembur Resmi (.xlsx)"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Operator Selector for Manager / Admin — pencarian nama atau NIP */}
            {isManagerOrAdmin && operatorList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600 dark:text-slate-400">Pekerja:</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={operatorQuery}
                    onChange={(e) => setOperatorQuery(e.target.value)}
                    placeholder="Cari nama / NIP..."
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0B3568] w-40"
                  />
                </div>
                <select
                  value={selectedUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0B3568]"
                >
                  {visibleOperators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.employeeId}){op.id === currentUserId ? ' — Anda' : ''}
                    </option>
                  ))}
                </select>
                {visibleOperators.length === 0 && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Tidak ada pekerja yang cocok
                  </span>
                )}
              </div>
            )}

            {/* Month Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-400">Bulan:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0B3568]"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-400">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0B3568]"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-[#0B3568] dark:text-[#38BDF8] font-bold">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              <span>Memperbarui perhitungan...</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-blue-200/80 dark:border-blue-900/50 shadow-xs relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Lembur</div>
          <div className="text-2xl font-black text-[#0B3568] dark:text-[#38BDF8] mt-1 font-mono">
            {report.summary.totalJamLembur} <span className="text-xs font-semibold">Jam</span>
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
            Periode {report.period.periodeBulanText}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Hari Kerja (ON)</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1 font-mono">
            {report.summary.totalHariKerjaON} <span className="text-xs font-semibold text-slate-400">Hari</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Jadwal Shift Roster</div>
        </div>

        <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Hari Libur (OFF)</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1 font-mono">
            {report.summary.totalHariLiburOFF} <span className="text-xs font-semibold text-slate-400">Hari</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Off Duty Roster</div>
        </div>

        <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-amber-200/80 dark:border-amber-900/50 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Lembur Backup OFF</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {report.summary.totalHariLemburBackup} <span className="text-xs font-semibold text-amber-500">Hari</span>
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">12 Jam Penuh / Hari</div>
        </div>

        <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Hari Cuti</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1 font-mono">
            {report.summary.totalHariCuti} <span className="text-xs font-semibold text-slate-400">Hari</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Cuti yang Disetujui</div>
        </div>

        <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Surat Perintah (SPL)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {report.splList.filter((s) => s.dateStr).length} <span className="text-xs font-semibold text-slate-400">Surat</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">SPL 1, SPL 2, SPL 3</div>
        </div>
      </div>

      {/* 3. TABS SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'rekap'
              ? 'bg-[#0B3568] text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Sheet CUTOFF PERTAMA (Rekap Absensi &amp; Lembur)</span>
        </button>

        <button
          onClick={() => setActiveTab('spl')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'spl'
              ? 'bg-[#0B3568] text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Surat Perintah Kerja Lembur (SPL 1, 2, 3)</span>
        </button>
      </div>

      {/* 4. TAB 1: REKAPITULASI ABSENSI DAN LEMBUR */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          {/* Header Metadata Display matching template */}
          <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                REKAPITULASI ABSENSI DAN LEMBUR PEKERJA PENEMPATAN PT NUSANTARA REGAS
              </h3>
              <p className="text-xs font-mono font-bold text-[#0B3568] dark:text-[#38BDF8] mt-1">
                PERIODE BULAN : {report.period.periodeBulanText.toUpperCase()}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">NAMA</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">: {report.user.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NIP</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">: {report.user.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">LOKASI</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">: {report.user.location}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">JABATAN</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">: {report.user.position}</span>
              </div>
            </div>
          </div>

          {/* Rekapitulasi Table matching template columns exactly */}
          <div className="bg-white dark:bg-[#0B1E32] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">
                    <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 w-16">
                      TANGGAL
                      <div className="text-[10px] font-normal text-slate-500">ABSENSI</div>
                    </th>
                    <th colSpan={2} className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700">
                      JAM KERJA
                    </th>
                    <th colSpan={2} className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700">
                      JAM LEMBUR
                    </th>
                    <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 w-24">
                      TOTAL JAM
                      <div className="text-[10px] font-normal text-slate-500">LEMBUR</div>
                    </th>
                    <th rowSpan={2} className="px-4 py-2 border-r border-slate-200 dark:border-slate-700 text-left">
                      KETERANGAN LEMBUR
                    </th>
                    <th rowSpan={2} className="px-4 py-2 text-left">
                      PEMBERI TUGAS
                    </th>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-center">
                    <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 w-16">MASUK</th>
                    <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 w-16">PULANG</th>
                    <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 w-16">AWAL</th>
                    <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 w-16">AKHIR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-center">
                  {report.days.map((day) => {
                    const isBackup = !day.isScheduledWork && day.totalJamLembur > 0;
                    const isOff = day.keterangan === 'Off Duty';
                    const isCuti = day.keterangan === 'Cuti';

                    let rowBg = 'hover:bg-slate-50 dark:hover:bg-slate-800/40';
                    if (isBackup) rowBg = 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40';
                    else if (isCuti) rowBg = 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30';
                    else if (isOff) rowBg = 'bg-slate-50/30 dark:bg-slate-900/20';

                    return (
                      <tr key={day.date} className={`${rowBg} transition text-slate-800 dark:text-slate-200`}>
                        {/* Tanggal */}
                        <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 font-bold">
                          {day.dayNumber}
                        </td>
                        {/* Jam Masuk */}
                        <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                          {day.checkIn || '-'}
                        </td>
                        {/* Jam Pulang */}
                        <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                          {day.checkOut || '-'}
                        </td>
                        {/* Awal Lembur */}
                        <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                          {day.awalLembur || '-'}
                        </td>
                        {/* Akhir Lembur */}
                        <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                          {day.akhirLembur || '-'}
                        </td>
                        {/* Total Jam Lembur */}
                        <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 font-bold">
                          {day.totalJamLembur > 0 ? (
                            <span className="text-blue-700 dark:text-blue-400 font-black">
                              {day.totalJamLembur}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        {/* Keterangan Lembur */}
                        <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800 text-left font-sans">
                          <div className="flex items-center gap-1.5">
                            {isBackup && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                                BACKUP
                              </span>
                            )}
                            {isCuti && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                CUTI
                              </span>
                            )}
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {day.keterangan || '-'}
                            </span>
                          </div>
                        </td>
                        {/* Pemberi Tugas */}
                        <td className="px-4 py-2 text-left font-sans text-xs text-slate-600 dark:text-slate-400">
                          {day.pemberiTugas || '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Formula Total Row */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                    <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-wider text-slate-700 dark:text-slate-300 font-sans">
                      TOTAL JAM LEMBUR PERIODE =SUM(G17:G46) :
                    </td>
                    <td className="px-3 py-3 text-center text-blue-700 dark:text-blue-400 text-sm font-black border-r border-slate-200 dark:border-slate-700">
                      {report.summary.totalJamLembur}
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-left font-sans text-[11px] font-normal text-slate-500">
                      Jumlah kumulatif jam lembur yang tercantum pada rekapitulasi resmi
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures Area matching template */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center space-y-12">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Diketahui oleh,</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {report.signatories.diketahuiPT}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 underline">
                  {report.signatories.diketahuiNama}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {report.signatories.diketahuiJabatan}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center space-y-12">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Disetujui oleh,</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {report.signatories.disetujuiPT}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 underline">
                  {report.signatories.disetujuiNama}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {report.signatories.disetujuiJabatan}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center space-y-12">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Dibuat oleh,</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">Pekerja Penempatan</span>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 underline">
                  {report.user.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {report.user.position}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: SURAT PERINTAH KERJA LEMBUR (SPL) */}
      {activeTab === 'spl' && (
        <div className="space-y-4">
          {/* SPL Sheet Selector */}
          <div className="flex items-center gap-2">
            {report.splList.map((spl, idx) => (
              <button
                key={spl.sheetName}
                onClick={() => setSelectedSplIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedSplIndex === idx
                    ? 'bg-[#0B3568] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{spl.sheetName}</span>
                {spl.dateStr && <span className="text-[10px] opacity-80">• {spl.hariTanggal.split(',')[0]}</span>}
              </button>
            ))}
          </div>

          {/* SPL Document Layout Preview matching Excel Template */}
          <div className="bg-white dark:bg-[#0B1E32] rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-wider uppercase">
                SURAT PERINTAH KERJA LEMBUR
              </h3>
            </div>

            {/* Bagian Perintah Lembur (Sebelum Lembur) */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Unit / Satuan Kerja</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold">: {currentSpl.unitKerja}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Hari / Tanggal</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold">: {currentSpl.hariTanggal}</span>
              </div>
              <p className="font-medium text-slate-700 dark:text-slate-300 pt-1">
                Kepada Pekerja tersebut di bawah ini, ditugaskan untuk kerja lembur:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Nama / NIP</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold font-mono">
                  : {currentSpl.namaPekerja} / {currentSpl.nip}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="font-bold text-slate-600 dark:text-slate-400">Jenis Kerja Lembur*</span>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      {currentSpl.jenisLembur === 'BIASA' ? '[ X ]' : '[   ]'}
                    </span>
                    <span>Biasa</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      {currentSpl.jenisLembur === 'EMERGENCY' ? '[ X ]' : '[   ]'}
                    </span>
                    <span>Emergency / Darurat</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Dengan alasan sebagai berikut</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold">: {currentSpl.alasanLembur}</span>
              </div>

              {/* Tanda Tangan Sebelum Lembur */}
              <div className="flex justify-end pt-4">
                <div className="text-center w-64 space-y-12">
                  <div className="text-slate-500 text-[11px]">{currentSpl.tanggalSurat}</div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 underline">
                      ({currentSpl.yangMemerintahkan})
                    </div>
                    <div className="text-[10px] text-slate-400">Yang Memerintahkan</div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 italic">Keterangan: Diisi sebelum lembur</div>
            </div>

            {/* Separator Divider */}
            <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-700 my-4" />

            {/* Bagian Pertanggungjawaban Lembur (Setelah Lembur) */}
            <div className="space-y-3 text-xs">
              <div className="text-center">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider uppercase">
                  PERTANGGUNGJAWABAN KERJA LEMBUR
                </h4>
              </div>

              <p className="font-medium text-slate-700 dark:text-slate-300 pt-1">
                Perintah Kerja Lembur pada:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Hari / Tanggal</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold">: {currentSpl.hariTanggal}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Jam</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold">: {currentSpl.jamKerja}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="font-bold text-slate-600 dark:text-slate-400">Jenis Kerja Lembur</span>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      {currentSpl.jenisLembur === 'BIASA' ? '[ X ]' : '[   ]'}
                    </span>
                    <span>Biasa</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      {currentSpl.jenisLembur === 'EMERGENCY' ? '[ X ]' : '[   ]'}
                    </span>
                    <span>Emergency / Darurat</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Hasil Kerja Lembur</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold">: {currentSpl.hasilKerja}</span>
              </div>

              <p className="font-medium text-slate-700 dark:text-slate-300 pt-2">
                Telah dilaksanakan oleh:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Nama / NIP</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold font-mono">
                  : {currentSpl.namaPekerja} / {currentSpl.nip}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Unit / Satuan Kerja</span>
                <span className="col-span-2 text-slate-900 dark:text-slate-100 font-semibold">: {currentSpl.unitKerja}</span>
              </div>

              {/* Tanda Tangan Setelah Lembur */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center space-y-12">
                  <div className="text-[11px] text-slate-500">{currentSpl.tanggalSurat}</div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 underline">
                      ({currentSpl.yangMelaksanakan})
                    </div>
                    <div className="text-[10px] text-slate-400">Yang Melaksanakan Kerja Lembur</div>
                  </div>
                </div>

                <div className="text-center space-y-12">
                  <div className="text-[11px] text-slate-500">Yang Memerintahkan,</div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 underline">
                      ({currentSpl.yangMemerintahkan})
                    </div>
                    <div className="text-[10px] text-slate-400">Atasan Langsung</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                <div>Catatan:</div>
                <div>*) beri tanda X pada salah satu kotak yang sesuai</div>
                <div>**) sesuai dengan kewenangan</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Unduh — tampilkan operator & periode sebelum evidence diunduh */}
      {showDownloadConfirm && (
        <Modal
          open={showDownloadConfirm}
          onClose={() => setShowDownloadConfirm(false)}
          title="Konfirmasi Unduh Evidence Lembur"
          eyebrow="EXPORT REKAPITULASI & SPL"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowDownloadConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
              <a
                href={downloadExcelUrl}
                onClick={() => setShowDownloadConfirm(false)}
                className="px-5 py-2 rounded-xl bg-[#0B3568] hover:bg-[#092B57] dark:bg-[#0284C7] dark:hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Excel (.xlsx)</span>
              </a>
            </div>
          }
        >
          <div className="space-y-2.5 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Pastikan data berikut sesuai sebelum evidence lembur diunduh:
            </p>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Pekerja</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                  {report.user.name} ({report.user.employeeId})
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Periode</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {monthLabel} {selectedYear}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Berkas</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Rekapitulasi &amp; SPL Lembur (.xlsx)
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Total Lembur</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {report.summary.totalJamLembur} Jam
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Unduhan dibuat dari data sumber (roster jadwal &amp; absensi) periode tersebut dan
              dicatat dalam audit log untuk keperluan traceability.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
