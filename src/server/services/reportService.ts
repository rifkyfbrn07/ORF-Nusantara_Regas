import { prisma } from '@/lib/db/prisma';
import { AttendanceStatus } from '@prisma/client';

export interface ReportSummaryStats {
  totalRecords: number;
  attendanceRate: number; // percentage
  onTimeRate: number; // percentage
  lateCount: number;
  absenceCount: number;
  leaveCount: number;
  permissionCount: number;
  sickCount: number;
  averageLateMinutes: number;
}

export async function getAttendanceAnalytics(startDate: string, endDate: string) {
  const attendances = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: { select: { name: true, employeeId: true, department: true } },
      schedule: { include: { shift: true } },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate summary metrics
  let hadircount = 0;
  let lateCount = 0;
  let absenceCount = 0;
  let leaveCount = 0;
  let permissionCount = 0;
  let sickCount = 0;
  let totalLateMinutes = 0;

  // Group by date for Recharts
  const dateMap: Record<string, { date: string; hadir: number; terlambat: number; absent: number; cuti: number; izin: number; sakit: number }> = {};

  for (const a of attendances) {
    if (!dateMap[a.date]) {
      dateMap[a.date] = { date: a.date, hadir: 0, terlambat: 0, absent: 0, cuti: 0, izin: 0, sakit: 0 };
    }

    switch (a.status) {
      case AttendanceStatus.HADIR:
        hadircount++;
        dateMap[a.date].hadir++;
        break;
      case AttendanceStatus.TERLAMBAT:
        lateCount++;
        totalLateMinutes += a.lateMinutes || 0;
        dateMap[a.date].terlambat++;
        break;
      case AttendanceStatus.ABSENT:
        absenceCount++;
        dateMap[a.date].absent++;
        break;
      case AttendanceStatus.CUTI:
        leaveCount++;
        dateMap[a.date].cuti++;
        break;
      case AttendanceStatus.IZIN:
        permissionCount++;
        dateMap[a.date].izin++;
        break;
      case AttendanceStatus.SAKIT:
        sickCount++;
        dateMap[a.date].sakit++;
        break;
      default:
        break;
    }
  }

  const totalWorkingAttendance = hadircount + lateCount;
  const totalExpected = attendances.length || 1;
  const attendanceRate = Math.round((totalWorkingAttendance / totalExpected) * 100);
  const onTimeRate = totalWorkingAttendance > 0 ? Math.round((hadircount / totalWorkingAttendance) * 100) : 100;
  const averageLateMinutes = lateCount > 0 ? Math.round(totalLateMinutes / lateCount) : 0;

  const trendData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Shift Breakdown
  const shiftDistribution = [
    { name: 'Shift Pagi (06:00 - 14:00)', hadir: 0, terlambat: 0, total: 0 },
    { name: 'Shift Siang (14:00 - 22:00)', hadir: 0, terlambat: 0, total: 0 },
    { name: 'Shift Malam (22:00 - 06:00)', hadir: 0, terlambat: 0, total: 0 },
  ];

  for (const a of attendances) {
    const shiftCode = a.schedule?.shift?.code;
    let idx = 0;
    if (shiftCode === 'SHIFT_SIANG') idx = 1;
    if (shiftCode === 'SHIFT_MALAM') idx = 2;

    shiftDistribution[idx].total++;
    if (a.status === AttendanceStatus.HADIR) shiftDistribution[idx].hadir++;
    if (a.status === AttendanceStatus.TERLAMBAT) shiftDistribution[idx].terlambat++;
  }

  return {
    summary: {
      totalRecords: attendances.length,
      attendanceRate,
      onTimeRate,
      lateCount,
      absenceCount,
      leaveCount,
      permissionCount,
      sickCount,
      averageLateMinutes,
    },
    trendData,
    shiftDistribution,
    attendances,
  };
}
