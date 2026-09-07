import { AttendanceStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getOperatorWorkStatus } from './workStatusService';

export const statusLabels: Record<AttendanceStatus, string> = {
  HADIR: 'Hadir', TERLAMBAT: 'Terlambat', BELUM_ABSEN: 'Belum absen',
  ABSENT: 'Tidak hadir', IZIN: 'Izin', CUTI: 'Cuti', SAKIT: 'Sakit', OFF: 'OFF',
};

export async function getWorkforceMatrix(startDate: string, endDate: string) {
  const operators = await prisma.user.findMany({
    where: { role: Role.OPERATOR, isActive: true },
    select: { id: true, name: true, employeeId: true, position: true },
    orderBy: { name: 'asc' },
  });
  const dates: string[] = [];
  for (let cursor = new Date(`${startDate}T00:00:00+07:00`); cursor <= new Date(`${endDate}T00:00:00+07:00`); cursor.setDate(cursor.getDate() + 1)) {
    dates.push(cursor.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  }
  const rows = await Promise.all(operators.map(async (operator) => ({
    operator,
    statuses: await Promise.all(dates.map(async (date) => (await getOperatorWorkStatus(operator.id, date)).status)),
  })));
  return { dates, rows };
}

export async function getUpcomingWorkSchedules(startDate: string, endDate: string) {
  return prisma.schedule.findMany({
    where: { date: { gte: startDate, lte: endDate }, user: { isActive: true } },
    include: { user: { select: { name: true, employeeId: true } }, shift: true, location: true },
    orderBy: [{ date: 'asc' }, { shift: { startTime: 'asc' } }, { user: { name: 'asc' } }],
  });
}
