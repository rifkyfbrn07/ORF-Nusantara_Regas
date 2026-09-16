import React from 'react';
import Link from 'next/link';
import { Calendar, Bell, ChevronRight, Megaphone, MapPin, Clock3 } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { getOperatorSchedules } from '@/server/services/scheduleService';
import { getUserNotifications } from '@/server/services/notificationService';
import { getActiveAnnouncements } from '@/server/services/announcementService';
import { formatIndonesianDate, formatJakartaDate, getJakartaNow } from '@/lib/time';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';

function getGreeting() {
  const hour = getJakartaNow().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default async function OperatorDashboardPage() {
  const user = await requireAuth();
  const today = formatJakartaDate();
  const schedules = await getOperatorSchedules(user.id, today, 31);
  const [{ notifications }, announcements] = await Promise.all([
    getUserNotifications(user.id, 3),
    getActiveAnnouncements(user.id),
  ]);
  const todaySchedule = schedules.find((schedule) => schedule.date === today);
  const workSchedules = schedules.filter((schedule) => schedule.status === 'WORK');
  const pagi = workSchedules.filter(
    (schedule) =>
      schedule.shift.code.toLowerCase().includes('pagi') || schedule.shift.name.toLowerCase().includes('pagi')
  ).length;
  const malam = workSchedules.filter(
    (schedule) =>
      schedule.shift.code.toLowerCase().includes('malam') || schedule.shift.name.toLowerCase().includes('malam')
  ).length;
  const off = schedules.filter((schedule) => schedule.status === 'OFF').length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 dashboard-enter">
      {/* 1. HERO GREETING (Pertamina OCC Identity) */}
      <section className="relative overflow-hidden rounded-2xl border border-[rgba(15,62,105,0.12)] dark:border-[#1E456A] bg-gradient-to-br from-white via-[#F8FBFE] to-[#EDF5FD] dark:from-[#102B45] dark:via-[#0E263E] dark:to-[#0A1D31] p-5 shadow-[0_4px_20px_rgba(0,102,179,0.06)] sm:p-6">
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full border border-[#0088D8]/10 dark:border-[#0088D8]/15 pointer-events-none" />
        <div className="absolute -top-12 -right-4 w-56 h-56 rounded-full border border-[#69BE28]/10 dark:border-[#69BE28]/15 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={54} status="ONLINE" className="ring-4 ring-white/80 dark:ring-slate-700/50" />
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0088D8]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#69BE28]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5242A]" />
                <span className="text-[9.5px] font-black uppercase tracking-wider text-[#0066B3] dark:text-[#38BDF8] ml-1">
                  OPERATOR WORKSPACE
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#092B57] dark:text-[#F8FAFC]">
                {getGreeting()}, {user.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-text-muted">
                <span>NIP: <strong className="font-mono text-[#092B57] dark:text-[#F8FAFC]">{user.employeeId}</strong></span>
                <span>·</span>
                <span>{user.position}</span>
                <span>·</span>
                <span className="font-mono text-[#0088D8] dark:text-[#38BDF8]">@{user.username}</span>
              </div>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="flex items-center justify-end gap-1 text-xs text-text-muted">
              <MapPin className="h-3.5 w-3.5 text-[#0088D8] dark:text-[#38BDF8]" />
              <strong className="text-[#092B57] dark:text-[#F8FAFC]">ORF Muara Karang</strong>
            </div>
            <span className="mt-0.5 block text-[11px] text-text-muted">{formatIndonesianDate()}</span>
          </div>
        </div>
      </section>

      {/* 2. SCHEDULE ATTENDANCE SUMMARY */}
      <section className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[#1E456A] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)] card-subtle-hover">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#0088D8]/10 text-[#0088D8] dark:text-[#38BDF8] p-2.5">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#0066B3] dark:text-[#38BDF8]">
              SCHEDULE ATTENDANCE SUMMARY
            </p>
            <h2 className="mt-1 text-lg font-black text-[#092B57] dark:text-[#F8FAFC]">
              Ringkasan Kehadiran Berdasarkan Jadwal
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Check-in/check-out belum menjadi sumber actual attendance penuh. Angka di bawah membaca jadwal kerja Anda.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:max-w-md">
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0D2339] border border-[#EDF2F7] dark:border-[#1A3F63] p-3 shadow-2xs">
                <p className="text-[10px] font-bold text-text-muted uppercase">Pagi</p>
                <p className="mt-1 text-xl font-black text-[#0088D8] dark:text-[#38BDF8]">{pagi}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0D2339] border border-[#EDF2F7] dark:border-[#1A3F63] p-3 shadow-2xs">
                <p className="text-[10px] font-bold text-text-muted uppercase">Malam</p>
                <p className="mt-1 text-xl font-black text-[#123B6D] dark:text-[#93C5FD]">{malam}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0D2339] border border-[#EDF2F7] dark:border-[#1A3F63] p-3 shadow-2xs">
                <p className="text-[10px] font-bold text-text-muted uppercase">OFF</p>
                <p className="mt-1 text-xl font-black text-[#E5242A] dark:text-red-400">{off}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. JADWAL SAYA */}
      <section className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[rgba(148,163,184,0.16)] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)] card-subtle-hover">
        <div className="flex items-center justify-between border-b border-[#EDF2F7] dark:border-[#1A3F63] pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#0088D8]/10 text-[#0088D8] dark:text-[#38BDF8] p-2">
              <Calendar className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-[#092B57] dark:text-[#F8FAFC]">Jadwal Saya</h3>
          </div>
          <Link href="/operator/schedule" className="flex items-center gap-0.5 text-xs font-bold text-[#0088D8] dark:text-[#38BDF8] hover:underline">
            Lihat Kalender <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-[#EDF2F7] dark:border-[#1A3F63] bg-[#F8FAFC] dark:bg-[#0D2339] p-4 shadow-2xs">
          {todaySchedule ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">JADWAL HARI INI</p>
                <p className="mt-1 text-lg font-black text-[#092B57] dark:text-[#F8FAFC]">{todaySchedule.shift.name}</p>
                <p className="text-xs text-text-muted font-mono">{todaySchedule.shift.startTime} — {todaySchedule.shift.endTime} WIB</p>
              </div>
              <StatusBadge status={todaySchedule.status} label={todaySchedule.status === 'WORK' ? 'KERJA' : 'OFF'} size="lg" />
            </div>
          ) : (
            <p className="text-xs text-text-muted">Tidak ada jadwal kerja hari ini.</p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {schedules.slice(0, 6).map((schedule) => (
            <div key={schedule.id} className="flex items-center justify-between rounded-xl border border-[#EDF2F7] dark:border-[#1A3F63] bg-white dark:bg-[#0E2742] p-3 text-xs shadow-2xs">
              <div>
                <p className="font-bold text-[#092B57] dark:text-[#F8FAFC]">{schedule.date}</p>
                <p className="text-[11px] text-text-muted">{schedule.shift.name}</p>
              </div>
              <StatusBadge status={schedule.status} label={schedule.status === 'WORK' ? 'KERJA' : 'OFF'} size="sm" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. NOTIFIKASI + PENGUMUMAN */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[rgba(148,163,184,0.16)] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)] card-subtle-hover">
          <div className="flex items-center justify-between border-b border-[#EDF2F7] dark:border-[#1A3F63] pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#0088D8]/10 text-[#0088D8] dark:text-[#38BDF8] p-2">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black text-[#092B57] dark:text-[#F8FAFC]">Notifikasi Pribadi</h3>
            </div>
            <Link href="/notifications" className="text-xs font-bold text-[#0088D8] dark:text-[#38BDF8] hover:underline">
              Semua →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {notifications.length ? (
              notifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#EDF2F7] dark:border-[#1A3F63] bg-[#F8FAFC] dark:bg-[#0D2339] p-3 shadow-2xs">
                  <p className="text-xs font-bold text-[#092B57] dark:text-[#F8FAFC]">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{item.message}</p>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-text-muted">Belum ada notifikasi baru.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[rgba(148,163,184,0.16)] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)] card-subtle-hover">
          <div className="flex items-center gap-2 border-b border-[#EDF2F7] dark:border-[#1A3F63] pb-3">
            <div className="rounded-xl bg-orange-500/10 text-[#F58220] p-2">
              <Megaphone className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-[#092B57] dark:text-[#F8FAFC]">Pengumuman Operasional</h3>
          </div>
          <div className="mt-3 space-y-2">
            {announcements.length ? (
              announcements.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-xl border border-[#EDF2F7] dark:border-[#1A3F63] bg-[#F8FAFC] dark:bg-[#0D2339] p-3 shadow-2xs">
                  <p className="text-xs font-bold text-[#092B57] dark:text-[#F8FAFC]">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{item.message}</p>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-text-muted">Belum ada pengumuman aktif.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
