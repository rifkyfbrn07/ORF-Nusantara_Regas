import { prisma } from '@/lib/db/prisma';
import { formatJakartaDate } from '@/lib/time';
import { AttendanceStatus, LeaveType, RequestStatus, ScheduleStatus } from '@prisma/client';

export interface OperatorOperationalStatus {
  status: AttendanceStatus;
  statusLabel: string;
  shift: {
    id: string;
    name: string;
    code: string;
    startTime: string;
    endTime: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  attendance: {
    id: string;
    checkIn: Date | null;
    checkOut: Date | null;
    lateMinutes: number;
    notes: string | null;
  } | null;
  leave: {
    type: LeaveType;
    reason: string;
  } | null;
  scheduleId: string | null;
  isWorkDay: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

/**
 * Centralized Work Status Engine
 * Computes an operator's exact operational status for any date based on priority rules:
 * 1. Approved SICK -> SAKIT
 * 2. Approved LEAVE -> CUTI
 * 3. Approved PERMISSION -> IZIN
 * 4. Schedule OFF -> OFF
 * 5. Active Schedule + Attendance (on-time) -> HADIR
 * 6. Active Schedule + Attendance (late) -> TERLAMBAT
 * 7. Active Schedule + No Attendance (within/before shift) -> BELUM_ABSEN
 * 8. Active Schedule + No Attendance (past shift) -> ABSENT
 */
export async function getOperatorWorkStatus(
  operatorId: string,
  dateStr: string = formatJakartaDate()
): Promise<OperatorOperationalStatus> {
  // 1. Check for Approved Leave / Permission / Sick for this date
  const approvedLeave = await prisma.leaveRequest.findFirst({
    where: {
      userId: operatorId,
      status: RequestStatus.APPROVED,
      startDate: { lte: dateStr },
      endDate: { gte: dateStr },
    },
  });

  if (approvedLeave) {
    let finalStatus: AttendanceStatus = AttendanceStatus.CUTI;
    let label = 'CUTI';
    if (approvedLeave.type === LeaveType.SICK) {
      finalStatus = AttendanceStatus.SAKIT;
      label = 'SAKIT';
    } else if (approvedLeave.type === LeaveType.PERMISSION) {
      finalStatus = AttendanceStatus.IZIN;
      label = 'IZIN';
    }

    return {
      status: finalStatus,
      statusLabel: label,
      shift: null,
      location: null,
      attendance: null,
      leave: {
        type: approvedLeave.type,
        reason: approvedLeave.reason,
      },
      scheduleId: null,
      isWorkDay: false,
      canCheckIn: false,
      canCheckOut: false,
    };
  }

  // 2. Query Schedule for this date
  const schedule = await prisma.schedule.findUnique({
    where: {
      userId_date: {
        userId: operatorId,
        date: dateStr,
      },
    },
    include: {
      shift: true,
      location: true,
      attendances: true,
    },
  });

  // If no schedule or status is OFF
  if (!schedule || schedule.status === ScheduleStatus.OFF) {
    return {
      status: AttendanceStatus.OFF,
      statusLabel: 'OFF',
      shift: schedule?.shift
        ? {
            id: schedule.shift.id,
            name: schedule.shift.name,
            code: schedule.shift.code,
            startTime: schedule.shift.startTime,
            endTime: schedule.shift.endTime,
          }
        : null,
      location: schedule?.location
        ? {
            id: schedule.location.id,
            name: schedule.location.name,
          }
        : null,
      attendance: null,
      leave: null,
      scheduleId: schedule?.id || null,
      isWorkDay: false,
      canCheckIn: false,
      canCheckOut: false,
    };
  }

  // 3. Operator is scheduled to WORK today. Check Attendance record
  const attendance = schedule.attendances?.[0] || await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: operatorId,
        date: dateStr,
      },
    },
  });

  const shiftInfo = {
    id: schedule.shift.id,
    name: schedule.shift.name,
    code: schedule.shift.code,
    startTime: schedule.shift.startTime,
    endTime: schedule.shift.endTime,
  };

  const locationInfo = {
    id: schedule.location.id,
    name: schedule.location.name,
  };

  if (attendance && attendance.checkIn) {
    // Already checked in
    const isLate = (attendance.lateMinutes && attendance.lateMinutes > 0) || attendance.status === AttendanceStatus.TERLAMBAT;
    const finalStatus = isLate ? AttendanceStatus.TERLAMBAT : AttendanceStatus.HADIR;
    const label = isLate ? 'TERLAMBAT' : 'HADIR';

    return {
      status: finalStatus,
      statusLabel: label,
      shift: shiftInfo,
      location: locationInfo,
      attendance: {
        id: attendance.id,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        lateMinutes: attendance.lateMinutes,
        notes: attendance.notes,
      },
      leave: null,
      scheduleId: schedule.id,
      isWorkDay: true,
      canCheckIn: false,
      canCheckOut: !attendance.checkOut, // can checkout if not checked out yet
    };
  }

  // Scheduled to work, but has not checked in yet
  const now = new Date();
  const shiftEndTime = new Date(`${dateStr}T${schedule.shift.endTime}:00+07:00`);
  if (schedule.shift.endTime < schedule.shift.startTime) {
    // Overnight shift
    shiftEndTime.setDate(shiftEndTime.getDate() + 1);
  }

  const isPastShift = now > shiftEndTime;
  const finalStatus = isPastShift ? AttendanceStatus.ABSENT : AttendanceStatus.BELUM_ABSEN;
  const label = isPastShift ? 'ABSENT' : 'BELUM ABSEN';

  return {
    status: finalStatus,
    statusLabel: label,
    shift: shiftInfo,
    location: locationInfo,
    attendance: null,
    leave: null,
    scheduleId: schedule.id,
    isWorkDay: true,
    canCheckIn: !isPastShift,
    canCheckOut: false,
  };
}

/**
 * Returns overall manpower status breakdown for a given date across all active operators
 */
export async function getManpowerStatusSummary(dateStr: string = formatJakartaDate()) {
  const operators = await prisma.user.findMany({
    where: { role: 'OPERATOR', isActive: true },
    select: { id: true, name: true, employeeId: true, position: true, avatarUrl: true },
  });

  const statuses = await Promise.all(
    operators.map(async (op) => {
      const statusData = await getOperatorWorkStatus(op.id, dateStr);
      return {
        operator: op,
        ...statusData,
      };
    })
  );

  const counts = {
    totalOperators: operators.length,
    kerja: 0,
    hadir: 0,
    belumAbsen: 0,
    terlambat: 0,
    cuti: 0,
    izin: 0,
    sakit: 0,
    off: 0,
    absent: 0,
  };

  for (const s of statuses) {
    if (s.isWorkDay) counts.kerja++;

    switch (s.status) {
      case AttendanceStatus.HADIR:
        counts.hadir++;
        break;
      case AttendanceStatus.TERLAMBAT:
        counts.terlambat++;
        break;
      case AttendanceStatus.BELUM_ABSEN:
        counts.belumAbsen++;
        break;
      case AttendanceStatus.CUTI:
        counts.cuti++;
        break;
      case AttendanceStatus.IZIN:
        counts.izin++;
        break;
      case AttendanceStatus.SAKIT:
        counts.sakit++;
        break;
      case AttendanceStatus.OFF:
        counts.off++;
        break;
      case AttendanceStatus.ABSENT:
        counts.absent++;
        break;
      default:
        break;
    }
  }

  return {
    date: dateStr,
    counts,
    operatorStatuses: statuses,
  };
}
