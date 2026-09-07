import { prisma } from '@/lib/db/prisma';
import { formatJakartaDate } from '@/lib/time';
import { ScheduleStatus, Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { createNotification } from './notificationService';

export interface CreateScheduleParams {
  userId: string;
  shiftId: string;
  locationId: string;
  date: string;
  status?: ScheduleStatus;
  notes?: string;
  creatorId: string;
}

export interface UpdateScheduleParams {
  id: string;
  shiftId?: string;
  locationId?: string;
  status?: ScheduleStatus;
  notes?: string;
  updaterId: string;
}

/**
 * Creates or updates an operator's schedule for a specific date
 */
export async function createOrUpdateSchedule(params: CreateScheduleParams) {
  const schedule = await prisma.schedule.upsert({
    where: {
      userId_date: {
        userId: params.userId,
        date: params.date,
      },
    },
    update: {
      shiftId: params.shiftId,
      locationId: params.locationId,
      status: params.status || ScheduleStatus.WORK,
      notes: params.notes,
    },
    create: {
      userId: params.userId,
      shiftId: params.shiftId,
      locationId: params.locationId,
      date: params.date,
      status: params.status || ScheduleStatus.WORK,
      notes: params.notes,
    },
    include: {
      user: { select: { name: true, employeeId: true } },
      shift: true,
      location: true,
    },
  });

  // Audit Log
  await recordAuditLog({
    userId: params.creatorId,
    action: 'CREATE_SCHEDULE',
    entity: 'Schedule',
    entityId: schedule.id,
    metadata: {
      targetUserId: params.userId,
      targetUserName: schedule.user.name,
      date: params.date,
      shift: schedule.shift.name,
      status: schedule.status,
    },
  });

  // Notify operator
  await createNotification({
    userId: params.userId,
    type: 'SHIFT_REMINDER',
    title: 'Pembaruan Jadwal Kerja',
    message: `Jadwal kerja Anda pada tanggal ${params.date} telah diperbarui: ${schedule.shift.name} (${schedule.shift.startTime} - ${schedule.shift.endTime}).`,
    link: '/operator/schedule',
  });

  return schedule;
}

/**
 * Updates an existing schedule
 */
export async function updateSchedule(params: UpdateScheduleParams) {
  const existing = await prisma.schedule.findUnique({
    where: { id: params.id },
    include: { user: true, shift: true },
  });

  if (!existing) throw new Error('Jadwal tidak ditemukan.');

  const schedule = await prisma.schedule.update({
    where: { id: params.id },
    data: {
      shiftId: params.shiftId,
      locationId: params.locationId,
      status: params.status,
      notes: params.notes,
    },
    include: {
      user: true,
      shift: true,
      location: true,
    },
  });

  // Audit Log
  await recordAuditLog({
    userId: params.updaterId,
    action: 'UPDATE_SCHEDULE',
    entity: 'Schedule',
    entityId: schedule.id,
    metadata: {
      targetUserId: schedule.userId,
      targetUserName: schedule.user.name,
      date: schedule.date,
      newShift: schedule.shift.name,
      newStatus: schedule.status,
    },
  });

  return schedule;
}

/**
 * Deletes a schedule
 */
export async function deleteSchedule(scheduleId: string, managerId: string) {
  const existing = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { user: true, shift: true },
  });

  if (!existing) throw new Error('Jadwal tidak ditemukan.');

  await prisma.schedule.delete({
    where: { id: scheduleId },
  });

  // Audit Log
  await recordAuditLog({
    userId: managerId,
    action: 'DELETE_SCHEDULE',
    entity: 'Schedule',
    entityId: scheduleId,
    metadata: {
      deletedForUser: existing.user.name,
      date: existing.date,
      shift: existing.shift.name,
    },
  });

  return { success: true };
}

/**
 * Duplicates all schedules from sourceDate to targetDate
 */
export async function duplicateDaySchedules(sourceDate: string, targetDate: string, managerId: string) {
  const sourceSchedules = await prisma.schedule.findMany({
    where: { date: sourceDate },
  });

  if (sourceSchedules.length === 0) {
    throw new Error(`Tidak ada jadwal ditemukan pada tanggal sumber ${sourceDate}.`);
  }

  let count = 0;
  for (const s of sourceSchedules) {
    await prisma.schedule.upsert({
      where: {
        userId_date: {
          userId: s.userId,
          date: targetDate,
        },
      },
      update: {
        shiftId: s.shiftId,
        locationId: s.locationId,
        status: s.status,
        notes: s.notes ? `Duplikasi dari ${sourceDate}: ${s.notes}` : `Duplikasi dari ${sourceDate}`,
      },
      create: {
        userId: s.userId,
        shiftId: s.shiftId,
        locationId: s.locationId,
        date: targetDate,
        status: s.status,
        notes: s.notes ? `Duplikasi dari ${sourceDate}: ${s.notes}` : `Duplikasi dari ${sourceDate}`,
      },
    });
    count++;
  }

  // Audit Log
  await recordAuditLog({
    userId: managerId,
    action: 'DUPLICATE_SCHEDULE',
    entity: 'Schedule',
    metadata: { sourceDate, targetDate, totalDuplicated: count },
  });

  return { count, sourceDate, targetDate };
}

/**
 * Operator personal schedule timeline (Strictly filtered to own operator)
 */
export async function getOperatorSchedules(userId: string, startDate?: string, limit = 14) {
  const fromDate = startDate || formatJakartaDate();

  return prisma.schedule.findMany({
    where: {
      userId,
      date: { gte: fromDate },
    },
    orderBy: { date: 'asc' },
    take: limit,
    include: {
      shift: true,
      location: true,
      attendances: true,
    },
  });
}

/**
 * Manager schedule planner (Finds all schedules with filters)
 */
export async function getManagerSchedules(filters: {
  startDate?: string;
  endDate?: string;
  date?: string;
  shiftId?: string;
  userId?: string;
}) {
  const where: Prisma.ScheduleWhereInput = {};

  if (filters.date) {
    where.date = filters.date;
  } else if (filters.startDate && filters.endDate) {
    where.date = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  }

  if (filters.shiftId) {
    where.shiftId = filters.shiftId;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  return prisma.schedule.findMany({
    where,
    orderBy: [{ date: 'asc' }, { shift: { startTime: 'asc' } }],
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
      shift: true,
      location: true,
      attendances: true,
    },
  });
}
