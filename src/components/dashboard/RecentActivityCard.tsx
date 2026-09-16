'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ChevronRight } from 'lucide-react';

export interface ActivityItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  dotColor?: string;
  link?: string;
}

interface RecentActivityCardProps {
  activities?: ActivityItem[];
  viewAllHref?: string;
}

export function RecentActivityCard({
  activities = [],
  viewAllHref = '/manager/audit-logs',
}: RecentActivityCardProps) {
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      time: '14:32',
      title: 'Jadwal operator diperbarui',
      subtitle: 'Perubahan jadwal shift malam',
      dotColor: '#0088D8',
    },
    {
      id: '2',
      time: '14:18',
      title: 'Roster shift malam dikonfirmasi',
      subtitle: 'Oleh Operator Roster',
      dotColor: '#69BE28',
    },
    {
      id: '3',
      time: '13:47',
      title: 'Pengguna baru ditambahkan',
      subtitle: 'oleh System Administrator',
      dotColor: '#0088D8',
    },
    {
      id: '4',
      time: '12:36',
      title: 'Absensi operator berhasil',
      subtitle: '19 dari 19 hadir',
      dotColor: '#69BE28',
    },
  ];

  const items = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="card-command-center p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
      {/* 1. Header with View All Link */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider">
            RECENT ACTIVITY
          </h3>
        </div>

        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-black text-[#0077C8] dark:text-[#38A9EA] hover:underline"
        >
          Lihat Semua →
        </Link>
      </div>

      {/* 2. Vertical Timeline List */}
      <div className="space-y-3 my-auto">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.link || viewAllHref}
            className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F4F9FC] dark:hover:bg-[#12314D] transition-colors group cursor-pointer border border-transparent hover:border-[#E2E8F0] dark:hover:border-[rgba(120,190,235,0.12)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Dot & Time */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: item.dotColor || '#0088D8' }}
                />
                <span className="font-mono text-[11px] font-bold text-[#64748B] dark:text-[#8EA7BD]">
                  {item.time}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0B3568] dark:text-[#F5FAFF] truncate group-hover:text-[#0077C8] dark:group-hover:text-[#38A9EA] transition-colors">
                  {item.title}
                </p>
                <p className="text-[10.5px] text-[#64748B] dark:text-[#AFC4D5] truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-[#8FA8BF] dark:text-[#7895AD] group-hover:text-[#0077C8] dark:group-hover:text-[#38A9EA] group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
