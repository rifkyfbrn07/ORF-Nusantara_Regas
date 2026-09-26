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
  ArrowRight,
  Info,
  CalendarClock,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { HeroCommandCenter } from '@/components/dashboard/HeroCommandCenter';
import { WorkforceOverviewCard } from '@/components/dashboard/WorkforceOverviewCard';
import { OperationalPulseCard } from '@/components/dashboard/OperationalPulseCard';
import { FacilityStatusCard } from '@/components/dashboard/FacilityStatusCard';
import { TodayScheduleCard } from '@/components/dashboard/TodayScheduleCard';
import { RecentActivityCard, ActivityItem } from '@/components/dashboard/RecentActivityCard';
import { getProgramKerjaStats, getProgramKerjaAnnualChart } from '@/server/services/programKerjaService';
import { getScheduleSummary } from '@/server/services/scheduleSummaryService';
import { AdminDashboardCharts } from './AdminDashboardCharts';

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const year = Number(today.slice(0, 4));

  const [
    totalUsers,
    activeUsers,
    managerCount,
    operatorCount,
    adminCount,
    inactiveUsers,
    todaySchedules,
    programStats,
    programChart,
    scheduleSummary,
    recentAuditLogs,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'MANAGER', isActive: true } }),
    prisma.user.count({ where: { role: 'OPERATOR', isActive: true } }),
    prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.schedule.findMany({
      where: { date: today },
      select: { status: true, shift: { select: { code: true, name: true } } },
    }),
    getProgramKerjaStats(year),
    getProgramKerjaAnnualChart(year),
    getScheduleSummary(year),
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

  // Jadwal hari ini counts
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

  // Jam kerja resmi diambil dari tabel Shift (bukan hardcode) agar konsisten.
  const orfShifts = await prisma.shift.findMany({
    where: { code: { in: ['ORF_PAGI', 'ORF_MALAM', 'ORF_OFF'] } },
    select: { code: true, startTime: true, endTime: true },
  });
  const waktuPagi = orfShifts.find((s) => s.code === 'ORF_PAGI');
  const waktuMalam = orfShifts.find((s) => s.code === 'ORF_MALAM');
  const orfOff = orfShifts.find((s) => s.code === 'ORF_OFF');

  // Detail jadwal hari ini — data REAL (tanpa fallback angka karangan).
  const scheduleRows = [
    {
      waktu: waktuPagi ? `${waktuPagi.startTime} - ${waktuPagi.endTime}` : '07:00 - 19:00',
      shift: 'Pagi',
      jumlahOperator: todayCounts.pagi,
      status: 'Normal',
    },
    {
      waktu: waktuMalam ? `${waktuMalam.startTime} - ${waktuMalam.endTime}` : '19:00 - 07:00',
      shift: 'Malam',
      jumlahOperator: todayCounts.malam,
      status: 'Normal',
    },
    {
      waktu: orfOff && orfOff.startTime === orfOff.endTime ? '00:00 - 24:00' : 'OFF',
      shift: 'OFF',
      jumlahOperator: todayCounts.off,
      status: 'Libur',
    },
  ];

  const recentActivities: ActivityItem[] = recentAuditLogs.map((log) => {
    const timeStr = new Date(log.createdAt).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      id: log.id,
      time: timeStr,
      title: log.action.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
      subtitle: `${log.user?.name || 'System'} · ${log.entity}`,
      dotColor: log.action.includes('DELETE') ? '#EF3340' : log.action.includes('CREATE') ? '#22A65A' : '#0077C8',
      link: '/manager/audit-logs',
    };
  });

  const quickLinks = [
    { label: 'Kelola Pengguna', href: '/admin/users', icon: Users, tone: 'bg-blue-50 text-[#0077C8] dark:bg-blue-500/15 dark:text-[#38BDF8]' },
    { label: 'Tambah Pengguna', href: '/admin/users/create', icon: UserPlus, tone: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400' },
    { label: 'Jadwal Kerja', href: '/manager/schedules', icon: CalendarDays, tone: 'bg-blue-50 text-[#006FB9] dark:bg-blue-500/15 dark:text-blue-400' },
    { label: 'Jadwal Operator', href: '/manager/jadwal-operator', icon: CalendarClock, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
    { label: 'Program Kerja', href: '/manager/program-kerja', icon: Target, tone: 'bg-orange-50 text-[#F58220] dark:bg-orange-500/15 dark:text-orange-400' },
    { label: 'Notifikasi Personal', href: '/manager/notifications', icon: Bell, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  ];

  return (
    <div className="space-y-6 dashboard-enter">
      {/* 1. HERO COMMAND CENTER BANNER (Matching Visual Reference) */}
      <HeroCommandCenter
        userName={admin.name}
        facilityName="ORF Muara Karang"
        facilityStatus="OCC READY"
      />

      {/* 2. ROW 1: WORKFORCE OVERVIEW, OPERATIONAL PULSE, FACILITY STATUS (3 Equal Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Workforce Overview */}
        <WorkforceOverviewCard
          totalUsers={totalUsers}
          operatorCount={operatorCount}
          managerCount={managerCount}
          adminCount={adminCount}
          activeUsers={activeUsers}
          inactiveUsers={inactiveUsers}
        />

        {/* Card 2: Operational Pulse */}
        <OperationalPulseCard
          totalToday={todayCounts.total}
          pagiCount={todayCounts.pagi}
          malamCount={todayCounts.malam}
          offCount={todayCounts.off}
        />

        {/* Card 3: Facility Status */}
        <FacilityStatusCard
          facilityName="FSRU JAWA BARAT"
          vesselStatus="Operational"
          occStatus="READY"
          orfStatus="ACTIVE"
          detailsLink="/manager/workforce"
        />
      </div>

      {/* 3. ROW 2: JADWAL HARI INI (8 Cols) + RECENT ACTIVITY (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Jadwal Hari Ini Table Card */}
        <div className="lg:col-span-8 min-w-0">
          <TodayScheduleCard
            dateLabel={dateLabel}
            totalJadwal={todayCounts.total}
            shiftPagi={todayCounts.pagi}
            shiftMalam={todayCounts.malam}
            offCount={todayCounts.off}
            scheduleRows={scheduleRows}
            viewAllHref="/manager/schedules"
          />
        </div>

        {/* Recent Activity Card */}
        <div className="lg:col-span-4 min-w-0">
          <RecentActivityCard
            activities={recentActivities}
            viewAllHref="/manager/audit-logs"
          />
        </div>
      </div>

      {/* 4. PROGRAM KERJA — TARGET TAHUNAN */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Target className="h-4 w-4" />} label={`Program Kerja ${year} — Target Tahunan`} />
          <Link href="/manager/program-kerja" className="text-xs font-black text-[#0077C8] dark:text-[#38BDF8] hover:underline flex items-center gap-1">
            Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total Program" value={String(programStats.total)} variant="blue" index={0} />
          <KpiCard label="Plan" value={String(programStats.plan)} variant="slate" index={1} />
          <KpiCard label="Realisasi" value={String(programStats.realisasi)} variant="green" index={2} />
          <KpiCard label="Tidak Terealisasi" value={String(programStats.belumTerealisasi)} variant="red" index={3} />
          <KpiCard label="Progress" value={`${programStats.avgProgress}%`} variant="orange" index={4} />
        </div>

        <div className="mt-4">
          <AdminDashboardCharts
            programBar={programChart.bar}
            programDonut={programChart.donut}
            scheduleSummary={scheduleSummary.perMonth.map((m) => ({ month: m.monthLabel, pagi: m.pagi, malam: m.malam, off: m.off, cuti: m.cuti, izin: m.izin, sakit: m.sakit }))}
          />
        </div>
        <p className="mt-1 text-[10.5px] font-semibold text-[#64748B] dark:text-[#8FA8BF] flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-[#0077C8] dark:text-[#38BDF8]" />
          Grafik kehadiran dihitung dari jadwal kerja (bukan check-in website). P = Plan, R = Realisasi.
        </p>
      </div>

      {/* 5. ATTENDANCE SCHEDULE SUMMARY + QUICK ACCESS & USER BARU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Attendance Schedule Summary */}
        <div className="card-command-center p-5 space-y-4">
          <SectionTitle icon={<BarChart3 className="h-4 w-4" />} label="Attendance Schedule Summary" />
          <div className="grid grid-cols-2 gap-2.5">
            <MiniStat label="Hari Kerja Terjadwal" value={scheduleSummary.totals.totalScheduled} color="text-[#0B3568] dark:text-[#F5FAFF]" />
            <MiniStat label="Jadwal Pagi" value={scheduleSummary.totals.pagi} color="text-[#0077C8] dark:text-[#38BDF8]" />
            <MiniStat label="Jadwal Malam" value={scheduleSummary.totals.malam} color="text-[#123D70] dark:text-[#93C5FD]" />
            <MiniStat label="Hari Off" value={scheduleSummary.totals.off} color="text-[#64748B] dark:text-[#8FA8BF]" />
          </div>
          <p className="text-[10px] font-semibold text-[#64748B] dark:text-[#8FA8BF] leading-relaxed">
            Ringkasan Kehadiran Berdasarkan Jadwal tahun {year} — check-in aktual belum dijadikan dasar perhitungan.
          </p>
        </div>

        {/* Quick Access Links */}
        <div className="card-command-center p-5 space-y-4">
          <SectionTitle icon={<Sparkles className="h-4 w-4" />} label="Akses Cepat" />
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] hover:border-[#0077C8] dark:hover:border-[#38BDF8] hover:bg-[#F4F9FC] dark:hover:bg-[#102E48] transition"
              >
                <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${q.tone}`}>
                  <q.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] font-bold text-[#0B3568] dark:text-[#F5FAFF] leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pengguna Terbaru */}
        <div className="card-command-center p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)]">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#0077C8] dark:text-[#38BDF8]" />
              <span className="text-xs font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase">Pengguna Terbaru</span>
            </div>
            <Link href="/admin/users" className="text-xs font-bold text-[#0077C8] dark:text-[#38BDF8] hover:underline">
              Semua →
            </Link>
          </div>
          <div className="divide-y divide-[#E2E8F0] dark:divide-[rgba(120,190,235,0.12)]">
            {recentUsers.slice(0, 4).map((u) => (
              <div key={u.id} className="py-2 flex items-center gap-2.5 hover:bg-[#0077C8]/5 transition">
                <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#0B3568] dark:text-[#F5FAFF] truncate">
                    {u.name}
                  </div>
                  <div className="text-[9.5px] text-[#64748B] dark:text-[#8FA8BF]">{u.position}</div>
                </div>
                <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full border ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200 dark:border-purple-700' : u.role === 'MANAGER' ? 'bg-blue-50 text-[#0077C8] dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-700' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'}`}>
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
    <div className="flex items-center gap-2">
      <span className="h-6 w-6 rounded-lg bg-[#0077C8]/10 text-[#0077C8] dark:text-[#38BDF8] flex items-center justify-center shrink-0 shadow-2xs">
        {icon}
      </span>
      <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#0B3568] dark:text-[#F5FAFF]">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[#D0DFEF] dark:from-[rgba(120,190,235,0.2)] to-transparent ml-2" />
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-[#F4F9FC] dark:bg-[#081D31] px-3 py-2 shadow-2xs">
      <div className="text-[9px] font-extrabold uppercase tracking-wide text-[#64748B] dark:text-[#8FA8BF] leading-tight">{label}</div>
      <div className={`text-lg font-black tabular-nums mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
