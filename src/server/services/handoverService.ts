import { prisma } from '@/lib/db/prisma';
import { HandoverStatus, Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { createNotification } from './notificationService';

export interface CreateHandoverParams {
  date: string;
  shiftId: string;
  outgoingOperatorId: string;
  incomingOperatorId: string;
  operationalNotes: string;
  equipmentStatus: string;
  issues?: string;
  pendingTasks?: string;
  safetyNotes?: string;
  status?: HandoverStatus;
}

export async function saveHandover(params: CreateHandoverParams) {
  const handover = await prisma.handover.create({
    data: {
      date: params.date,
      shiftId: params.shiftId,
      outgoingOperatorId: params.outgoingOperatorId,
      incomingOperatorId: params.incomingOperatorId,
      operationalNotes: params.operationalNotes,
      equipmentStatus: params.equipmentStatus,
      issues: params.issues,
      pendingTasks: params.pendingTasks,
      safetyNotes: params.safetyNotes,
      status: params.status || HandoverStatus.SUBMITTED,
    },
    include: {
      outgoingOperator: { select: { name: true } },
      incomingOperator: { select: { name: true } },
      shift: true,
    },
  });

  // Record Audit Log
  await recordAuditLog({
    userId: params.outgoingOperatorId,
    action: 'SUBMIT_HANDOVER',
    entity: 'Handover',
    entityId: handover.id,
    metadata: {
      date: params.date,
      shift: handover.shift.name,
      incomingOperator: handover.incomingOperator.name,
    },
  });

  // Notify incoming operator
  if (params.status === HandoverStatus.SUBMITTED) {
    await createNotification({
      userId: params.incomingOperatorId,
      type: 'SHIFT_REMINDER',
      title: 'Serah Terima Shift (Handover) Masuk',
      message: `${handover.outgoingOperator.name} telah menyerahkan log operasional shift (${handover.shift.name}). Silakan periksa dan beri konfirmasi (Acknowledge).`,
      link: '/operator/handover',
    });
  }

  return handover;
}

export async function acknowledgeHandover(handoverId: string, operatorId: string) {
  const handover = await prisma.handover.findUnique({
    where: { id: handoverId },
    include: { outgoingOperator: true, incomingOperator: true, shift: true },
  });

  if (!handover || handover.incomingOperatorId !== operatorId) {
    throw new Error('Anda tidak memiliki otorisasi untuk mengonfirmasi handover ini.');
  }

  const updated = await prisma.handover.update({
    where: { id: handoverId },
    data: {
      status: HandoverStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
    },
  });

  // Record Audit Log
  await recordAuditLog({
    userId: operatorId,
    action: 'ACKNOWLEDGE_HANDOVER',
    entity: 'Handover',
    entityId: updated.id,
    metadata: {
      date: handover.date,
      shift: handover.shift.name,
      acknowledgedBy: handover.incomingOperator.name,
    },
  });

  // Notify outgoing operator
  await createNotification({
    userId: handover.outgoingOperatorId,
    type: 'SYSTEM',
    title: 'Handover Dikonfirmasi',
    message: `${handover.incomingOperator.name} telah membaca dan mengonfirmasi serah terima shift ${handover.shift.name}.`,
    link: '/operator/handover',
  });

  return updated;
}

export async function getOperatorHandovers(userId: string) {
  return prisma.handover.findMany({
    where: {
      OR: [{ outgoingOperatorId: userId }, { incomingOperatorId: userId }],
    },
    orderBy: { date: 'desc' },
    include: {
      outgoingOperator: { select: { id: true, name: true, employeeId: true, position: true } },
      incomingOperator: { select: { id: true, name: true, employeeId: true, position: true } },
      shift: true,
    },
  });
}

export async function getAllHandovers(filters?: { date?: string; shiftId?: string }) {
  const where: Prisma.HandoverWhereInput = {};
  if (filters?.date) where.date = filters.date;
  if (filters?.shiftId) where.shiftId = filters.shiftId;

  return prisma.handover.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      outgoingOperator: { select: { id: true, name: true, employeeId: true, position: true } },
      incomingOperator: { select: { id: true, name: true, employeeId: true, position: true } },
      shift: true,
    },
  });
}
