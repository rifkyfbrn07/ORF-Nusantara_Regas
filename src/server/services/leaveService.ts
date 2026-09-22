import { prisma } from '@/lib/db/prisma';
import { LeaveType, RequestStatus, ScheduleStatus } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { createNotification, notifyAllManagersAndAdmins } from './notificationService';
import { deleteEvidenceForRejectedRecord } from './evidenceCleanupService';


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
  storageProvider?: string;
  storagePath?: string;
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
      storageProvider: params.storageProvider || null,
      storagePath: params.storagePath || null,
      uploadedAt: (params.attachmentUrl || params.driveFileId || params.storagePath) ? new Date() : null,
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
  await notifyAllManagersAndAdmins(
    'LEAVE_STATUS',
    `Pengajuan ${params.type}: ${user.name}`,
    `Operator ${user.name} (${user.employeeId}) mengajukan ${params.type} untuk periode ${params.startDate} s/d ${params.endDate}.${request.driveFileId ? ' Bukti surat tersedia.' : ''}`,
    '/manager/requests'
  );

  return request;
}

export async function reviewLeaveRequest(params: ReviewLeaveParams) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.leaveRequest.findUnique({
      where: { id: params.requestId },
      include: { user: true },
    });

    if (!existing) throw new Error('Pengajuan cuti/izin niet gevonden.');

    // FINAL-STATE GUARD — nooit herverwerken (PENDING → APPROVED → REJECTED etc.).
    if (existing.status !== RequestStatus.PENDING) {
      throw new Error('Pengajuan cuti/izin heeft al een definitieve status — herverwerking niet toegestaan.');
    }

    // Conditional write: alleen een PENDING request kan verwerkt worden (concurrency-safe).
    const updatedStatus = params.status === 'APPROVED' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
    const guarded = await tx.leaveRequest.updateMany({
      where: { id: params.requestId, status: RequestStatus.PENDING },
      data: {
        status: updatedStatus,
        reviewedById: params.managerId,
        reviewedAt: new Date(),
        reviewerNote: params.reviewerNote || null,
      },
    });
    if (guarded.count === 0) {
      throw new Error('Pengajuan cuti/izin is inmiddels door iemand anders verwerkt (definitieve status).');
    }
    const updated = await tx.leaveRequest.findUniqueOrThrow({ where: { id: params.requestId } });

    // SISTEM update de officiële dagelijkse rooster automatisch wanneer cuti/izin
    // DISETUJUI: WORK → OFF voor de leave-periode (zolang er geen check-in is).
    if (params.status === 'APPROVED' && existing.type) {
      const dates: string[] = [];
      for (let d = new Date(`${existing.startDate}T00:00:00+07:00`); d <= new Date(`${existing.endDate}T00:00:00+07:00`); d.setDate(d.getDate() + 1)) {
        dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
      }
      const schedules = await tx.schedule.findMany({
        where: { userId: existing.userId, date: { in: dates }, status: ScheduleStatus.WORK },
        select: { id: true, attendances: { select: { id: true, checkIn: true } } },
      });
      const leaveLabel = existing.type === LeaveType.SICK ? 'Sakit' : existing.type === LeaveType.PERMISSION ? 'Izin' : 'Cuti';
      for (const schedule of schedules) {
        // Dagen die de operator al heeft gewerkt worden NIET gewijzigd (absentie blijft geldig).
        if (schedule.attendances.some((a) => a.checkIn !== null)) continue;
        await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            status: ScheduleStatus.OFF,
            notes: `${leaveLabel} — disetujui${params.reviewerNote ? ` (${params.reviewerNote})` : ''}`,
          },
        });
      }
    }

    // Audit (binnen dezelfde transaction — nooit token/credential in metadata).
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
    }, tx);

    // Notify Operator (binnen dezelfde transaction).
    const decisionText = params.status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
    await createNotification({
      userId: existing.userId,
      type: 'LEAVE_STATUS',
      title: `Pengajuan ${existing.type} ${decisionText}`,
      message: `Permohonan ${existing.type} Anda voor tanggal ${existing.startDate} s/d ${existing.endDate} is ${decisionText.toLowerCase()} door Manager/Admin. ${params.reviewerNote ? `Catatan: ${params.reviewerNote}` : ''}`,
      link: '/operator/requests',
    }, tx);

    return { request: updated, status: updatedStatus };
  });

  if (result.status === RequestStatus.REJECTED) {
    // REJECTED → evidence opruimen (blob + metadata), request BLIJFT bewaard (historie).
    try {
      await deleteEvidenceForRejectedRecord('LeaveRequest', params.requestId, params.managerId);
    } catch (error) {
      console.error('[LeaveRequest] evidence cleanup after reject failed:', error);
    }
  }
  return result.request;
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
