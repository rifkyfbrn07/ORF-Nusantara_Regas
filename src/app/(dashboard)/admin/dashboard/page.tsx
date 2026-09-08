import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { ScheduleStatus } from '@prisma/client';
import {
  Users,
  UserPlus,
  CalendarDays,
  Target,
  Bell,
  ClipboardList,
  ArrowRight,
  Clock,
  Info,
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FsuVesselIllustration } from '@/components/branding/FsuVesselIllustration';
import { getProgramKerjaStats, getProgramKerjaAnnualChart } from '@/server/services/programKerjaService';
import { getScheduleSummary } from '@/server/services/scheduleSummaryService';
import { getNotificationStats } from '@/server/services/notificationService';
import { AdminDashboardCharts } from './AdminDashboardCharts';

function getGreeting(): string {
  const hour = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false });
  const h = Number(hour);
  if (h >= 4 && h < 11) return 'Selamat pagi';
  if (h >= 11 && h < 15) return 'Selamat siang';
  if (h >= 15 && h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const year = Number(today.slice(0, 4));

  const [
    totalUsers,
    activeUsers,
    managerCount,
    operatorCount,
    inactiveUsers,
    todaySchedules,
    programStats,
    programChart,
    scheduleSummary,
    notifStats,
    recentAuditLogs,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'MANAGER', isActive: true } }),
    prisma.user.count({ where: { role: 'OPERATOR', isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.schedule.findMany({
      where: { date: today },
      select: { status: true, shift: { select: { code: true, name: true } } },
    }),
    getProgramKerjaStats(year),
    getProgramKerjaAnnualChart(year),
    getScheduleSummary(year),
    getNotificationStats(),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, role: true } } },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { department: true },
    }),
  ]);

  // Jadwal hari ini: dihitung berdasarkan SHIFT (bukan check-in website)
  const todayCounts = { pagi: 0, malam: 0, off: 0, total: todaySchedules.length };
  for (const s of todaySchedules) {
    const code = (s.shift?.code || '').toLowerCase();
    const name = (s.shift?.name || '').toLowerCase();
    if (code.includes('pagi') || name.includes('pagi')) todayCounts.pagi += 1;
    else if (code.includes('malam') || name.includes('malam')) todayCounts.malam += 1;
    else if (code.includes('off') || name.includes('off') || s.status === ScheduleStatus.OFF) todayCounts.off += 1;
  }

  const dateLabel = new Date(`${today}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const quickLinks = [
    { label: 'Kelola Pengguna', href: '/admin/users', icon: Users, tone: 'bg-[#EAF4FC] text-[#0066B3]' },
    { label: 'Tambah Pengguna', href: '/admin/users/create', icon: UserPlus, tone: 'bg-purple-50 text-purple-600' },
    { label: 'Jadwal Kerja', href: '/manager/schedules', icon: CalendarDays, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Jadwal Operator', href: '/manager/jadwal-operator', icon: CalendarClock, tone: 'bg-sky-50 text-sky-600' },
    { label: 'Program Kerja', href: '/manager/program-kerja', icon: Target, tone: 'bg-orange-50 text-[#F58220]' },
    { label: 'Notifikasi Personal', href: '/manager/notifications', icon: Bell, tone: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6 dashboard-enter">
      {/* HERO (greeting + FSRU kecil — dashboard tetap dominan putih) */}
      <div className="relative bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 relative z-10">
          <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
            Distribusi Gas &amp; ORF · Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#092B57] tracking-tight mt-1">
            {getGreeting()}, {admin.name.split(' ')[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-[#5F718A] font-medium mt-1">
            {dateLabel} — ringkasan menyeluruh sistem operasional.
          </p>
        </div>
        <div className="absolute bottom-0 right-0 left-0 pointer-events-none opacity-[0.15]">
          <FsuVesselIllustration className="w-full min-w-[700px] h-auto ml-auto" />
        </div>
      </div>

      {/* KPI WORKFORCE */}
      <div>
        <SectionTitle icon={<Users className="h-3.5 w-3.5" />} label="Workforce" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-2.5">
          <KpiCard label="Total User" value={String(totalUsers)} variant="blue" />
          <KpiCard label="Operator" value={String(operatorCount)} variant="navy" />
          <KpiCard label="Manager" value={String(managerCount)} variant="blue" />
          <KpiCard label="User Aktif" value={String(activeUsers)} variant="green" />
          <KpiCard label="User Inactive" value={String(inactiveUsers)} variant="red" />
        </div>
      </div>

      {/* JADWAL HARI INI + NOTIFIKASI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-5">
          <SectionTitle icon={<CalendarDays className="h-3.5 w-3.5" />} label={`Jadwal Hari Ini — ${dateLabel}`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <MiniStat label="Total Jadwal" value={todayCounts.total} color="text-[#0B3568]" />
            <MiniStat label="Shift Pagi" value={todayCounts.pagi} color="text-[#0066B3]" />
            <MiniStat label="Shift Malam" value={todayCounts.malam} color="text-[#123B6D]" />
            <MiniStat label="Off" value={todayCounts.off} color="text-slate-500" />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/manager/schedules" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0066B3] hover:underline">
              Kelola Jadwal <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/manager/jadwal-operator" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0066B3] hover:underline">
              Roster Jadwal Operator <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-5">
          <SectionTitle icon={<Bell className="h-3.5 w-3.5" />} label="Notification" />
          <div className="space-y-2 mt-3">
            <MiniRow label="Unread Notification" value={notifStats.unread} dotClass="bg-[#E1251B]" />
            <MiniRow label="Total Notification" value={notifStats.total} dotClass="bg-[#0066B3]" />
            <MiniRow label="Announcement Aktif" value={notifStats.announcements} dotClass="bg-emerald-500" />
          </div>
          <Link href="/manager/notifications" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0066B3] hover:underline">
            Kirim Notifikasi Personal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* PROGRAM KERJA — TARGET TAHUNAN */}
      <div>
        <SectionTitle icon={<Target className="h-3.5 w-3.5" />} label={`Program Kerja ${year} — Target Tahunan`} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-2.5">
          <KpiCard label="Total Program" value={String(programStats.total)} variant="blue" />
          <KpiCard label="Plan" value={String(programStats.plan)} variant="slate" />
          <KpiCard label="Realisasi" value={String(programStats.realisasi)} variant="green" />
          <KpiCard label="Tidak Terealisasi" value={String(programStats.belumTerealisasi)} variant="red" />
          <KpiCard label="Progress" value={`${programStats.avgProgress}%`} variant="orange" />
        </div>
        <div className="mt-4">
          <AdminDashboardCharts
            programBar={programChart.bar}
            programDonut={programChart.donut}
            scheduleSummary={scheduleSummary.perMonth.map((m) => ({ month: m.monthLabel, pagi: m.pagi, malam: m.malam, off: m.off }))}
          />
        </div>
        <p className="mt-2.5 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          <Info className="h-3 w-3" /> Grafik kehadiran dihitung dari jadwal kerja (bukan check-in website). P = Plan, R = Realisasi.
        </p>
        <Link href="/manager/program-kerja" className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0066B3] hover:underline">
          Kelola Program Kerja <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ATTENDANCE SCHEDULE SUMMARY + AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-5">
          <SectionTitle icon={<BarChart3 className="h-3.5 w-3.5" />} label="Attendance Schedule Summary" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <MiniStat label="Hari Kerja Terjadwal" value={scheduleSummary.totals.totalScheduled} color="text-[#0B3568]" />
            <MiniStat label="Jadwal Pagi" value={scheduleSummary.totals.pagi} color="text-[#0066B3]" />
            <MiniStat label="Jadwal Malam" value={scheduleSummary.totals.malam} color="text-[#123B6D]" />
            <MiniStat label="Hari Off" value={scheduleSummary.totals.off} color="text-slate-500" />
          </div>
          <p className="text-[10px] font-semibold text-slate-400 mt-3 leading-relaxed">
            Ringkasan Kehadiran Berdasarkan Jadwal tahun {year} — check-in aktual belum dijadikan dasar perhitungan.
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EDF2F7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#0066B3]" />
              <span className="text-sm font-black text-[#092B57]">Aktivitas Terakhir (Audit Log)</span>
            </div>
            <Link href="/manager/audit-logs" className="text-[11px] font-bold text-[#0066B3] hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="px-5 py-2.5 flex items-center gap-3">
                <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#0B3568]">{log.action.replaceAll('_', ' ')}</div>
                  <div className="text-[10px] text-slate-400">{log.user?.name || 'System'} · {log.entity}</div>
                </div>
                <span className="text-[9.5px] text-slate-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK LINKS + USER BARU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-5">
          <SectionTitle icon={<Info className="h-3.5 w-3.5" />} label="Akses Cepat" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#0066B3]/40 hover:bg-[#F8FBFE] transition"
              >
                <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${q.tone}`}>
                  <q.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] font-bold text-[#0B3568] leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EDF2F7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#0066B3]" />
              <span className="text-sm font-black text-[#092B57]">Pengguna Terbaru</span>
            </div>
            <Link href="/admin/users" className="text-[11px] font-bold text-[#0066B3] hover:underline">
              Kelola pengguna
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recentUsers.map((u) => (
              <div key={u.id} className="px-5 py-2.5 flex items-center gap-3">
                <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-bold text-[#0B3568] truncate">
                    {u.name} <span className="text-slate-400 font-semibold">@{u.username || '-'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{u.position} · {u.department?.name || '—'}</div>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : u.role === 'MANAGER' ? 'bg-blue-50 text-[#0066B3] border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[#1769AA]">{icon}</span>
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-[#EDF2F7] bg-[#FBFDFE] px-3 py-2.5">
      <div className="text-[9.5px] font-black uppercase tracking-wide text-slate-400 leading-tight">{label}</div>
      <div className={`text-xl font-black tabular-nums mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function MiniRow({ label, value, dotClass }: { label: string; value: number; dotClass: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#EDF2F7] bg-[#FBFDFE] px-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} /> {label}
      </span>
      <span className="text-sm font-black text-[#092B57] tabular-nums">{value}</span>
    </div>
  );
}
