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
  const [{ notifications }, announcements] = await Promise.all([getUserNotifications(user.id, 3), getActiveAnnouncements(user.id)]);
  const todaySchedule = schedules.find((schedule) => schedule.date === today);
  const workSchedules = schedules.filter((schedule) => schedule.status === 'WORK');
  const pagi = workSchedules.filter((schedule) => schedule.shift.code.toLowerCase().includes('pagi') || schedule.shift.name.toLowerCase().includes('pagi')).length;
  const malam = workSchedules.filter((schedule) => schedule.shift.code.toLowerCase().includes('malam') || schedule.shift.name.toLowerCase().includes('malam')).length;
  const off = schedules.filter((schedule) => schedule.status === 'OFF').length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={54} status="ONLINE" className="ring-4 ring-[#F3F6FA]" /><div><span className="text-[10px] font-black uppercase tracking-wider text-[#1769AA]">OPERATOR WORKSPACE</span><h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#092B57]">{getGreeting()}, {user.name}</h1><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#5F718A]"><span>NIP: <strong className="font-mono text-[#092B57]">{user.employeeId}</strong></span><span>·</span><span>{user.position}</span><span>·</span><span className="font-mono text-[#1769AA]">@{user.username}</span></div></div></div>
          <div className="hidden text-right sm:block"><div className="flex items-center justify-end gap-1 text-xs text-[#5F718A]"><MapPin className="h-3.5 w-3.5 text-[#F58220]" /><strong className="text-[#092B57]">ORF Muara Karang</strong></div><span className="mt-0.5 block text-[11px] text-[#5F718A]">{formatIndonesianDate()}</span></div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><Clock3 className="h-5 w-5" /></div><div className="flex-1"><p className="text-[10px] font-black uppercase tracking-wider text-blue-700">SCHEDULE ATTENDANCE SUMMARY</p><h2 className="mt-1 text-lg font-black text-[#092B57]">Ringkasan Kehadiran Berdasarkan Jadwal</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Check-in/check-out belum menjadi sumber actual attendance penuh. Angka di bawah hanya membaca jadwal kerja Anda.</p><div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md"><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-400">Pagi</p><p className="mt-1 text-xl font-black text-blue-700">{pagi}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-400">Malam</p><p className="mt-1 text-xl font-black text-[#123E7A]">{malam}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-400">OFF</p><p className="mt-1 text-xl font-black text-red-600">{off}</p></div></div></div></div></section>

      <section className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><div className="rounded-xl bg-[#EDF4FB] p-2 text-[#1769AA]"><Calendar className="h-4 w-4" /></div><h3 className="text-sm font-black text-[#092B57]">Jadwal Saya</h3></div><Link href="/operator/schedule" className="flex items-center gap-0.5 text-xs font-bold text-[#1769AA] hover:underline">Lihat Kalender <ChevronRight className="h-3.5 w-3.5" /></Link></div><div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">{todaySchedule ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">JADWAL HARI INI</p><p className="mt-1 text-lg font-black text-[#092B57]">{todaySchedule.shift.name}</p><p className="text-xs text-slate-500">{todaySchedule.shift.startTime} — {todaySchedule.shift.endTime} WIB</p></div><StatusBadge status={todaySchedule.status} label={todaySchedule.status === 'WORK' ? 'KERJA' : 'OFF'} size="lg" /></div> : <p className="text-xs text-slate-500">Tidak ada jadwal kerja hari ini.</p>}</div><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{schedules.slice(0, 6).map((schedule) => <div key={schedule.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs"><div><p className="font-bold text-[#092B57]">{schedule.date}</p><p className="text-[11px] text-slate-500">{schedule.shift.name}</p></div><StatusBadge status={schedule.status} label={schedule.status === 'WORK' ? 'KERJA' : 'OFF'} size="sm" /></div>)}</div></section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2"><section className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><div className="rounded-xl bg-[#EDF4FB] p-2 text-[#1769AA]"><Bell className="h-4 w-4" /></div><h3 className="text-sm font-black text-[#092B57]">Notifikasi Pribadi</h3></div><Link href="/notifications" className="text-xs font-bold text-[#1769AA] hover:underline">Semua →</Link></div><div className="mt-3 space-y-2">{notifications.length ? notifications.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 bg-[#F8FBFE] p-3"><p className="text-xs font-bold text-[#092B57]">{item.title}</p><p className="mt-1 text-[11px] leading-relaxed text-[#5F718A]">{item.message}</p></div>) : <p className="py-4 text-center text-xs text-slate-400">Belum ada notifikasi baru.</p>}</div></section><section className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-xs"><div className="flex items-center gap-2 border-b border-slate-100 pb-3"><div className="rounded-xl bg-orange-50 p-2 text-[#F58220]"><Megaphone className="h-4 w-4" /></div><h3 className="text-sm font-black text-[#092B57]">Pengumuman Operasional</h3></div><div className="mt-3 space-y-2">{announcements.length ? announcements.slice(0, 3).map((item) => <div key={item.id} className="rounded-xl border border-slate-200 bg-[#F8FBFE] p-3"><p className="text-xs font-bold text-[#092B57]">{item.title}</p><p className="mt-1 text-[11px] leading-relaxed text-[#5F718A]">{item.message}</p></div>) : <p className="py-4 text-center text-xs text-slate-400">Belum ada pengumuman aktif.</p>}</div></section></div>
    </div>
  );
}
