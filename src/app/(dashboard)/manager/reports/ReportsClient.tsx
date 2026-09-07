'use client';

import React, { useState, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Download, Calendar } from 'lucide-react';

import { KpiCard } from '@/components/dashboard/KpiCard';
import { useRouter } from 'next/navigation';

export interface TrendDataItem {
  date: string;
  hadir: number;
  terlambat: number;
  absent: number;
}

export interface ShiftDistributionItem {
  name: string;
  hadir: number;
  terlambat: number;
}

interface ReportsClientProps {
  summary: {
    totalRecords: number;
    attendanceRate: number;
    onTimeRate: number;
    lateCount: number;
    absenceCount: number;
    leaveCount: number;
    permissionCount: number;
    sickCount: number;
    averageLateMinutes: number;
  };
  trendData: TrendDataItem[];
  shiftDistribution: ShiftDistributionItem[];
  startDate: string;
  endDate: string;
}

export function ReportsClient({
  summary,
  trendData,
  shiftDistribution,
  startDate,
  endDate,
}: ReportsClientProps) {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const mounted = useIsMounted();

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/manager/reports?startDate=${start}&endDate=${end}`);
  };

  return (
    <div className="space-y-6">
      {/* Date Range & Export Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Periode:</span>
          </div>

          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium"
          />
          <span className="text-xs text-slate-400">s/d</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium"
          />

          <button
            type="submit"
            className="px-3.5 py-1.5 bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold rounded-lg transition shadow-xs"
          >
            Terapkan Filter
          </button>
        </form>

        <a
          href={`/api/export/attendance?startDate=${start}&endDate=${end}`}
          download
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition w-fit"
        >
          <Download className="h-4 w-4" />
          <span>Unduh Laporan Lengkap (.CSV)</span>
        </a>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Attendance Rate"
          value={`${summary.attendanceRate}%`}
          iconName="checkCircle"
          variant="green"
          subtext="Tingkat Hadir"
        />
        <KpiCard
          label="On-Time Rate"
          value={`${summary.onTimeRate}%`}
          iconName="trendingUp"
          variant="blue"
          subtext="Tepat Waktu"
        />
        <KpiCard
          label="Terlambat"
          value={summary.lateCount}
          iconName="clock"
          variant="amber"
          subtext={`Avg ${summary.averageLateMinutes} menit`}
        />
        <KpiCard
          label="Mangkir / Absen"
          value={summary.absenceCount}
          iconName="alertTriangle"
          variant="red"
          subtext="Tanpa Keterangan"
        />
        <KpiCard
          label="Cuti Tahunan"
          value={summary.leaveCount}
          iconName="calendar"
          variant="blue"
          subtext="Disetujui"
        />
        <KpiCard
          label="Izin / Sakit"
          value={summary.permissionCount + summary.sickCount}
          iconName="users"
          variant="gray"
          subtext="Dispensasi"
        />
      </div>


      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Line Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Tren Kehadiran Harian (Hadir vs Terlambat)
              </h3>
              <p className="text-xs text-slate-500">Jumlah personil per hari</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="hadir" name="Hadir Tepat Waktu" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="terlambat" name="Terlambat" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Shift Distribution Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Distribusi Kehadiran Berdasarkan Shift
              </h3>
              <p className="text-xs text-slate-500">Perbandingan Shift Pagi, Siang & Malam</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftDistribution} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="hadir" name="Hadir" fill="#1D5FA7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
