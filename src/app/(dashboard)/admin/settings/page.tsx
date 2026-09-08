import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: 'Pengaturan Sistem & Database | Distribusi Gas & ORF Admin',
  description: 'Monitoring kesehatan database, keamanan sesi, dan konfigurasi sistem Distribusi Gas & ORF',
};

/** Ping database & ukur latensi (dipisah agar aman dari aturan purity render). */
async function pingDatabaseLatency(): Promise<number> {
  const startTime = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return Date.now() - startTime;
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  const dbLatencyMs = await pingDatabaseLatency();

  const [
    totalUsers,
    activeUsers,
    disabledUsers,
    totalAdmins,
    totalManagers,
    totalOperators,
    totalDepartments,
    totalAuditLogs,
    totalSchedules,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'MANAGER' } }),
    prisma.user.count({ where: { role: 'OPERATOR' } }),
    prisma.department.count(),
    prisma.auditLog.count().catch(() => 0),
    prisma.schedule.count().catch(() => 0),
  ]);

  const stats = {
    dbConnected: true,
    dbLatencyMs: Math.max(dbLatencyMs, 12),
    totalUsers,
    activeUsers,
    disabledUsers,
    totalAdmins,
    totalManagers,
    totalOperators,
    totalDepartments,
    totalAuditLogs,
    totalSchedules,
    serverTime:
      new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium',
      }) + ' WIB',
    nodeEnv: process.env.NODE_ENV || 'development',
  };

  return <SettingsClient stats={stats} />;
}
