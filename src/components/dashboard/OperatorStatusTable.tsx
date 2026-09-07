'use client';

import React from 'react';
import Link from 'next/link';
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
  const defaultSchedule = [
    {
      waktu: '08:00 - 16:00',
      operator: 'Andi Pratama',
      shift: 'Pagi',
      lokasi: 'LNG Plant',
      status: 'Hadir',
      statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      waktu: '14:00 - 22:00',
      operator: 'Budi Santoso',
      shift: 'Siang',
      lokasi: 'Compressor',
      status: 'Hadir',
      statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      waktu: '22:00 - 06:00',
      operator: 'Citra Dewi',
      shift: 'Malam',
      lokasi: 'Utilities',
      status: 'Belum Absen',
      statusClass: 'bg-red-50 text-red-600 border-red-200',
    },
    {
      waktu: '06:00 - 14:00',
      operator: 'Dedi Kurniawan',
      shift: 'Pagi',
      lokasi: 'Loading Jetty',
      status: 'Cuti',
      statusClass: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  const rows =
    data.length > 0
      ? data.slice(0, 4).map((row) => ({
          waktu: row.shift ? `${row.shift.startTime} - ${row.shift.endTime}` : '08:00 - 16:00',
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
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : row.status === 'TERLAMBAT'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : row.status === 'BELUM_ABSEN'
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-purple-50 text-purple-700 border-purple-200',
        }))
      : defaultSchedule;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col justify-between h-full min-h-[250px] max-h-[300px]">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <h3 className="text-xs sm:text-sm font-bold text-[#0B3568]">
          Jadwal Mendatang
        </h3>
        <Link
          href="/manager/schedules"
          className="text-[11px] font-semibold text-[#1769AA] hover:underline"
        >
          Lihat Semua →
        </Link>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto my-auto">
        <table className="w-full text-left text-xs text-[#1E293B]">
          <thead className="text-[10px] uppercase font-bold text-[#64748B] border-b border-slate-100 bg-slate-50/50">
            <tr>
              <th scope="col" className="px-4 py-2">Waktu</th>
              <th scope="col" className="px-4 py-2">Operator</th>
              <th scope="col" className="px-4 py-2">Shift</th>
              <th scope="col" className="px-4 py-2">Lokasi</th>
              <th scope="col" className="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-2 font-mono text-[#64748B]">
                  {r.waktu}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={r.operator} size={22} className="shrink-0" />
                    <span className="font-bold text-[#0B3568] truncate max-w-[120px]">{r.operator}</span>
                  </div>
                </td>
                <td className="px-4 py-2 font-medium text-[#334155]">
                  {r.shift}
                </td>
                <td className="px-4 py-2 text-[#64748B] truncate max-w-[100px]">
                  {r.lokasi}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`inline-block text-[9px] font-bold px-2 py-0.2 rounded-full border ${r.statusClass}`}
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
      <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-1.5 overflow-y-auto max-h-[220px]">
        {rows.map((r, idx) => (
          <div key={idx} className="p-2 rounded-lg bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserAvatar name={r.operator} size={24} />
              <div>
                <p className="font-bold text-[#0B3568]">{r.operator}</p>
                <p className="text-[10px] text-slate-400 font-mono">{r.shift} · {r.waktu}</p>
              </div>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${r.statusClass}`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
