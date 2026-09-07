'use client';

import React from 'react';
import Link from 'next/link';

interface AlertItem {
  id: string | number;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  link: string;
  time?: string;
}

interface OperationalAlertsCardProps {
  alerts?: AlertItem[];
}

export function OperationalAlertsCard({ alerts = [] }: OperationalAlertsCardProps) {
  const defaultAlerts = [
    {
      id: 1,
      title: '3 operator belum check-in',
      description: 'Perlu tindakan segera',
      time: '12 mnt lalu',
      dotColor: 'bg-[#DC2626]',
      link: '/manager/attendance',
    },
    {
      id: 2,
      title: '2 shift butuh coverage',
      description: 'Shift Pagi & Siang',
      time: '28 mnt lalu',
      dotColor: 'bg-[#F58220]',
      link: '/manager/schedules',
    },
    {
      id: 3,
      title: '1 request cuti pending',
      description: 'Cuti - Andi Pratama',
      time: '1 jam lalu',
      dotColor: 'bg-[#1769AA]',
      link: '/manager/requests',
    },
  ];

  const items = alerts.length > 0 ? alerts : defaultAlerts;

  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-full min-h-[250px] max-h-[290px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
        <h3 className="text-xs sm:text-sm font-bold text-[#0B3568]">
          Operational Alerts
        </h3>
        <Link
          href="/manager/attendance"
          className="text-[11px] font-semibold text-[#1769AA] hover:underline"
        >
          Lihat Semua →
        </Link>
      </div>

      {/* Alert List */}
      <div className="space-y-2 my-auto py-1">
        {items.slice(0, 3).map((al, idx) => {
          const dotColor =
            'dotColor' in al
              ? al.dotColor
              : al.severity === 'CRITICAL'
              ? 'bg-[#DC2626]'
              : al.severity === 'WARNING'
              ? 'bg-[#F58220]'
              : 'bg-[#1769AA]';

          return (
            <Link
              key={al.id || idx}
              href={al.link || '/manager/attendance'}
              className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] transition-colors group"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dotColor}`} />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-[#1769AA] transition-colors truncate">
                    {al.title}
                  </h4>
                  <p className="text-[10px] text-[#64748B] truncate">
                    {al.description}
                  </p>
                </div>
              </div>

              <span className="text-[9.5px] text-slate-400 shrink-0 font-medium whitespace-nowrap pt-0.5">
                {al.time || 'Baru saja'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
