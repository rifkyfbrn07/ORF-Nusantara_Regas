'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface OperatorStatusRow {
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
    checkIn: Date | string | null;
    checkOut: Date | string | null;
    lateMinutes: number;
    notes: string | null;
  } | null;
}

interface OperatorStatusTableProps {
  data?: OperatorStatusRow[];
  currentDate?: string;
}

export function OperatorStatusTable({ data = [] }: OperatorStatusTableProps) {
  // No dummy/static rows — hanya data actual dari server (getManpowerStatusSummary).
  const defaultSchedule: {
    waktu: string;
    operator: string;
    shift: string;
    lokasi: string;
    status: string;
    statusClass: string;
  }[] = [];

  const rows =
    data.length > 0
      ? data.slice(0, 5).map((row) => ({
          waktu: row.shift ? `${row.shift.startTime} - ${row.shift.endTime}` : '—',
          operator: row.operator.name,
          shift: row.shift?.name || 'Pagi',
          lokasi: row.location?.name || 'LNG Plant',
          status:
            row.status === 'HADIR'
              ? 'Hadir'
              : row.status === 'TERLAMBAT'
              ? 'Terlambat'
              : row.status === 'BELUM_ABSEN'
              ? 'Belum Absen'
              : row.status === 'CUTI'
              ? 'Cuti'
              : row.statusLabel,
          statusClass:
            row.status === 'HADIR'
              ? 'bg-[#22A65A]/15 text-[#22A65A] dark:text-[#4ADE80] border-[#22A65A]/30'
              : row.status === 'TERLAMBAT'
              ? 'bg-[#F58220]/15 text-[#F58220] dark:text-amber-400 border-[#F58220]/30'
              : row.status === 'BELUM_ABSEN'
              ? 'bg-[#EF3340]/15 text-[#EF3340] dark:text-red-400 border-[#EF3340]/30'
              : 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
        }))
      : defaultSchedule;

  return (
    <div className="card-command-center p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0077C8]/10 text-[#0077C8] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
            <Users className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider">
            Jadwal &amp; Kehadiran Operator
          </h3>
        </div>
        <Link
          href="/manager/schedules"
          className="text-xs font-black text-[#0077C8] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
        >
          Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.10)]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F4F9FC] dark:bg-[#0A2035] text-[10px] uppercase font-black text-[#64748B] dark:text-[#BFD2E2] border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.10)]">
            <tr>
              <th scope="col" className="px-4 py-2.5">Waktu</th>
              <th scope="col" className="px-4 py-2.5">Operator</th>
              <th scope="col" className="px-4 py-2.5">Shift</th>
              <th scope="col" className="px-4 py-2.5">Lokasi</th>
              <th scope="col" className="px-4 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[rgba(120,190,235,0.10)] text-[11.5px] bg-white dark:bg-[#0D263E]">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-[#64748B] dark:text-[#8FA8BF]">
                  Belum ada data kehadiran untuk hari ini.
                </td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-[#F4F9FC] dark:hover:bg-[#12314D] transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-[#123D70] dark:text-[#AFC4D5]">
                  {r.waktu}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={r.operator} size={24} className="shrink-0" />
                    <span className="font-bold text-[#0B3568] dark:text-[#EDF6FC] truncate max-w-[140px]">{r.operator}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-[#123D70] dark:text-[#AFC4D5]">
                  {r.shift}
                </td>
                <td className="px-4 py-3 text-[#64748B] dark:text-[#8FA7BD] truncate max-w-[120px]">
                  {r.lokasi}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-block text-[9.5px] font-black px-2.5 py-0.5 rounded-full border ${r.statusClass}`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="sm:hidden divide-y divide-[#E2E8F0] dark:divide-[rgba(120,190,235,0.10)] space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] flex items-center justify-between text-xs border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.10)]">
            <div className="flex items-center gap-2.5">
              <UserAvatar name={r.operator} size={28} />
              <div>
                <p className="font-bold text-[#0B3568] dark:text-[#EDF6FC]">{r.operator}</p>
                <p className="text-[10px] text-[#64748B] dark:text-[#AFC4D5] font-mono">{r.shift} · {r.waktu}</p>
              </div>
            </div>
            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border ${r.statusClass}`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
