import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { Role, Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { getOperatorWorkStatus } from './workStatusService';

export interface CreateOperatorParams {
  name: string;
  email?: string;
  employeeId: string;
  password?: string;
  position: string;
  departmentId?: string;
  phone?: string;
  role?: Role;
  creatorId: string;
}

export interface UpdateOperatorParams {
  id: string;
  name: string;
  position: string;
  departmentId?: string;
  phone?: string;
  isActive?: boolean;
  newPassword?: string;
  updaterId: string;
}

export async function createOperator(params: CreateOperatorParams) {
  const existingEmail = params.email
    ? await prisma.user.findUnique({ where: { email: params.email } })
    : null;
  if (existingEmail) throw new Error('Email sudah terdaftar dalam sistem.');

  const existingEmp = await prisma.user.findUnique({ where: { employeeId: params.employeeId } });
  if (existingEmp) throw new Error('Nomor Induk Pegawai (Employee ID) sudah digunakan.');

  const passwordHash = await bcrypt.hash(params.password || 'Operator123!', 10);

  const user = await prisma.user.create({
    data: {
      name: params.name,
      email: params.email || null,
      employeeId: params.employeeId,
      passwordHash,
      position: params.position,
      departmentId: params.departmentId || null,
      phone: params.phone || null,
      role: params.role || Role.OPERATOR,
    },
    include: { department: true },
  });

  await recordAuditLog({
    userId: params.creatorId,
    action: 'CREATE_OPERATOR',
    entity: 'User',
    entityId: user.id,
    metadata: { name: user.name, employeeId: user.employeeId, position: user.position },
  });

  return user;
}

export async function updateOperator(params: UpdateOperatorParams) {
  const data: {
    name: string;
    position: string;
    departmentId: string | null;
    phone: string | null;
    isActive?: boolean;
    passwordHash?: string;
  } = {
    name: params.name,
    position: params.position,
    departmentId: params.departmentId || null,
    phone: params.phone || null,
  };

  if (typeof params.isActive === 'boolean') {
    data.isActive = params.isActive;
  }

  if (params.newPassword && params.newPassword.length >= 6) {
    data.passwordHash = await bcrypt.hash(params.newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    include: { department: true },
  });

  await recordAuditLog({
    userId: params.updaterId,
    action: 'UPDATE_OPERATOR',
    entity: 'User',
    entityId: updated.id,
    metadata: { name: updated.name, position: updated.position, isActive: updated.isActive },
  });

  return updated;
}

export async function toggleOperatorActiveStatus(operatorId: string, managerId: string) {
  const current = await prisma.user.findUnique({ where: { id: operatorId } });
  if (!current) throw new Error('Operator tidak ditemukan.');

  const updated = await prisma.user.update({
    where: { id: operatorId },
    data: { isActive: !current.isActive },
  });

  await recordAuditLog({
    userId: managerId,
    action: updated.isActive ? 'ACTIVATE_OPERATOR' : 'DEACTIVATE_OPERATOR',
    entity: 'User',
    entityId: updated.id,
    metadata: { operatorName: updated.name, newActiveState: updated.isActive },
  });

  return updated;
}

export async function getAllOperators(filters?: { departmentId?: string; search?: string; isActive?: boolean }) {
  const where: Prisma.UserWhereInput = { role: Role.OPERATOR };

  if (filters?.departmentId) where.departmentId = filters.departmentId;
  if (typeof filters?.isActive === 'boolean') where.isActive = filters.isActive;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { employeeId: { contains: filters.search, mode: 'insensitive' } },
      { position: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const operators = await prisma.user.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { department: true },
  });

  // Attach real-time computed today's work status for each operator
  const enriched = await Promise.all(
    operators.map(async (op) => {
      const todayStatus = await getOperatorWorkStatus(op.id);
      return {
        ...op,
        todayStatus,
      };
    })
  );

  return enriched;
}

export async function getOperatorFullDossier(operatorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: operatorId },
    include: { department: true },
  });

  if (!user) return null;

  const [todayStatus, attendances, leaveRequests, schedules, exchanges, handovers, hsseLogs] = await Promise.all([
    getOperatorWorkStatus(operatorId),
    prisma.attendance.findMany({
      where: { userId: operatorId },
      orderBy: { date: 'desc' },
      take: 20,
      include: { schedule: { include: { shift: true, location: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: { userId: operatorId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { reviewedBy: { select: { name: true } } },
    }),
    prisma.schedule.findMany({
      where: { userId: operatorId },
      orderBy: { date: 'desc' },
      take: 20,
      include: { shift: true, location: true },
    }),
    prisma.shiftExchange.findMany({
      where: { OR: [{ requesterId: operatorId }, { targetUserId: operatorId }] },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        requester: { select: { name: true } },
        targetUser: { select: { name: true } },
        requesterSchedule: { include: { shift: true } },
      },
    }),
    prisma.handover.findMany({
      where: { OR: [{ outgoingOperatorId: operatorId }, { incomingOperatorId: operatorId }] },
      orderBy: { date: 'desc' },
      take: 10,
      include: { outgoingOperator: true, incomingOperator: true, shift: true },
    }),
    prisma.hSSEChecklist.findMany({
      where: { operatorId },
      orderBy: { date: 'desc' },
      take: 10,
      include: { shift: true, items: true },
    }),
  ]);

  return {
    user,
    todayStatus,
    attendances,
    leaveRequests,
    schedules,
    exchanges,
    handovers,
    hsseLogs,
  };
}
