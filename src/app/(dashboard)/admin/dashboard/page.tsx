import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  UserPlus,
  Users,
  Settings,
  Info,
  Clock,
  ArrowRight,
  ShieldCheck,
  Shield,
  Activity,
  KeyRound,
  HardHat,
  UserCog,
  UserCheck,
  UserX,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { getJakartaNow } from '@/lib/time';

function getGreeting(): string {
  const hour = getJakartaNow().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const [
    totalUsers,
    activeUsers,
    adminCount,
    managerCount,
    operatorCount,
    inactiveUsers,
    recentUsers,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),
    prisma.user.count({ where: { role: 'MANAGER', isActive: true } }),
    prisma.user.count({ where: { role: 'OPERATOR', isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { department: true },
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, employeeId: true, role: true } } },
    }),
  ]);

  return (
    <div className="space-y-4 sm:space-y-5 dashboard-enter max-w-[1400px] mx-auto w-full">
      {/* 1. Hero Greeting Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#0066B3] bg-[#EAF4FC] px-2.5 py-0.5 rounded-md">
              ADMINISTRATOR CONTROL CENTER
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
              Sistem Aktif
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F315A] tracking-tight mt-1">
            {getGreeting()}, {admin.name} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5 max-w-2xl">
            Sistem administrasi, hak akses, dan tata kelola akun platform REGAS FIELDOPS.
          </p>
        </div>

        {/* Action Header */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <Link
            href="/admin/about"
            className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 text-[#0F315A] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[#0066B3]" />
            <span>Tentang FIELDOPS</span>
          </Link>

          <Link
            href="/admin/users/create"
            className="px-4 py-2 rounded-xl bg-[#0066B3] hover:bg-[#005596] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Tambah Pengguna</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI Section: System & Account Metrics (6 Compact Cards ~96px) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <KpiCard
          label="TOTAL USERS"
          value={totalUsers}
          iconName="users"
          variant="total"
          subtext="Semua Akun"
          index={0}
        />
        <KpiCard
          label="ACTIVE USERS"
          value={activeUsers}
          iconName="userCheck"
          variant="hadir"
          percent={`${totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%`}
          subtext="Akun Aktif"
          index={1}
        />
        <KpiCard
          label="ADMIN"
          value={adminCount}
          iconName="shield"
          variant="blue"
          subtext="Administrator"
          index={2}
        />
        <KpiCard
          label="MANAGER"
          value={managerCount}
          iconName="userCog"
          variant="terlambat"
          subtext="Pengawas Shift"
          index={3}
        />
        <KpiCard
          label="OPERATOR"
          value={operatorCount}
          iconName="hardHat"
          variant="hadir"
          subtext="Personil Lapangan"
          index={4}
        />
        <KpiCard
          label="INACTIVE USERS"
          value={inactiveUsers}
          iconName="userX"
          variant={inactiveUsers > 0 ? 'belumAbsen' : 'gray'}
          subtext="Akun Nonaktif"
          index={5}
        />
      </div>

      {/* 3. Quick Action Cards (4 Action Tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href="/admin/users/create"
          className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#0066B3] hover:shadow-md transition flex items-center gap-3.5 group"
        >
          <div className="p-3 rounded-xl bg-[#EAF4FC] text-[#0066B3] group-hover:bg-[#0066B3] group-hover:text-white transition">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F315A] group-hover:text-[#0066B3] transition">
              Tambah Pengguna
            </h4>
            <p className="text-[11px] text-[#64748B]">Registrasi akun Manager atau Operator</p>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#0066B3] hover:shadow-md transition flex items-center gap-3.5 group"
        >
          <div className="p-3 rounded-xl bg-[#EAF4FC] text-[#0066B3] group-hover:bg-[#0066B3] group-hover:text-white transition">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F315A] group-hover:text-[#0066B3] transition">
              Kelola Pengguna
            </h4>
            <p className="text-[11px] text-[#64748B]">Edit data, role, & status akun</p>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#0066B3] hover:shadow-md transition flex items-center gap-3.5 group"
        >
          <div className="p-3 rounded-xl bg-[#EAF4FC] text-[#0066B3] group-hover:bg-[#0066B3] group-hover:text-white transition">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F315A] group-hover:text-[#0066B3] transition">
              Pengaturan Sistem
            </h4>
            <p className="text-[11px] text-[#64748B]">Konfigurasi & keamanan platform</p>
          </div>
        </Link>

        <Link
          href="/admin/about"
          className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#0066B3] hover:shadow-md transition flex items-center gap-3.5 group"
        >
          <div className="p-3 rounded-xl bg-[#EAF4FC] text-[#0066B3] group-hover:bg-[#0066B3] group-hover:text-white transition">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F315A] group-hover:text-[#0066B3] transition">
              Tentang FIELDOPS
            </h4>
            <p className="text-[11px] text-[#64748B]">Informasi modul & tujuan sistem</p>
          </div>
        </Link>
      </div>

      {/* 4. Main Content: Recent User Accounts Table (8 cols) + System Activity Audit Logs (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Recent Accounts Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0066B3]" />
              <h2 className="text-xs sm:text-sm font-black text-[#0F315A] uppercase tracking-wide">
                Akun Pengguna Terbaru
              </h2>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-bold text-[#0066B3] hover:underline flex items-center gap-1"
            >
              Lihat Semua Akun <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto my-auto py-1">
            <table className="w-full text-left text-xs text-[#0F172A]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-[#64748B] bg-slate-50/50">
                  <th className="py-2.5 px-3 font-bold">PENGGUNA</th>
                  <th className="py-2.5 px-3 font-bold">EMPLOYEE ID</th>
                  <th className="py-2.5 px-3 font-bold">ROLE</th>
                  <th className="py-2.5 px-3 font-bold">JABATAN</th>
                  <th className="py-2.5 px-3 font-bold">STATUS</th>
                  <th className="py-2.5 px-3 font-bold text-right">DIBUAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={28} />
                        <div>
                          <p className="font-bold text-[#0F315A] leading-tight">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px]">
                      {u.employeeId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : u.role === 'MANAGER'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-[#0066B3] border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[120px]">{u.position}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        status={u.isActive ? 'APPROVED' : 'REJECTED'}
                        label={u.isActive ? 'AKTIF' : 'NONAKTIF'}
                        size="sm"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-right text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-slate-100 py-1 space-y-1.5">
            {recentUsers.map((u) => (
              <div key={u.id} className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={28} />
                  <div>
                    <p className="font-bold text-[#0F315A]">{u.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{u.employeeId} · {u.role}</p>
                  </div>
                </div>
                <StatusBadge
                  status={u.isActive ? 'APPROVED' : 'REJECTED'}
                  label={u.isActive ? 'AKTIF' : 'NONAKTIF'}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* System Activity Audit Logs (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0066B3]" />
              <h2 className="text-xs sm:text-sm font-black text-[#0F315A] uppercase tracking-wide">
                Aktivitas Audit Sistem
              </h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100 my-auto py-1">
            {recentAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada catatan aktivitas.</p>
            ) : (
              recentAuditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                  <div className="p-1 rounded-md bg-[#EAF4FC] text-[#0066B3] shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#0F315A] truncate">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {log.user ? `${log.user.name} (${log.user.role})` : 'System'} · {log.entity}
                    </p>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center shrink-0">
            <span className="text-[10.5px] text-slate-400">
              Audit trail aktif & terlindungi integritasnya.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
