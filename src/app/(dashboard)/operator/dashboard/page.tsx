import React from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import { getOperatorWorkStatus } from '@/server/services/workStatusService';
import { getOperatorSchedules } from '@/server/services/scheduleService';
import { getUserNotifications } from '@/server/services/notificationService';
import { formatIndonesianDate, formatJakartaDate, getJakartaNow } from '@/lib/time';
import { CheckInButton } from '@/components/attendance/CheckInButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getActiveAnnouncements } from '@/server/services/announcementService';
import { Calendar, Bell, ChevronRight, Megaphone, MapPin } from 'lucide-react';

function getGreeting(): string {
  const hour = getJakartaNow().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default async function OperatorDashboardPage() {
  const user = await requireAuth();
  const todayStr = formatJakartaDate();

  // Strict operator privacy enforcement: fetch ONLY this operator's data
  const [workStatus, upcomingSchedules, { notifications }, announcements] = await Promise.all([
    getOperatorWorkStatus(user.id, todayStr),
    getOperatorSchedules(user.id, todayStr, 4),
    getUserNotifications(user.id, 3),
    getActiveAnnouncements(user.id),
  ]);

  const nextSchedules = upcomingSchedules.filter((s) => s.date !== todayStr);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Operator Profile Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE5EF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            size={54}
            status="ONLINE"
            className="ring-4 ring-[#F3F6FA]"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
                OPERATOR FIELD PORTAL
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#092B57] tracking-tight mt-0.5">
              {getGreeting()}, {user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] font-semibold text-[#5F718A]">
                NIP: <span className="font-mono font-bold text-[#092B57]">{user.employeeId}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-semibold text-[#5F718A]">
                {user.position}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="flex items-center gap-1 text-xs text-[#5F718A] justify-end">
            <MapPin className="w-3.5 h-3.5 text-[#F58220]" />
            <span className="font-bold text-[#092B57]">ORF Muara Karang</span>
          </div>
          <span className="text-[11px] text-[#5F718A] block mt-0.5">{formatIndonesianDate()}</span>
        </div>
      </div>

      {/* Hero Component: "HARI INI SAYA KERJA?" & Presensi Action */}
      <div>
        <CheckInButton statusData={workStatus} />
      </div>

      {/* Two Column Grid: Next Schedule & Quick Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Upcoming Schedules */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EDF4FB] text-[#1769AA]">
                <Calendar className="h-4 w-4" />
              </div>
              <h3 className="font-black text-sm text-[#092B57]">Jadwal Kerja Berikutnya</h3>
            </div>
            <Link
              href="/operator/schedule"
              className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-0.5"
            >
              Lihat Roster <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {nextSchedules.length === 0 ? (
              <p className="text-xs text-[#5F718A] py-4 text-center">Belum ada jadwal berikutnya.</p>
            ) : (
              nextSchedules.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-[#F8FBFE] rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#132238] font-mono">{s.date}</span>
                    <p className="text-[11px] text-[#5F718A]">{s.shift.name} ({s.shift.startTime} - {s.shift.endTime} WIB)</p>
                  </div>
                  <StatusBadge status={s.status} label={s.status === 'WORK' ? 'KERJA' : 'OFF'} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Personal Notifications */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EDF4FB] text-[#1769AA]">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="font-black text-sm text-[#092B57]">Notifikasi Pribadi</h3>
            </div>
            <Link
              href="/notifications"
              className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-0.5"
            >
              Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {notifications.length === 0 ? (
              <p className="text-xs text-[#5F718A] py-4 text-center">Belum ada notifikasi baru.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 bg-[#F8FBFE] rounded-xl border border-slate-200/80 space-y-1 text-xs"
                >
                  <p className="font-bold text-[#092B57] leading-snug">{n.title}</p>
                  <p className="text-[11px] text-[#5F718A] leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Operational Announcements */}
      <section className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-50 text-[#F58220]">
              <Megaphone className="h-4 w-4" />
            </div>
            <h3 className="font-black text-sm text-[#092B57]">Pengumuman Operasional Fasilitas</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">HSSE &amp; Prosedur</span>
        </div>

        {announcements.length ? (
          <div className="space-y-2.5">
            {announcements.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200/80 bg-[#F8FBFE] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#092B57]">{item.title}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.priority === 'URGENT' ? 'bg-red-50 text-red-700 border border-red-200' : item.priority === 'IMPORTANT' ? 'bg-orange-50 text-[#F58220] border border-orange-200' : 'bg-blue-50 text-[#1769AA] border border-blue-200'}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#5F718A] leading-relaxed">{item.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#5F718A] text-center py-4">Belum ada pengumuman operasional aktif.</p>
        )}
      </section>
    </div>
  );
}
