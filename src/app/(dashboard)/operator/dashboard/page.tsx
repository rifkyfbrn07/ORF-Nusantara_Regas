import React from 'react';
import Link from 'next/link';
import { Calendar, Bell, ChevronRight, Megaphone, MapPin, Clock3 } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { getUserNotifications } from '@/server/services/notificationService';
import { getActiveAnnouncements } from '@/server/services/announcementService';
import { getOperatorYearlyWorkStatistics, getFinalScheduleStates } from '@/server/services/workStatisticsService';
import { getProgramKerjaAnnualChart } from '@/server/services/programKerjaService';
import { formatIndonesianDate, formatJakartaDate, getJakartaNow } from '@/lib/time';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { OperatorDashboardCharts } from './OperatorDashboardCharts';

function getGreeting() {
  const hour = getJakartaNow().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default async function OperatorDashboardPage() {
  const user = await requireAuth();
  const today = formatJakartaDate();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  const [yearlyStats, monthDays, programChart, { notifications }, announcements] = await Promise.all([
    getOperatorYearlyWorkStatistics(user.id, year),
    getFinalScheduleStates(user.id, year, month),
    getProgramKerjaAnnualChart(year),
    getUserNotifications(user.id, 3),
    getActiveAnnouncements(user.id),
  ]);

  const monthStats = yearlyStats.perMonth[month - 1] ?? { work: 0, pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0, noData: 0, month };
  const todaySchedule = monthDays.find((day) => day.date === today) ?? null;
  const nextDays = monthDays.filter((day) => day.date >= today).slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 dashboard-enter">
      {/* 1. HERO GREETING */}
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

      {/* 2. RINGKASAN BULAN INI (jadwal final) */}
      <section className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[#1E456A] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)] card-subtle-hover">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#0088D8]/10 text-[#0088D8] dark:text-[#38BDF8] p-2.5">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#0066B3] dark:text-[#38BDF8]">
              RINGKASAN JADWAL — BULAN INI
            </p>
            <h2 className="mt-1 text-lg font-black text-[#092B57] dark:text-[#F8FAFC]">
              Ringkasan Berdasarkan Jadwal Final
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Dihitung dari jadwal resmi (Cuti/Izin yang disetujui sudah diperhitungkan), bukan asumsi.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:max-w-3xl sm:grid-cols-6">
              <MiniStat label="Pagi" value={monthStats.pagi} color="text-[#0088D8]" />
              <MiniStat label="Malam" value={monthStats.malam} color="text-[#123B6D] dark:text-[#93C5FD]" />
              <MiniStat label="Hari Kerja" value={monthStats.work} color="text-emerald-600 dark:text-emerald-400" />
              <MiniStat label="OFF" value={monthStats.off} color="text-[#E5242A] dark:text-red-400" />
              <MiniStat label="Cuti" value={monthStats.cuti} color="text-amber-600 dark:text-amber-400" />
              <MiniStat label="Izin/Sakit" value={monthStats.izin + monthStats.sakit} color="text-slate-500" />
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
          <Link href="/operator/jadwal-saya" className="flex items-center gap-0.5 text-xs font-bold text-[#0088D8] dark:text-[#38BDF8] hover:underline">
            Buka Jadwal Saya <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-[#EDF2F7] dark:border-[#1A3F63] bg-[#F8FAFC] dark:bg-[#0D2339] p-4 shadow-2xs">
          {todaySchedule ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">JADWAL HARI INI</p>
                <p className="mt-1 text-lg font-black text-[#092B57] dark:text-[#F8FAFC]">{formatTodayTitle(todaySchedule.finalStatus, todaySchedule.shiftName)}</p>
                <p className="text-xs text-text-muted font-mono">
                  {todaySchedule.startTime && todaySchedule.endTime ? `${todaySchedule.startTime} — ${todaySchedule.endTime} WIB` : '—'}
                </p>
              </div>
              <LabelBadge finalStatus={todaySchedule.finalStatus} scheduleStatus={todaySchedule.scheduleStatus} size="lg" />
            </div>
          ) : (
            <p className="text-xs text-text-muted">Tidak ada jadwal kerja hari ini.</p>
          )}
        </div>

        {/* Tabel jadwal */}
        <div className="mt-4 overflow-hidden rounded-xl border border-[#EDF2F7] dark:border-[#1A3F63]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F9FC] dark:bg-[#0A2035] text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:text-[#BFD2E2] border-b border-[#E2E8F0] dark:border-[#1A3F63]">
              <tr>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Hari</th>
                <th className="px-3 py-2">Shift</th>
                <th className="px-3 py-2">Jam</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF2F7] dark:divide-[#1A3F63]">
              {nextDays.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-text-muted">Tidak ada jadwal untuk bulan ini.</td>
                </tr>
              )}
              {nextDays.map((day) => (
                <tr key={day.date} className="hover:bg-[#F8FBFE] dark:hover:bg-[#12314D]">
                  <td className="px-3 py-2 font-mono font-bold text-[#0B3568] dark:text-[#E7F1FA]">{day.date}</td>
                  <td className="px-3 py-2 font-semibold text-text-muted">{day.weekday}, {day.date.slice(8, 10)} {MONTHS[month - 1]}</td>
                  <td className="px-3 py-2 font-bold text-[#123D70] dark:text-[#B9CCDE]">{day.finalStatus === 'OFF' ? '—' : day.shiftName ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-text-muted">{day.finalStatus === 'OFF' ? '—' : day.startTime && day.endTime ? `${day.startTime} - ${day.endTime}` : '—'}</td>
                  <td className="px-3 py-2"><LabelBadge finalStatus={day.finalStatus} scheduleStatus={day.scheduleStatus} size="sm" /></td>
                  <td className="px-3 py-2 text-[10.5px] italic text-text-muted">
                    {day.changed ? <span className="font-bold text-amber-600 dark:text-amber-400 not-italic">Jadwal berubah</span> : ''}
                    {day.notes ? <span className="block max-w-[220px]">&ldquo;{day.notes}&rdquo;</span> : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. GRAFIK */}
      <OperatorDashboardCharts
        programBar={programChart.bar}
        programDonut={programChart.donut}
        monthlyStats={yearlyStats.perMonth}
      />

      {/* 5. NOTIFIKASI + PENGUMUMAN */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[rgba(148,163,184,0.16)] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)] card-subtle-hover">
          <div className="flex items-center justify-between border-b border-[#EDF2F7] dark:border-[#1A3F63] pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#0088D8]/10 text-[#0088D8] dark:text-[#38BDF8] p-2"><Bell className="h-4 w-4" /></div>
              <h3 className="text-sm font-black text-[#092B57] dark:text-[#F8FAFC]">Notifikasi Pribadi</h3>
            </div>
            <Link href="/notifications" className="text-xs font-bold text-[#0088D8] dark:text-[#38BDF8] hover:underline">Semua →</Link>
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
            <div className="rounded-xl bg-orange-500/10 text-[#F58220] p-2"><Megaphone className="h-4 w-4" /></div>
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


function formatTodayTitle(finalStatus: string | null, shiftName: string | null): string {
  if (finalStatus === 'OFF') return 'OFF (Libur)';
  if (finalStatus === 'CUTI') return 'CUTI';
  if (finalStatus === 'IZIN') return 'IZIN';
  if (finalStatus === 'SAKIT') return 'SAKIT';
  return shiftName ?? 'Kerja';
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0D2339] border border-[#EDF2F7] dark:border-[#1A3F63] p-3 shadow-2xs">
      <p className="text-[10px] font-bold text-text-muted uppercase">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function LabelBadge({ finalStatus, scheduleStatus, size }: { finalStatus: string | null; scheduleStatus: string; size?: 'sm' | 'lg' }) {
  const base = size === 'lg' ? 'px-2.5 py-1 text-[10.5px]' : 'px-2 py-0.5 text-[9.5px]';
  const cls = `inline-flex rounded-full border font-black ${base}`;
  if (finalStatus === 'CUTI') return <span className={`${cls} bg-amber-50 text-amber-700 border-amber-200`}>CUTI</span>;
  if (finalStatus === 'IZIN') return <span className={`${cls} bg-teal-50 text-teal-700 border-teal-200`}>IZIN</span>;
  if (finalStatus === 'SAKIT') return <span className={`${cls} bg-rose-50 text-rose-700 border-rose-200`}>SAKIT</span>;
  if (finalStatus === 'OFF') return <span className={`${cls} bg-red-50 text-red-600 border-red-200`}>OFF</span>;
  if (finalStatus === 'PAGI' || finalStatus === 'MALAM' || finalStatus === 'WORK') {
    return <span className={`${cls} bg-[#EAF4FC] text-[#0066B3] border-[#BBDFF5]`}>KERJA</span>;
  }
  if (scheduleStatus === 'WORK') return <span className={`${cls} bg-[#EAF4FC] text-[#0066B3] border-[#BBDFF5]`}>KERJA</span>;
  if (scheduleStatus === 'OFF') return <span className={`${cls} bg-red-50 text-red-600 border-red-200`}>OFF</span>;
  return <span className={`${cls} bg-slate-100 text-slate-500 border-slate-200`}>—</span>;
}

