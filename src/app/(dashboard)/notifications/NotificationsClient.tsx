'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { markAllNotificationsReadAction, markNotificationReadAction } from '@/server/actions/notificationActions';
import { useRouter } from 'next/navigation';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

interface NotificationsClientProps {
  initialNotifications: NotificationItem[];
  unreadCount: number;
}

export function NotificationsClient({
  initialNotifications,
  unreadCount,
}: NotificationsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMarkAllRead = async () => {
    setLoading(true);
    await markAllNotificationsReadAction();
    setLoading(false);
    router.refresh();
  };

  const handleItemClick = async (notifId: string) => {
    await markNotificationReadAction(notifId);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#64748B]">
          {initialNotifications.length} Total Notifikasi ({unreadCount} Belum Dibaca)
        </span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={loading}
            className="px-3.5 py-1.5 bg-[#EAF0F8] hover:bg-[#123E7A] hover:text-white text-[#123E7A] text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Notification items */}
      <div className="bg-white rounded-2xl border border-[#DCE6F2] shadow-xs divide-y divide-[#F1F5F9] overflow-hidden">
        {initialNotifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            Belum ada notifikasi yang tersimpan.
          </div>
        ) : (
          initialNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start justify-between gap-4 transition hover:bg-[#F8FAFC] ${
                !n.isRead ? 'bg-[#EAF0F8]/30' : ''
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl font-bold shrink-0 mt-0.5 ${
                    !n.isRead ? 'bg-[#123E7A] text-white shadow-xs' : 'bg-slate-100 text-[#64748B]'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm ${!n.isRead ? 'font-black text-[#0F2F63]' : 'font-semibold text-[#172033]'}`}>
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-[#F58220] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed max-w-2xl">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-[#94A3B8] font-mono block pt-0.5">
                    {new Date(n.createdAt).toLocaleString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })} WIB
                  </span>
                </div>
              </div>

              {n.link && (
                <Link
                  href={n.link}
                  onClick={() => handleItemClick(n.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#EAF0F8] hover:bg-[#123E7A] hover:text-white text-[#123E7A] text-xs font-bold flex items-center gap-1 shrink-0 transition"
                >
                  <span>Buka</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
