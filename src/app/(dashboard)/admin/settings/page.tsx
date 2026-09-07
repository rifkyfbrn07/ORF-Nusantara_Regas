import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: 'Pengaturan Sistem & Database | REGAS FIELDOPS Admin',
  description: 'Monitoring kesehatan database, keamanan sesi, dan konfigurasi sistem REGAS FIELDOPS',
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const startTime = Date.now();
  // Quick database latency ping
  await prisma.$queryRaw`SELECT 1`;
  const dbLatencyMs = Date.now() - startTime;

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
