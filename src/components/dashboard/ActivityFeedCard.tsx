'use client';

import React from 'react';
import Link from 'next/link';

export function ActivityFeedCard() {
  const activities = [
    {
      time: '08:45',
      operator: 'Andi Pratama',
      action: 'Check-in shift pagi',
      status: 'Hadir',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      time: '08:32',
      operator: 'Budi Santoso',
      action: 'Pergantian shift disetujui',
      status: 'Selesai',
      statusBadge: 'bg-blue-50 text-[#1769AA] border-blue-200',
    },
    {
      time: '08:10',
      operator: 'Citra Dewi',
      action: 'Pengajuan cuti',
      status: 'Menunggu',
      statusBadge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-full min-h-[250px] max-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
        <h3 className="text-xs sm:text-sm font-bold text-[#0B3568]">
          Recent Activity
        </h3>
        <Link
          href="/manager/audit-logs"
          className="text-[11px] font-semibold text-[#1769AA] hover:underline"
        >
          Lihat Semua →
        </Link>
      </div>

      {/* Timeline Items */}
      <div className="space-y-2.5 my-auto py-1">
        {activities.map((act, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {/* Time Pill */}
              <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-mono text-[10px] font-bold shrink-0">
                {act.time}
              </span>

              {/* Operator and Action */}
              <div className="min-w-0">
                <p className="font-bold text-[#1E293B] truncate leading-tight text-xs">{act.operator}</p>
                <p className="text-[10px] text-[#64748B] truncate">{act.action}</p>
              </div>
            </div>

            {/* Status Badge */}
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${act.statusBadge}`}
            >
              {act.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
