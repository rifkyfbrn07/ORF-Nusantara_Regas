import { prisma } from '@/lib/db/prisma';
import { formatJakartaDate, formatJakartaTime } from '@/lib/time';
import { AttendanceStatus, ScheduleStatus } from '@prisma/client';

export interface ShiftCoverageData {
  shift: {
    id: string;
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    requiredCount: number;
  };
  required: number;
  assigned: number;
  present: number;
  missing: number;
  coveragePercentage: number;
  status: 'FULL' | 'WARNING' | 'CRITICAL';
  warningMessage: string | null;
  assignedOperators: {
    id: string;
    name: string;
    employeeId: string;
    status: AttendanceStatus;
    checkInTime: string;
  }[];
}

/**
 * Calculates current active shift and its coverage metrics for today
 */
export async function getCurrentShiftCoverage(dateStr: string = formatJakartaDate()): Promise<ShiftCoverageData | null> {
  const shifts = await prisma.shift.findMany({
    where: { isActive: true },
    orderBy: { startTime: 'asc' },
  });

  if (shifts.length === 0) return null;

  // Determine current active shift based on current time (HH:mm in Jakarta)
  const currentJakartaTime = formatJakartaTime(new Date()); // e.g. "08:30"
  
  // Find current shift
  let activeShift = shifts.find((s) => {
    if (s.endTime > s.startTime) {
      return currentJakartaTime >= s.startTime && currentJakartaTime < s.endTime;
    } else {
      // Overnight shift (e.g. 22:00 to 06:00)
      return currentJakartaTime >= s.startTime || currentJakartaTime < s.endTime;
    }
  });

  // Fallback to first shift if none explicitly active
  if (!activeShift) {
    activeShift = shifts[0];
  }

  return getCoverageForShift(activeShift.id, dateStr);
}

/**
 * Calculates coverage for a specific shift and date
 */
export async function getCoverageForShift(shiftId: string, dateStr: string = formatJakartaDate()): Promise<ShiftCoverageData | null> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) return null;

  // Get all schedules for this shift on this date
  const schedules = await prisma.schedule.findMany({
    where: {
      shiftId,
      date: dateStr,
      status: ScheduleStatus.WORK,
    },
    include: {
      user: true,
      attendances: true,
    },
  });

  const required = shift.requiredCount || 8;
  const assigned = schedules.length;
  let present = 0;

  const assignedOperators = schedules.map((s) => {
    const att = s.attendances?.[0];
    const isPresent = att && att.checkIn !== null;
    if (isPresent) present++;

    return {
      id: s.user.id,
      name: s.user.name,
      employeeId: s.user.employeeId,
      status: att?.status || AttendanceStatus.BELUM_ABSEN,
      checkInTime: formatJakartaTime(att?.checkIn),
    };
  });

  const missing = Math.max(0, assigned - present);
  const coveragePercentage = Math.round((present / required) * 100);

  let status: 'FULL' | 'WARNING' | 'CRITICAL' = 'FULL';
  let warningMessage: string | null = null;

  if (coveragePercentage < 70 || (required - present) >= 3) {
    status = 'CRITICAL';
    warningMessage = `Kritis: Kekurangan ${required - present} operator dari target minimum operasional!`;
  } else if (coveragePercentage < 100 || missing > 0) {
    status = 'WARNING';
    warningMessage = missing === 1 ? '1 operator belum melakukan check-in.' : `${missing} operator belum melakukan check-in.`;
  } else {
    status = 'FULL';
    warningMessage = 'Shift terisi penuh & seluruh operator telah hadir.';
  }

  return {
    shift: {
      id: shift.id,
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredCount: shift.requiredCount,
    },
    required,
    assigned,
    present,
    missing,
    coveragePercentage,
    status,
    warningMessage,
    assignedOperators,
  };
}

/**
 * Calculates coverage summary across all 3 shifts for a given date
 */
export async function getAllShiftsCoverage(dateStr: string = formatJakartaDate()) {
  const shifts = await prisma.shift.findMany({
    where: { isActive: true },
    orderBy: { startTime: 'asc' },
  });

  const coverages = await Promise.all(
    shifts.map((s) => getCoverageForShift(s.id, dateStr))
  );

  return coverages.filter((c): c is ShiftCoverageData => c !== null);
}
