'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CheckCircle2,
  AlertOctagon,
  ClockAlert,
  CalendarOff,
  HeartPulse,
  RefreshCw,
  Download,
  Search,
  ShieldCheck,
  Calendar,
  Grid,
  List,
} from 'lucide-react';
import { CountUp } from '@/components/ui/CountUp';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatJakartaTime } from '@/lib/time';

export interface SerializableOperatorStatus {
  operator: {
    id: string;
    name: string;
    employeeId: string;
    position: string;
    avatarUrl?: string | null;
  };
  status: string;
  statusLabel: string;
  shift: {
    id: string;
    name: string;
    code: string;
    startTime: string;
    endTime: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  attendance: {
    id: string;
    checkIn: string | null;
    checkOut: string | null;
    lateMinutes: number;
    notes: string | null;
  } | null;
  leave: {
    type: string;
    reason: string;
  } | null;
  isWorkDay: boolean;
}

export interface ShiftCoverageItem {
  shift: {
    id: string;
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    requiredCount: number;
  };
  required: number;
  assigned: number;
  present: number;
  missing: number;
  coveragePercentage: number;
  status: 'FULL' | 'WARNING' | 'CRITICAL';
  warningMessage: string | null;
}

export interface MatrixData {
  dates: string[];
  rows: {
    operator: {
      id: string;
      name: string;
      employeeId: string;
      position: string;
    };
    statuses: string[];
  }[];
}

interface WorkforceControlCenterClientProps {
  currentDate: string;
  counts: {
    totalOperators: number;
    kerja: number;
    hadir: number;
    belumAbsen: number;
    terlambat: number;
    cuti: number;
    izin: number;
    sakit: number;
    off: number;
    absent: number;
  };
  shiftCoverages: ShiftCoverageItem[];
  operatorStatuses: SerializableOperatorStatus[];
  matrixData?: MatrixData;
}

export function WorkforceControlCenterClient({
  currentDate,
  counts,
  shiftCoverages,
  operatorStatuses,
  matrixData,
}: WorkforceControlCenterClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [activeTab, setActiveTab] = useState<'control' | 'matrix'>('control');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Total active operators
  const total = counts.totalOperators || 48;
  const hadirPct = total > 0 ? Math.round((counts.hadir / total) * 100) : 0;
  const terlambatPct = total > 0 ? Math.round((counts.terlambat / total) * 100) : 0;
  const belumAbsenPct = total > 0 ? Math.round((counts.belumAbsen / total) * 100) : 0;
  const cutiIzinCount = (counts.cuti || 0) + (counts.izin || 0);

  // Filtered operators
  const filteredOperators = operatorStatuses.filter((op) => {
    const matchShift =
      shiftFilter === 'ALL' ||
      (shiftFilter === 'OFF' ? !op.shift : op.shift?.id === shiftFilter || op.shift?.code === shiftFilter);

    const matchStatus =
      statusFilter === 'ALL' ||
      op.status === statusFilter ||
      (statusFilter === 'CUTI_IZIN' && (op.status === 'CUTI' || op.status === 'IZIN'));

    const matchSearch =
      search === '' ||
      op.operator.name.toLowerCase().includes(search.toLowerCase()) ||
      op.operator.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      op.operator.position.toLowerCase().includes(search.toLowerCase());

    return matchShift && matchStatus && matchSearch;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    router.push(`/manager/workforce?date=${newDate}`);
  };

  return (
    <div className="space-y-4 sm:space-y-5 dashboard-enter max-w-[1400px] mx-auto w-full">
      {/* 1. Header: Workforce Control Center */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#0066B3] bg-[#EAF4FC] px-2.5 py-0.5 rounded-md">
              WORKFORCE CONTROL CENTER
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
              Live Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F315A] tracking-tight mt-1">
            Monitoring Manpower
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5 max-w-2xl">
            Pantau distribusi personel, coverage shift, dan status operasional secara real-time di ORF Muara Karang.
          </p>
        </div>

        {/* Right Controls: Date Selector, View Toggle, Refresh, Export */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
            <button
              onClick={() => setActiveTab('control')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'control'
                  ? 'bg-white text-[#0066B3] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-[#0F315A]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Live Monitor</span>
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'matrix'
                  ? 'bg-white text-[#0066B3] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-[#0F315A]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Matriks Multi-Hari</span>
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD7E6] px-3 py-1.5 rounded-xl text-xs font-medium text-[#0F315A]">
            <Calendar className="w-3.5 h-3.5 text-[#0066B3]" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-transparent focus:outline-none font-bold text-xs cursor-pointer"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Muat ulang data"
            className="p-2 rounded-xl bg-white border border-[#CBD7E6] text-slate-600 hover:text-[#0066B3] hover:bg-[#EAF4FC] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0066B3]' : ''}`} />
          </button>

          {/* Export CSV */}
          <a
            href={`/api/export/attendance?startDate=${selectedDate}&endDate=${selectedDate}`}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0066B3] hover:bg-[#005596] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor</span>
          </a>
        </div>
      </div>

      {activeTab === 'control' ? (
        <>
          {/* 2. KPI Section (6 Compact Cards ~96px height) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {/* 1. Total Operator */}
            <div className="bg-[#0F315A] text-white rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between h-[96px] sm:h-[102px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-md bg-[#0066B3] text-white">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                    TOTAL OPERATOR
                  </span>
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-black leading-none">
                  <CountUp value={total} duration={600} />
                </span>
                <span className="text-[9.5px] text-slate-300 font-medium">Operator aktif</span>
              </div>
            </div>

            {/* 2. Hadir */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[96px] sm:h-[102px]">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>HADIR</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{hadirPct}%</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-none">
                  <CountUp value={counts.hadir} duration={600} />
                </span>
                <span className="text-[9.5px] text-slate-400 font-medium">Orang</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${hadirPct}%` }} />
              </div>
            </div>

            {/* 3. Terlambat */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[96px] sm:h-[102px]">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-amber-50 text-amber-700">
                  <AlertOctagon className="w-3 h-3 text-[#F58220]" />
                  <span>TERLAMBAT</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{terlambatPct}%</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-none">
                  <CountUp value={counts.terlambat} duration={600} />
                </span>
                <span className="text-[9.5px] text-slate-400 font-medium">Orang</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-[#F58220] rounded-full" style={{ width: `${terlambatPct}%` }} />
              </div>
            </div>

            {/* 4. Belum Absen */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[96px] sm:h-[102px]">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-red-50 text-[#DC2626]">
                  <ClockAlert className="w-3 h-3 text-[#DC2626]" />
                  <span>BELUM ABSEN</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{belumAbsenPct}%</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-none">
                  <CountUp value={counts.belumAbsen} duration={600} />
                </span>
                <span className="text-[9.5px] text-slate-400 font-medium">Orang</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-[#DC2626] rounded-full" style={{ width: `${belumAbsenPct}%` }} />
              </div>
            </div>

            {/* 5. Cuti & Izin */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[96px] sm:h-[102px]">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-blue-50 text-[#0066B3]">
                  <CalendarOff className="w-3 h-3 text-[#0066B3]" />
                  <span>CUTI / IZIN</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-none">
                  <CountUp value={cutiIzinCount} duration={600} />
                </span>
                <span className="text-[9.5px] text-slate-400 font-medium">
                  {counts.cuti} cuti · {counts.izin} izin
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-[#0066B3] rounded-full" style={{ width: `${Math.min(100, (cutiIzinCount / total) * 100)}%` }} />
              </div>
            </div>

            {/* 6. Sakit */}
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[96px] sm:h-[102px]">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-rose-50 text-rose-700">
                  <HeartPulse className="w-3 h-3 text-rose-600" />
                  <span>SAKIT</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-none">
                  <CountUp value={counts.sakit} duration={600} />
                </span>
                <span className="text-[9.5px] text-slate-400 font-medium">Orang</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (counts.sakit / total) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* 3. Shift Coverage Hari Ini Section & Workforce Status Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
            {/* Shift Coverage Hari Ini (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0066B3]" />
                  <h2 className="text-xs sm:text-sm font-black text-[#0F315A] uppercase tracking-wide">
                    Shift Coverage Hari Ini
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">
                  ● 3 Rotasi Shift
                </span>
              </div>

              {/* 3 Shift Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-auto py-2">
                {shiftCoverages.length > 0 ? (
                  shiftCoverages.map((cov, idx) => {
                    const statusTag =
                      cov.coveragePercentage >= 85
                        ? { text: 'On Track', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
                        : cov.coveragePercentage >= 70
                        ? { text: 'Need Attention', bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
                        : { text: 'Critical', bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80 hover:bg-[#F1F5F9] transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#0F315A] uppercase">
                              {cov.shift.name}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.2 rounded-full border ${statusTag.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusTag.dot}`} />
                              {statusTag.text}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {cov.shift.startTime} – {cov.shift.endTime} WIB
                          </p>
                        </div>

                        <div className="my-2.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-base font-black text-[#0F315A]">
                              {cov.present} / {cov.required} Operator
                            </span>
                            <span className="text-xs font-black text-[#0066B3]">
                              {cov.coveragePercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cov.coveragePercentage >= 85
                                  ? 'bg-emerald-500'
                                  : cov.coveragePercentage >= 70
                                  ? 'bg-[#F58220]'
                                  : 'bg-[#DC2626]'
                              }`}
                              style={{ width: `${Math.min(100, cov.coveragePercentage)}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-[9.5px] text-slate-500 truncate">
                          Target minimum: {cov.required} personil
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center py-6 text-xs text-slate-400">
                    Tidak ada shift operasional aktif untuk tanggal ini.
                  </div>
                )}
              </div>
            </div>

            {/* Workforce Status Distribution (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xs sm:text-sm font-black text-[#0F315A] uppercase tracking-wide">
                  Distribusi Status Personel
                </h2>
                <span className="text-[11px] font-bold text-slate-400">
                  {total} Personil Terdaftar
                </span>
              </div>

              {/* Status Breakdown Distribution Bar */}
              <div className="my-auto py-2 space-y-3">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div style={{ width: `${(counts.hadir / total) * 100}%` }} className="bg-[#16A34A] h-full" title={`Hadir: ${counts.hadir}`} />
                  <div style={{ width: `${(counts.terlambat / total) * 100}%` }} className="bg-[#F58220] h-full" title={`Terlambat: ${counts.terlambat}`} />
                  <div style={{ width: `${(counts.belumAbsen / total) * 100}%` }} className="bg-[#DC2626] h-full" title={`Belum Absen: ${counts.belumAbsen}`} />
                  <div style={{ width: `${(counts.cuti / total) * 100}%` }} className="bg-[#0066B3] h-full" title={`Cuti: ${counts.cuti}`} />
                  <div style={{ width: `${(counts.izin / total) * 100}%` }} className="bg-teal-500 h-full" title={`Izin: ${counts.izin}`} />
                  <div style={{ width: `${(counts.sakit / total) * 100}%` }} className="bg-rose-500 h-full" title={`Sakit: ${counts.sakit}`} />
                  <div style={{ width: `${(counts.off / total) * 100}%` }} className="bg-slate-300 h-full" title={`Off: ${counts.off}`} />
                </div>

                {/* Status Grid Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="font-bold text-[10.5px]">HADIR</span>
                    <span className="font-black font-mono">{counts.hadir}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="font-bold text-[10.5px]">TERLAMBAT</span>
                    <span className="font-black font-mono">{counts.terlambat}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-red-50 text-red-800 border border-red-200">
                    <span className="font-bold text-[10.5px]">BELUM ABSEN</span>
                    <span className="font-black font-mono">{counts.belumAbsen}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                    <span className="font-bold text-[10.5px]">CUTI</span>
                    <span className="font-black font-mono">{counts.cuti}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                    <span className="font-bold text-[10.5px]">IZIN</span>
                    <span className="font-black font-mono">{counts.izin}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                    <span className="font-bold text-[10.5px]">SAKIT</span>
                    <span className="font-black font-mono">{counts.sakit}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                    <span className="font-bold text-[10.5px]">OFF (LIBUR)</span>
                    <span className="font-black font-mono">{counts.off}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                    <span className="font-bold text-[10.5px]">TOTAL</span>
                    <span className="font-black font-mono">{total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Filter Monitoring Section: Clean & Non-Overflowing */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Shift Selector */}
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
              >
                <option value="ALL">Semua Shift</option>
                <option value="Pagi">Shift Pagi (06:00 - 14:00)</option>
                <option value="Siang">Shift Siang (14:00 - 22:00)</option>
                <option value="Malam">Shift Malam (22:00 - 06:00)</option>
                <option value="OFF">Non-Shift / OFF</option>
              </select>

              {/* Status Selector */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
              >
                <option value="ALL">Semua Status Kehadiran</option>
                <option value="HADIR">HADIR</option>
                <option value="TERLAMBAT">TERLAMBAT</option>
                <option value="BELUM_ABSEN">BELUM ABSEN</option>
                <option value="CUTI_IZIN">CUTI & IZIN</option>
                <option value="SAKIT">SAKIT</option>
                <option value="OFF">OFF</option>
              </select>

              {/* Search Operator */}
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau NIP operator..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              Menampilkan <span className="text-[#0066B3]">{filteredOperators.length}</span> dari {total} operator
            </div>
          </div>

          {/* 5. Operator Monitoring: Table on Desktop & Tablet / Card List on Mobile */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            {/* Desktop & Tablet Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="text-[10px] uppercase font-bold text-[#64748B] bg-[#EDF4FB] border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Operator</th>
                    <th scope="col" className="px-4 py-3.5">Employee ID</th>
                    <th scope="col" className="px-4 py-3.5">Shift</th>
                    <th scope="col" className="px-4 py-3.5">Lokasi</th>
                    <th scope="col" className="px-4 py-3.5">Schedule</th>
                    <th scope="col" className="px-4 py-3.5">Check In</th>
                    <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOperators.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-xs">
                        Tidak ada operator yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOperators.map((op) => {
                      const checkInTime = op.attendance?.checkIn
                        ? formatJakartaTime(new Date(op.attendance.checkIn))
                        : '—';

                      return (
                        <tr key={op.operator.id} className="hover:bg-[#F8FBFE] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                name={op.operator.name}
                                avatarUrl={op.operator.avatarUrl}
                                size={30}
                                className="shrink-0 ring-1 ring-slate-200"
                              />
                              <div>
                                <p className="font-bold text-[#0F315A] leading-tight">{op.operator.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{op.operator.position}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-600 text-[11px]">
                            {op.operator.employeeId}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                            {op.shift?.name || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 truncate max-w-[140px]">
                            {op.location?.name || 'ORF Muara Karang'}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">
                            {op.shift ? `${op.shift.startTime} – ${op.shift.endTime}` : 'Libur (OFF)'}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px]">
                            {checkInTime !== '—' ? (
                              <span className={`font-bold ${op.status === 'TERLAMBAT' ? 'text-amber-600' : 'text-slate-800'}`}>
                                {checkInTime} WIB
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <StatusBadge status={op.status} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <a
                              href={`/manager/attendance?operator=${op.operator.id}`}
                              className="text-[11px] font-bold text-[#0066B3] hover:underline"
                            >
                              Detail →
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< 768px: Strict No Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-2">
              {filteredOperators.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ada operator yang sesuai dengan kriteria filter.
                </div>
              ) : (
                filteredOperators.map((op) => (
                  <div
                    key={op.operator.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={op.operator.name} avatarUrl={op.operator.avatarUrl} size={32} />
                        <div>
                          <p className="font-bold text-xs text-[#0F315A]">{op.operator.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{op.operator.employeeId} · {op.operator.position}</p>
                        </div>
                      </div>
                      <StatusBadge status={op.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Shift & Jam:</span>
                        <span className="font-bold text-[#0F172A]">
                          {op.shift ? `${op.shift.name} (${op.shift.startTime}–${op.shift.endTime})` : 'Libur (OFF)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Check In:</span>
                        <span className="font-bold text-slate-700 font-mono">
                          {op.attendance?.checkIn ? `${formatJakartaTime(new Date(op.attendance.checkIn))} WIB` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        /* Matrix Multi-Hari View */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#EDF4FB] text-[#0F315A]">
                    <th className="sticky left-0 z-10 bg-[#EDF4FB] px-5 py-3.5 text-left font-bold">
                      OPERATOR
                    </th>
                    {matrixData?.dates.map((d) => (
                      <th key={d} className="px-2.5 py-3.5 text-center font-bold">
                        <span className="block font-mono text-xs">{d.slice(8)}</span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(`${d}T00:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'short' })}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrixData?.rows.map((row) => (
                    <tr key={row.operator.id} className="hover:bg-[#F8FBFE] transition-colors">
                      <td className="sticky left-0 z-10 bg-white px-5 py-3.5 border-r border-slate-100">
                        <p className="font-bold text-[#0F315A]">{row.operator.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {row.operator.employeeId} · {row.operator.position}
                        </p>
                      </td>
                      {row.statuses.map((st, sIdx) => (
                        <td key={sIdx} className="px-2 py-3.5 text-center">
                          <StatusBadge status={st} size="sm" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
