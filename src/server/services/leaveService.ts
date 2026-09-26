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

  // Cegah konflik sejak pengajuan: jika sudah ada CUTI/IZIN yang APPROVED pada
  // rentang yang sama, jangan izinkan pengajuan baru (schedule final bertabrakan).
  const approvedOverlap = await prisma.leaveRequest.findFirst({
    where: {
      userId: params.userId,
      status: RequestStatus.APPROVED,
      startDate: { lte: params.endDate },
      endDate: { gte: params.startDate },
    },
    select: { startDate: true, endDate: true },
  });
  if (approvedOverlap) {
    throw new Error(
      `Gagal mengajukan: Anda sudah memiliki ${params.type} yang DISETUJUI pada rentang ${approvedOverlap.startDate} s/d ${approvedOverlap.endDate}. Ajukan pada tanggal lain.`
    );
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

    if (!existing) throw new Error('Pengajuan cuti/izin tidak ditemukan.');

    // FINAL-STATE GUARD — tidak boleh diproses ulang (PENDING → APPROVED → REJECTED dst).
    if (existing.status !== RequestStatus.PENDING) {
      throw new Error('Pengajuan cuti/izin sudah memiliki status final — pemrosesan ulang tidak diizinkan.');
    }

    // ==========================================================================
    // VALIDASI KONFLIK (SEBELUM approval / sebelum schedule diubah)
    // Requirement #10 & #11 — tolak approval bila ada konflik, jangan overwrite
    // diam-diam. Tidak membuat schedule terpisah (unique userId+date).
    // ==========================================================================
    if (params.status === 'APPROVED') {
      // 1. LeaveRequest lain (APPROVED/PENDING) yang tumpang tindih utk user sama.
      const overlappingLeave = await tx.leaveRequest.findFirst({
        where: {
          userId: existing.userId,
          id: { not: existing.id },
          startDate: { lte: existing.endDate },
          endDate: { gte: existing.startDate },
        },
        select: { status: true },
      });
      if (overlappingLeave) {
        const label = overlappingLeave.status === RequestStatus.APPROVED ? 'sudah disetujui' : 'masih PENDING';
        throw new Error(
          `Konflik: terdapat pengajuan cuti/izin lain (${label}) pada rentang ${existing.startDate} s/d ${existing.endDate}. Selesaikan konflik tersebut sebelum approval.`
        );
      }

      // 2. Tukar Hari OFF (ShiftExchange) PENDING yang melibatkan tanggal cuti ini.
      const datesArr: string[] = listDatesBetween(existing.startDate, existing.endDate);
      const pendingExchange = await tx.shiftExchange.findFirst({
        where: {
          status: RequestStatus.PENDING,
          OR: [
            { requesterId: existing.userId, requesterSchedule: { date: { in: datesArr } } },
            { targetUserId: existing.userId, targetSchedule: { date: { in: datesArr } } },
          ],
        },
        include: { requesterSchedule: true, targetSchedule: true },
      });
      if (pendingExchange) {
        const date = pendingExchange.requesterSchedule?.date ?? pendingExchange.targetSchedule?.date ?? '';
        throw new Error(
          `Konflik: tanggal ${date} memiliki pengajuan Tukar Hari OFF yang masih PENDING. Selesaikan dahulu pertukaran tersebut sebelum menyetujui cuti/izin.`
        );
      }
    }

    // Conditional write: hanya PENDING request yang boleh diproses (concurrency-safe).
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
      throw new Error('Pengajuan cuti/izin sudah diproses oleh orang lain (status final).');
    }
    const updated = await tx.leaveRequest.findUniqueOrThrow({ where: { id: params.requestId } });

    // ==========================================================================
    // UPDATE JADWAL FINAL SAAT APPROVED — atomik (dalam transaction yang sama).
    // CASE A: schedule sudah ada  -> update status OFF + catatan cuti/izin
    // CASE B: schedule belum ada  -> buat row OFF dengan shift ORF_OFF
    // CASE C: tanggal sudah OFF   -> dibiarkan OFF, hanya ditambahkan catatan
    // CASE D: konflik tukar OFF   -> sudah divalidasi di atas (ditolak)
    // CASE E: approved            -> perubahan masuk ke schedule final
    // Tidak pernah membuat DUA row untuk (userId, date) — pakai unique upsert.
    // ==========================================================================
    if (params.status === 'APPROVED' && existing.type) {
      const leaveLabel = existing.type === LeaveType.SICK ? 'Sakit' : existing.type === LeaveType.PERMISSION ? 'Izin' : 'Cuti';
      const noteText = `${leaveLabel} — disetujui${params.reviewerNote ? ` (${params.reviewerNote})` : ''}`;
      const datesArr = listDatesBetween(existing.startDate, existing.endDate);

      const offShift = await tx.shift.findFirst({ where: { code: 'ORF_OFF' } });
      const fallbackLocation = await tx.location.findFirst({ orderBy: { name: 'asc' }, select: { id: true } });
      if (!offShift) {
        throw new Error('Shift OFF (ORF_OFF) tidak ditemukan — jadwal cuti tidak dapat dibuat. Hubungi Admin.');
      }
      if (!fallbackLocation) {
        throw new Error('Lokasi default tidak ditemukan — jadwal cuti tidak dapat dibuat. Hubungi Admin.');
      }

      for (const date of datesArr) {
        const schedule = await tx.schedule.findUnique({
          where: { userId_date: { userId: existing.userId, date } },
          include: { attendances: { select: { id: true, checkIn: true } } },
        });

        // Tanggal yang sudah dihadiri (check-in) TIDAK diubah (absensi tetap valid).
        if (schedule && schedule.attendances.some((a) => a.checkIn !== null)) continue;

        await tx.schedule.upsert({
          where: { userId_date: { userId: existing.userId, date } },
          update: {
            status: ScheduleStatus.OFF,
            notes: noteText,
          },
          create: {
            userId: existing.userId,
            shiftId: offShift.id,
            locationId: fallbackLocation.id,
            date,
            status: ScheduleStatus.OFF,
            notes: noteText,
          },
        });
      }
    }

    // Audit (dalam transaction yang sama — tidak pernah menaruh token/kredensial di metadata).
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

    // Notify Operator (dalam transaction yang sama).
    const decisionText = params.status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
    await createNotification({
      userId: existing.userId,
      type: 'LEAVE_STATUS',
      title: `Pengajuan ${existing.type} ${decisionText}`,
      message: `Permohonan ${existing.type} Anda untuk tanggal ${existing.startDate} s/d ${existing.endDate} telah ${decisionText.toLowerCase()} oleh Manager/Admin. ${params.status === 'APPROVED' ? 'Jadwal resmi Anda sudah diperbarui.' : ''}${params.reviewerNote ? ` Catatan: ${params.reviewerNote}` : ''}`,
      link: '/operator/requests',
    }, tx);

    return { request: updated, status: updatedStatus };
  });

  if (result.status === RequestStatus.REJECTED) {
    // REJECTED → evidence dibersihkan (blob + metadata), request TETAP disimpan (histori).
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

/** Enumerasi daftar tanggal YYYY-MM-DD antara dua tanggal (inklusif). */
function listDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  if (endDate < startDate) return dates;
  const cursor = new Date(`${startDate}T00:00:00+07:00`);
  const end = new Date(`${endDate}T00:00:00+07:00`);
  let guard = 0;
  while (cursor <= end && guard < 400) {
    dates.push(cursor.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

