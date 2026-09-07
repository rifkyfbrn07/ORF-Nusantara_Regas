import { prisma } from '@/lib/db/prisma';
import { formatJakartaDate, computeLateMinutes, isCheckInWindowOpen } from '@/lib/time';
import { AttendanceStatus, RequestStatus, ScheduleStatus, Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { createNotification, notifyAllManagers } from './notificationService';

export interface CheckInParams {
  userId: string;
  scheduleId: string;
  location?: string;
  notes?: string;
  ipAddress?: string;
}

export interface CheckOutParams {
  userId: string;
  attendanceId: string;
  location?: string;
  notes?: string;
  ipAddress?: string;
}

export interface ManualCorrectionParams {
  managerId: string;
  attendanceId?: string;
  userId: string;
  date: string;
  checkInTime?: string; // "HH:mm"
  checkOutTime?: string; // "HH:mm"
  status: AttendanceStatus;
  notes: string;
  ipAddress?: string;
}

/**
 * Executes operator check-in with strict server validation and timestamping
 */
export async function performCheckIn(params: CheckInParams) {
  const todayStr = formatJakartaDate();
  const serverNow = new Date(); // Exact server timestamp

  // 1. Check for active schedule
  const schedule = await prisma.schedule.findUnique({
    where: { id: params.scheduleId },
    include: { shift: true, location: true, user: true },
  });

  if (!schedule || schedule.userId !== params.userId) {
    throw new Error('Jadwal kerja tidak valid atau bukan milik Anda.');
  }

  if (schedule.status === ScheduleStatus.OFF) {
    throw new Error('Anda tidak dapat check-in karena jadwal hari ini adalah OFF.');
  }

  if (schedule.date !== todayStr) {
    throw new Error('Check-in hanya tersedia untuk jadwal kerja hari ini.');
  }

  if (!isCheckInWindowOpen(schedule.shift.startTime, schedule.shift.endTime, todayStr)) {
    throw new Error('Check-in belum dibuka atau shift Anda telah berakhir.');
  }

  // 2. Check for approved leave/permission/sick
  const approvedLeave = await prisma.leaveRequest.findFirst({
    where: {
      userId: params.userId,
      status: RequestStatus.APPROVED,
      startDate: { lte: todayStr },
      endDate: { gte: todayStr },
    },
  });

  if (approvedLeave) {
    throw new Error(`Anda tidak dapat check-in karena sedang dalam status ${approvedLeave.type} (Disetujui).`);
  }

  // 3. Check for existing attendance record
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: params.userId,
        date: todayStr,
      },
    },
  });

  if (existingAttendance && existingAttendance.checkIn) {
    throw new Error('Anda sudah melakukan check-in untuk hari ini.');
  }

  // 4. Calculate late minutes
  const lateMinutes = computeLateMinutes(schedule.shift.startTime, serverNow, todayStr);
  const status: AttendanceStatus = lateMinutes > 0 ? AttendanceStatus.TERLAMBAT : AttendanceStatus.HADIR;

  // 5. Create or update attendance record
  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: params.userId,
        date: todayStr,
      },
    },
    update: {
      scheduleId: schedule.id,
      checkIn: serverNow,
      status,
      lateMinutes,
      checkInLocation: params.location || schedule.location.name,
      notes: params.notes || null,
    },
    create: {
      userId: params.userId,
      scheduleId: schedule.id,
      date: todayStr,
      checkIn: serverNow,
      status,
      lateMinutes,
      checkInLocation: params.location || schedule.location.name,
      notes: params.notes || null,
    },
  });

  // 6. Record Audit Log
  await recordAuditLog({
    userId: params.userId,
    action: 'CHECK_IN',
    entity: 'Attendance',
    entityId: attendance.id,
    metadata: {
      time: serverNow.toISOString(),
      shift: schedule.shift.name,
      status,
      lateMinutes,
      location: params.location,
    },
    ipAddress: params.ipAddress,
  });

  // 7. If late, notify manager
  if (lateMinutes > 0) {
    await notifyAllManagers(
      'ATTENDANCE_ALERT',
      `Operator Terlambat: ${schedule.user.name}`,
      `Operator ${schedule.user.name} (${schedule.shift.name}) check-in terlambat ${lateMinutes} menit.`,
      '/manager/attendance'
    );
  }

  return attendance;
}

/**
 * Executes operator check-out
 */
export async function performCheckOut(params: CheckOutParams) {
  const serverNow = new Date();

  const attendance = await prisma.attendance.findUnique({
    where: { id: params.attendanceId },
    include: { schedule: { include: { shift: true } }, user: true },
  });

  if (!attendance || attendance.userId !== params.userId) {
    throw new Error('Data absensi tidak ditemukan.');
  }

  if (!attendance.checkIn) {
    throw new Error('Anda belum melakukan check-in hari ini.');
  }

  if (attendance.checkOut) {
    throw new Error('Anda sudah melakukan check-out sebelumnya.');
  }

  const updatedAttendance = await prisma.attendance.update({
    where: { id: params.attendanceId },
    data: {
      checkOut: serverNow,
      checkOutLocation: params.location || 'ORF Muara Karang',
      notes: params.notes ? `${attendance.notes ? attendance.notes + ' | ' : ''}${params.notes}` : attendance.notes,
    },
  });

  // Record Audit Log
  await recordAuditLog({
    userId: params.userId,
    action: 'CHECK_OUT',
    entity: 'Attendance',
    entityId: updatedAttendance.id,
    metadata: {
      checkOutTime: serverNow.toISOString(),
    },
    ipAddress: params.ipAddress,
  });

  return updatedAttendance;
}

/**
 * Manager manual attendance correction
 */
export async function performManualCorrection(params: ManualCorrectionParams) {
  let checkInDate: Date | null = null;
  let checkOutDate: Date | null = null;

  if (params.checkInTime) {
    checkInDate = new Date(`${params.date}T${params.checkInTime}:00+07:00`);
  }
  if (params.checkOutTime) {
    checkOutDate = new Date(`${params.date}T${params.checkOutTime}:00+07:00`);
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: params.userId,
        date: params.date,
      },
    },
    update: {
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: params.status,
      verifiedBy: params.managerId,
      notes: params.notes,
    },
    create: {
      userId: params.userId,
      date: params.date,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: params.status,
      verifiedBy: params.managerId,
      notes: params.notes,
    },
    include: {
      user: {
        select: { name: true, employeeId: true },
      },
    },
  });

  // Record Audit Log
  await recordAuditLog({
    userId: params.managerId,
    action: 'MANUAL_ATTENDANCE_CORRECTION',
    entity: 'Attendance',
    entityId: attendance.id,
    metadata: {
      targetUserId: params.userId,
      targetUserName: attendance.user.name,
      date: params.date,
      newStatus: params.status,
      reason: params.notes,
    },
    ipAddress: params.ipAddress,
  });

  // Notify operator
  await createNotification({
    userId: params.userId,
    type: 'SYSTEM',
    title: 'Koreksi Absensi oleh Manager',
    message: `Absensi Anda pada ${params.date} telah diperbarui statusnya menjadi ${params.status}. Catatan: ${params.notes}`,
    link: '/operator/attendance',
  });

  return attendance;
}

/**
 * Operator personal attendance history (Strictly scoped to requesting operator)
 */
export async function getOperatorAttendanceHistory(userId: string, limit = 30) {
  return prisma.attendance.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
    include: {
      schedule: {
        include: {
          shift: true,
          location: true,
        },
      },
    },
  });
}

/**
 * Manager attendance overview (All operators with filter and date search)
 */
export async function getAllAttendanceRecords(filters: {
  date?: string;
  shiftId?: string;
  status?: AttendanceStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceWhereInput = {};

  if (filters.date) {
    where.date = filters.date;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.shiftId) {
    where.schedule = {
      shiftId: filters.shiftId,
    };
  }

  if (filters.search) {
    where.user = {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { employeeId: { contains: filters.search, mode: 'insensitive' } },
      ],
    };
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            position: true,
            avatarUrl: true,
          },
        },
        schedule: {
          include: {
            shift: true,
            location: true,
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  return { records, total, totalPages: Math.ceil(total / limit) };
}
