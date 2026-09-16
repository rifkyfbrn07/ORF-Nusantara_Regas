'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface AlertItem {
  id: string | number;
  title: string;
  description: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO';
  link?: string;
  time?: string;
  dotColor?: string;
}

interface OperationalAlertsCardProps {
  alerts?: AlertItem[];
}

export function OperationalAlertsCard({ alerts = [] }: OperationalAlertsCardProps) {
  const defaultAlerts: AlertItem[] = [
    {
      id: 1,
      title: '3 operator belum check-in',
      description: 'Perlu tindakan segera',
      time: '12 mnt lalu',
      dotColor: 'bg-[#EF3340]',
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
      dotColor: 'bg-[#0077C8]',
      link: '/manager/requests',
    },
  ];

  const items = alerts.length > 0 ? alerts : defaultAlerts;

  return (
    <div className="card-command-center p-5 flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#EF3340]/10 text-[#EF3340] flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider">
            Operational Alerts
          </h3>
        </div>
        <Link
          href="/manager/attendance"
          className="text-xs font-black text-[#0077C8] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
        >
          Lihat Semua <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Alert List */}
      <div className="space-y-2.5 my-auto py-2">
        {items.slice(0, 3).map((al, idx) => {
          const dotColor =
            al.dotColor ||
            (al.severity === 'CRITICAL'
              ? 'bg-[#EF3340]'
              : al.severity === 'WARNING'
              ? 'bg-[#F58220]'
              : 'bg-[#0077C8]');

          return (
            <Link
              key={al.id || idx}
              href={al.link || '/manager/attendance'}
              className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl hover:bg-[#F4F9FC] dark:hover:bg-[#081D31] border border-transparent hover:border-[#E2E8F0] dark:hover:border-[rgba(120,190,235,0.14)] transition-colors group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 shadow-xs ${dotColor}`} />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#0B3568] dark:text-[#F5FAFF] group-hover:text-[#0077C8] dark:group-hover:text-[#38BDF8] transition-colors truncate">
                    {al.title}
                  </h4>
                  <p className="text-[10.5px] text-[#64748B] dark:text-[#8FA8BF] truncate mt-0.5">
                    {al.description}
                  </p>
                </div>
              </div>

              <span className="text-[10px] text-[#64748B] dark:text-[#8FA8BF] shrink-0 font-medium whitespace-nowrap pt-0.5">
                {al.time || 'Baru saja'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
