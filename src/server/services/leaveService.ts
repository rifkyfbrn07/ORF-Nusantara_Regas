import { prisma } from '@/lib/db/prisma';
import { LeaveType, RequestStatus } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { createNotification, notifyAllManagers } from './notificationService';

export interface SubmitLeaveParams {
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentSize?: number;
  driveFileId?: string;
  driveWebViewLink?: string;
}

export interface ReviewLeaveParams {
  requestId: string;
  managerId: string;
  status: 'APPROVED' | 'REJECTED';
  reviewerNote?: string;
}

export async function submitLeaveRequest(params: SubmitLeaveParams) {
  if (params.endDate < params.startDate) {
    throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, employeeId: true, position: true, department: { select: { name: true } } },
  });

  if (!user) {
    throw new Error('Data karyawan/operator tidak ditemukan.');
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: params.userId,
      type: params.type,
      startDate: params.startDate,
      endDate: params.endDate,
      reason: params.reason,
      attachmentUrl: params.attachmentUrl || params.driveWebViewLink || null,
      attachmentName: params.attachmentName || null,
      attachmentMime: params.attachmentMime || null,
      attachmentSize: params.attachmentSize || null,
      driveFileId: params.driveFileId || null,
      driveWebViewLink: params.driveWebViewLink || params.attachmentUrl || null,
      uploadedAt: (params.attachmentUrl || params.driveFileId) ? new Date() : null,
      status: RequestStatus.PENDING,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          username: true,
          position: true,
          department: true,
        },
      },
    },
  });

  // Audit: pengajuan cuti + bukti upload
  await recordAuditLog({
    userId: params.userId,
    action: 'SUBMIT_LEAVE_REQUEST',
    entity: 'LeaveRequest',
    entityId: request.id,
    metadata: {
      type: params.type,
      startDate: params.startDate,
      endDate: params.endDate,
      hasProof: Boolean(request.driveFileId || request.attachmentUrl),
    },
  });

  // Notify Managers
  await notifyAllManagers(
    'LEAVE_STATUS',
    `Pengajuan ${params.type}: ${user.name}`,
    `Operator ${user.name} (${user.employeeId}) mengajukan ${params.type} untuk periode ${params.startDate} s/d ${params.endDate}.${request.driveFileId ? ' Bukti surat tersedia.' : ''}`,
    '/manager/requests'
  );

  return request;
}

export async function reviewLeaveRequest(params: ReviewLeaveParams) {
  const existing = await prisma.leaveRequest.findUnique({
    where: { id: params.requestId },
    include: { user: true },
  });

  if (!existing) throw new Error('Pengajuan cuti/izin tidak ditemukan.');

  const updated = await prisma.leaveRequest.update({
    where: { id: params.requestId },
    data: {
      status: params.status === 'APPROVED' ? RequestStatus.APPROVED : RequestStatus.REJECTED,
      reviewedById: params.managerId,
      reviewedAt: new Date(),
      reviewerNote: params.reviewerNote || null,
    },
  });

  // Record Audit Log
  await recordAuditLog({
    userId: params.managerId,
    action: params.status === 'APPROVED' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
    entity: 'LeaveRequest',
    entityId: updated.id,
    metadata: {
      operatorId: existing.userId,
      operatorName: existing.user.name,
      type: existing.type,
      startDate: existing.startDate,
      endDate: existing.endDate,
      decision: params.status,
      reviewerNote: params.reviewerNote,
    },
  });

  // Notify Operator
  const decisionText = params.status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
  await createNotification({
    userId: existing.userId,
    type: 'LEAVE_STATUS',
    title: `Pengajuan ${existing.type} ${decisionText}`,
    message: `Permohonan ${existing.type} Anda untuk tanggal ${existing.startDate} s/d ${existing.endDate} telah ${decisionText.toLowerCase()} oleh Manager. ${
      params.reviewerNote ? `Catatan: ${params.reviewerNote}` : ''
    }`,
    link: '/operator/requests',
  });

  return updated;
}

export async function getOperatorLeaveRequests(userId: string) {
  return prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewedBy: {
        select: { name: true, position: true },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          employeeId: true,
          position: true,
          department: true,
        },
      },
    },
  });
}

export async function getAllLeaveRequests(status?: RequestStatus) {
  const where = status ? { status } : {};
  return prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          employeeId: true,
          position: true,
          avatarUrl: true,
          department: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
          position: true,
        },
      },
    },
  });
}

/**
 * Searches active employees by Name, Username, or Employee ID (NIP)
 */
export async function searchEmployeesForLeave(query: string, limit = 10) {
  const trimmed = query.trim();
  if (!trimmed) {
    return prisma.user.findMany({
      where: { isActive: true },
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        employeeId: true,
        position: true,
        role: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { username: { contains: trimmed, mode: 'insensitive' } },
        { employeeId: { contains: trimmed, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: {
      id: true,
      name: true,
      username: true,
      employeeId: true,
      position: true,
      role: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
}
