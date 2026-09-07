import { prisma } from '@/lib/db/prisma';
import { RequestStatus, ScheduleStatus } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { createNotification, notifyAllManagers } from './notificationService';

export interface SubmitShiftExchangeParams {
  requesterId: string;
  requesterScheduleId: string;
  targetUserId: string;
  targetDate: string;
  reason: string;
}

export interface ReviewShiftExchangeParams {
  exchangeId: string;
  managerId: string;
  status: 'APPROVED' | 'REJECTED';
  reviewerNote?: string;
}

export async function submitShiftExchange(params: SubmitShiftExchangeParams) {
  if (params.requesterId === params.targetUserId) {
    throw new Error('Anda tidak dapat mengajukan pergantian shift dengan diri Anda sendiri.');
  }

  const requesterSchedule = await prisma.schedule.findUnique({
    where: { id: params.requesterScheduleId },
    include: { shift: true, user: true },
  });

  if (!requesterSchedule || requesterSchedule.userId !== params.requesterId) {
    throw new Error('Jadwal sumber tidak valid.');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { name: true, role: true },
  });

  if (!targetUser || targetUser.role !== 'OPERATOR') {
    throw new Error('Operator tujuan tidak valid.');
  }

  const exchange = await prisma.shiftExchange.create({
    data: {
      requesterId: params.requesterId,
      requesterScheduleId: params.requesterScheduleId,
      targetUserId: params.targetUserId,
      targetDate: params.targetDate,
      reason: params.reason,
      status: RequestStatus.PENDING,
    },
    include: {
      requester: { select: { name: true } },
      targetUser: { select: { name: true } },
    },
  });

  // Notify Managers
  await notifyAllManagers(
    'SHIFT_EXCHANGE',
    `Permintaan Pergantian Shift: ${requesterSchedule.user.name}`,
    `${requesterSchedule.user.name} mengajukan tukar shift (${requesterSchedule.date}) dengan ${targetUser.name} (${params.targetDate}).`,
    '/manager/requests'
  );

  // Notify Target Operator
  await createNotification({
    userId: params.targetUserId,
    type: 'SHIFT_EXCHANGE',
    title: 'Permintaan Pergantian Shift Masuk',
    message: `${requesterSchedule.user.name} mengajukan pergantian shift tanggal ${requesterSchedule.date} dengan Anda untuk tanggal ${params.targetDate}. Sedang menunggu persetujuan Manager.`,
    link: '/operator/shift-exchange',
  });

  return exchange;
}

export async function reviewShiftExchange(params: ReviewShiftExchangeParams) {
  const exchange = await prisma.shiftExchange.findUnique({
    where: { id: params.exchangeId },
    include: {
      requester: true,
      targetUser: true,
      requesterSchedule: { include: { shift: true } },
    },
  });

  if (!exchange) throw new Error('Pengajuan pergantian shift tidak ditemukan.');

  const updatedStatus = params.status === 'APPROVED' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

  // If approved, swap or adjust schedules
  if (updatedStatus === RequestStatus.APPROVED) {
    // 1. Find target user's schedule on targetDate
    const targetSchedule = await prisma.schedule.findUnique({
      where: {
        userId_date: {
          userId: exchange.targetUserId,
          date: exchange.targetDate,
        },
      },
    });

    const requesterShiftId = exchange.requesterSchedule.shiftId;
    const locationId = exchange.requesterSchedule.locationId;

    if (targetSchedule) {
      // Swap shift assignments
      await prisma.schedule.update({
        where: { id: exchange.requesterScheduleId },
        data: {
          userId: exchange.targetUserId,
          notes: `Hasil pergantian shift dengan ${exchange.requester.name}`,
        },
      });

      await prisma.schedule.update({
        where: { id: targetSchedule.id },
        data: {
          userId: exchange.requesterId,
          notes: `Hasil pergantian shift dengan ${exchange.targetUser.name}`,
        },
      });
    } else {
      // Reassign requester's schedule to target user
      await prisma.schedule.update({
        where: { id: exchange.requesterScheduleId },
        data: {
          userId: exchange.targetUserId,
          notes: `Diberikan kepada ${exchange.targetUser.name} atas persetujuan pergantian shift`,
        },
      });

      // Create a schedule for requester on targetDate if needed
      await prisma.schedule.upsert({
        where: {
          userId_date: {
            userId: exchange.requesterId,
            date: exchange.targetDate,
          },
        },
        update: {
          shiftId: requesterShiftId,
          locationId,
          status: ScheduleStatus.WORK,
          notes: `Pergantian shift dari ${exchange.targetUser.name}`,
        },
        create: {
          userId: exchange.requesterId,
          shiftId: requesterShiftId,
          locationId,
          date: exchange.targetDate,
          status: ScheduleStatus.WORK,
          notes: `Pergantian shift dari ${exchange.targetUser.name}`,
        },
      });
    }
  }

  const updatedExchange = await prisma.shiftExchange.update({
    where: { id: params.exchangeId },
    data: {
      status: updatedStatus,
      reviewedById: params.managerId,
      reviewedAt: new Date(),
      reviewerNote: params.reviewerNote || null,
    },
  });

  // Record Audit Log
  await recordAuditLog({
    userId: params.managerId,
    action: params.status === 'APPROVED' ? 'APPROVE_SHIFT_EXCHANGE' : 'REJECT_SHIFT_EXCHANGE',
    entity: 'ShiftExchange',
    entityId: exchange.id,
    metadata: {
      requester: exchange.requester.name,
      targetUser: exchange.targetUser.name,
      decision: params.status,
      reviewerNote: params.reviewerNote,
    },
  });

  // Notify both parties
  const decisionText = params.status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
  await createNotification({
    userId: exchange.requesterId,
    type: 'SHIFT_EXCHANGE',
    title: `Pergantian Shift ${decisionText}`,
    message: `Permintaan pergantian shift dengan ${exchange.targetUser.name} telah ${decisionText.toLowerCase()} oleh Manager.`,
    link: '/operator/shift-exchange',
  });

  await createNotification({
    userId: exchange.targetUserId,
    type: 'SHIFT_EXCHANGE',
    title: `Pergantian Shift ${decisionText}`,
    message: `Permintaan pergantian shift dengan ${exchange.requester.name} telah ${decisionText.toLowerCase()} oleh Manager.`,
    link: '/operator/schedule',
  });

  return updatedExchange;
}

export async function getOperatorShiftExchanges(userId: string) {
  return prisma.shiftExchange.findMany({
    where: {
      OR: [{ requesterId: userId }, { targetUserId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { name: true, employeeId: true } },
      targetUser: { select: { name: true, employeeId: true } },
      requesterSchedule: { include: { shift: true } },
      reviewedBy: { select: { name: true } },
    },
  });
}

export async function getAllShiftExchanges(status?: RequestStatus) {
  const where = status ? { status } : {};
  return prisma.shiftExchange.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { name: true, employeeId: true, position: true } },
      targetUser: { select: { name: true, employeeId: true, position: true } },
      requesterSchedule: { include: { shift: true } },
      reviewedBy: { select: { name: true } },
    },
  });
}
