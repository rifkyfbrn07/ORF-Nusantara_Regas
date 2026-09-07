import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getUserNotifications } from '@/server/services/notificationService';
import { NotificationsClient } from './NotificationsClient';

export default async function NotificationsPage() {
  const user = await requireAuth();
  const { notifications, unreadCount } = await getUserNotifications(user.id, 50);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Pusat Informasi & Notifikasi
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Notifikasi Sistem Operasional
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pemberitahuan shift, pengingat check-in absensi, konfirmasi permohonan cuti, dan alert pengawasan
        </p>
      </div>

      <NotificationsClient initialNotifications={notifications} unreadCount={unreadCount} />
    </div>
  );
}
