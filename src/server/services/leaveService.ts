import { prisma } from '@/lib/db/prisma';
import { LeaveType, Prisma, RequestStatus, ScheduleStatus } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { createNotification, notifyAllManagersAndAdmins } from './notificationService';
import { deleteEvidenceForRejectedRecord } from './evidenceCleanupService';

export interface SubmitLeaveParams {
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  telepon?: string;
  alamatCuti?: string;
  penyerahanTugas?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentSize?: number;
  driveFileId?: string;
  driveWebViewLink?: string;
  storageProvider?: string;
  storagePath?: string;
}

export type ApprovalStage = 'REVIEWER' | 'TEAM_LEAD' | 'MANAGER';

export const APPROVAL_STAGES: ApprovalStage[] = ['REVIEWER', 'TEAM_LEAD', 'MANAGER'];

/** Tahap berikutnya setelah tahap tertentu disetujui (null = tahap akhir). */
export const NEXT_APPROVAL_STAGE: Record<ApprovalStage, ApprovalStage | null> = {
  REVIEWER: 'TEAM_LEAD',
  TEAM_LEAD: 'MANAGER',
  MANAGER: null,
};

/** Label Indonesia per tahap approval. */
export const APPROVAL_STAGE_LABELS: Record<ApprovalStage, string> = {
  REVIEWER: 'Menunggu Reviewer',
  TEAM_LEAD: 'Menunggu Team Lead',
  MANAGER: 'Menunggu Manager',
};

/** Konfigurasi hak cuti operasional (sumber: template Formulir Permohonan Cuti). */
export const LEAVE_CONFIG = {
  hakCutiBerjalan: 12, // hak cuti tahunan per periode
  cutiBesar: 0, // cuti besar (belum ada ketentuan khusus di template)
  periodeMulaiBulan: 9, // September (sesuai template: 1 Sep YYYY - 1 Sep YYYY+1)
  joinedDateDefault: '2025-09-01',
};

export interface ProcessLeaveApprovalParams {
  requestId: string;
  approverId: string;
  /** Tahap yang diproses — HARUS sama dengan approvalStage request saat ini. */
  stage: ApprovalStage;
  status: 'APPROVED' | 'REJECTED';
  note?: string;
}

export interface LeaveEntitlement {
  hakCutiBerjalan: number;
  cutiBesar: number;
  cutiTelahDiambil: number;
  sisaCuti: number;
  periodePengambilan: string;
  tanggalMasuk: string; // format Indonesia, mis. "1 September 2025"
  tanggalMasukRaw: string; // YYYY-MM-DD
}

/**
 * Status tampilan pengajuan sesuai alur approval 3 tahap.
 * - APPROVED  -> "Disetujui"
 * - REJECTED  -> "Ditolak"
 * - PENDING   -> "Menunggu Reviewer" | "Menunggu Team Lead" | "Menunggu Manager"
 */
export function getLeaveDisplayStatus(status: RequestStatus, approvalStage?: string | null): string {
  if (status === RequestStatus.APPROVED) return 'Disetujui';
  if (status === RequestStatus.REJECTED) return 'Ditolak';
  const stage = (approvalStage as ApprovalStage | undefined) || 'REVIEWER';
  return APPROVAL_STAGE_LABELS[stage] || 'Menunggu Reviewer';
}

const INDO_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatIndoDate(dStr: string): string {
  const parts = dStr.split('-');
  if (parts.length < 3) return dStr;
  const day = parseInt(parts[2], 10);
  const month = INDO_MONTHS_FULL[parseInt(parts[1], 10) - 1];
  return `${day} ${month} ${parts[0]}`;
}

/** Konfigurasi Reviewer / Team Lead / Manager untuk sebuah tim roster (A/B/C). */
export async function getApprovalConfigForTeam(team?: string | null) {
  if (!team) return null;
  return prisma.teamConfig.findUnique({ where: { code: team } });
}

/** Fallback: manager aktif pertama (bila TeamConfig tidak menetapkan teamLead/manager). */
export async function getDefaultManager() {
  return prisma.user.findFirst({
    where: { role: 'MANAGER', isActive: true },
    select: { id: true, name: true, position: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Memvalidasi kewenangan approver pada suatu tahap.
 * - ADMIN: boleh memproses semua tahap (oversight administrasi).
 * - REVIEWER: hanya reviewer yang dikonfigurasi untuk tim operator.
 * - TEAM_LEAD: hanya teamLead yang dikonfigurasi (fallback: MANAGER bila belum dikonfigurasi).
 * - MANAGER: role MANAGER.
 */
export async function assertApprovalAuthority(
  request: { userId: string },
  approver: { id: string; role: string },
  stage: ApprovalStage
): Promise<void> {
  if (approver.role === 'ADMIN') return;

  const operator = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { team: true },
  });
  const config = await getApprovalConfigForTeam(operator?.team);

  if (stage === 'REVIEWER') {
    if (config?.reviewerId && config.reviewerId === approver.id) return;
    throw new Error('Hanya Reviewer dari tim operator yang berwenang memproses tahap ini.');
  }

  if (stage === 'TEAM_LEAD') {
    const teamLeadId = config?.teamLeadId || (await getDefaultManager())?.id || null;
    if (teamLeadId && teamLeadId === approver.id) return;
    throw new Error('Hanya Team Lead yang berwenang memproses tahap ini.');
  }

  if (stage === 'MANAGER') {
    if (approver.role === 'MANAGER') return;
    throw new Error('Hanya Manager yang berwenang memberikan keputusan akhir.');
  }

  throw new Error('Tahap approval tidak dikenali.');
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

  let fullReason = params.reason;
  if (params.alamatCuti || params.penyerahanTugas || params.telepon) {
    fullReason = `${params.reason.trim()} ||| ${JSON.stringify({
      alamat: params.alamatCuti?.trim(),
      penyerahanTugas: params.penyerahanTugas?.trim(),
      telepon: params.telepon?.trim(),
    })}`;
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: params.userId,
      type: params.type,
      startDate: params.startDate,
      endDate: params.endDate,
      reason: fullReason,
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
      approvalStage: 'REVIEWER',
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

  // Notifikasi: Reviewer tim operator (tahap 1) + Managers/Admins untuk visibilitas.
  const operatorProfile = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { team: true },
  });
  const teamConfig = await getApprovalConfigForTeam(operatorProfile?.team);
  if (teamConfig?.reviewerId) {
    await createNotification({
      userId: teamConfig.reviewerId,
      type: 'LEAVE_STATUS',
      title: `Pengajuan ${params.type}: ${user.name}`,
      message: `Operator ${user.name} (${user.employeeId}) mengajukan ${params.type} periode ${params.startDate} s/d ${params.endDate}. Mohon direview sebagai Reviewer tim Anda.`,
      link: '/operator/requests?tab=approvals',
    });
  }
  await notifyAllManagersAndAdmins(
    'LEAVE_STATUS',
    `Pengajuan ${params.type}: ${user.name}`,
    `Operator ${user.name} (${user.employeeId}) mengajukan ${params.type} untuk periode ${params.startDate} s/d ${params.endDate}.${request.driveFileId ? ' Bukti surat tersedia.' : ''}`,
    '/manager/requests'
  );

  return request;
}


/**
 * Proses approval cuti berurutan 3 tahap (Reviewer -> Team Lead -> Manager).
 * - Setiap tahap hanya bisa diproses oleh pengguna yang berwenang pada tahap tersebut.
 * - Tidak bisa melompati tahap (sequential guard) dan tidak bisa diproses dua kali.
 * - Penolakan pada tahap mana pun menghentikan proses (status REJECTED).
 * - Approval final (Manager) menandai evidence final + memperbarui jadwal OFF.
 */
export async function processLeaveApproval(params: ProcessLeaveApprovalParams) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.leaveRequest.findUnique({
      where: { id: params.requestId },
      include: { user: true },
    });
    if (!existing) throw new Error('Pengajuan cuti/izin tidak ditemukan.');

    // FINAL-STATE GUARD — tidak boleh diproses ulang.
    if (existing.status !== RequestStatus.PENDING) {
      throw new Error('Pengajuan cuti/izin sudah memiliki status final — pemrosesan ulang tidak diizinkan.');
    }

    // SEQUENTIAL-STAGE GUARD — hanya tahap yang sedang berjalan yang boleh diproses.
    if (existing.approvalStage !== params.stage) {
      const currentLabel = getLeaveDisplayStatus(existing.status, existing.approvalStage);
      throw new Error(`Tahap yang diproses tidak sesuai. Saat ini pengajuan berada pada tahap: ${currentLabel}.`);
    }

    const approver = await tx.user.findUnique({
      where: { id: params.approverId },
      select: { id: true, name: true, role: true, position: true },
    });
    if (!approver) throw new Error('Akun approver tidak ditemukan.');

    // AUTHORITY GUARD — kewenangan tahap.
    await assertApprovalAuthority({ userId: existing.userId }, approver, params.stage);

    const now = new Date();
    const decision = params.status;
    const note = params.note?.trim() || null;
    const nextStage = NEXT_APPROVAL_STAGE[params.stage];

    // Bangun payload tahap (identitas approver + waktu keputusan).
    // Tipe `Record<string, unknown>` karena updateMany tidak menerima kolom relasi
    // (reviewedById dipakai sebagai kompatibilitas kolom lama).
    const data: Record<string, unknown> = {};
    if (params.stage === 'REVIEWER') {
      data.reviewerId = approver.id;
      data.reviewerName = approver.name;
      data.reviewerApprovedAt = now;
      data.reviewerNote = note;
    } else if (params.stage === 'TEAM_LEAD') {
      data.teamLeadId = approver.id;
      data.teamLeadName = approver.name;
      data.teamLeadApprovedAt = now;
      data.teamLeadNote = note;
    } else if (params.stage === 'MANAGER') {
      data.managerId = approver.id;
      data.managerName = approver.name;
      data.managerApprovedAt = now;
      data.managerNote = note;
      // Kompatibilitas kolom lama.
      data.reviewedById = approver.id;
      data.reviewedAt = now;
    }

    if (decision === 'REJECTED') {
      data.status = RequestStatus.REJECTED;
    } else if (nextStage) {
      data.approvalStage = nextStage;
    } else {
      // Approval final Manager.
      data.status = RequestStatus.APPROVED;
      data.finalizedAt = now;
    }

    // Conditional write — concurrency-safe (hanya bila masih PENDING di tahap yang sama).
    const guarded = await tx.leaveRequest.updateMany({
      where: { id: params.requestId, status: RequestStatus.PENDING, approvalStage: params.stage },
      data: data as Prisma.LeaveRequestUpdateManyMutationInput,
    });
    if (guarded.count === 0) {
      throw new Error('Pengajuan sudah diproses oleh orang lain (status final atau tahap berubah).');
    }

    // ==================================================================
    // APPROVAL FINAL (Manager) — validasi konflik & pembaruan jadwal OFF.
    // ==================================================================
    if (decision === 'APPROVED' && !nextStage) {
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


      // 3. Update jadwal final — status OFF pada rentang cuti (unique upsert userId+date).
      const leaveLabel = existing.type === LeaveType.SICK ? 'Sakit' : existing.type === LeaveType.PERMISSION ? 'Izin' : 'Cuti';
      const noteText = `${leaveLabel} — disetujui${note ? ` (${note})` : ''}`;
      const offShift = await tx.shift.findFirst({ where: { code: 'ORF_OFF' } });
      const fallbackLocation = await tx.location.findFirst({ orderBy: { name: 'asc' }, select: { id: true } });
      if (!offShift) {
        throw new Error('Shift OFF (ORF_OFF) tidak ditemukan — jadwal cuti tidak dapat dibuat. Hubungi Admin.');
      }
      if (!fallbackLocation) {
        throw new Error('Lokasi default tidak ditemukan — jadwal cuti tidak dapat dibuat. Hubungi Admin.');
      }
      for (const date of listDatesBetween(existing.startDate, existing.endDate)) {
        const schedule = await tx.schedule.findUnique({
          where: { userId_date: { userId: existing.userId, date } },
          include: { attendances: { select: { id: true, checkIn: true } } },
        });
        // Tanggal yang sudah dihadiri (check-in) TIDAK diubah (absensi tetap valid).
        if (schedule && schedule.attendances.some((a) => a.checkIn !== null)) continue;
        await tx.schedule.upsert({
          where: { userId_date: { userId: existing.userId, date } },
          update: { status: ScheduleStatus.OFF, notes: noteText },
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

    const updated = await tx.leaveRequest.findUniqueOrThrow({ where: { id: params.requestId } });

    // Audit (dalam transaction yang sama).
    await recordAuditLog({
      userId: approver.id,
      action: decision === 'APPROVED' ? `APPROVE_LEAVE_${params.stage}` : `REJECT_LEAVE_${params.stage}`,
      entity: 'LeaveRequest',
      entityId: updated.id,
      metadata: {
        operatorId: existing.userId,
        operatorName: existing.user.name,
        type: existing.type,
        startDate: existing.startDate,
        endDate: existing.endDate,
        stage: params.stage,
        decision,
        note,
      },
    }, tx);

    // Notifikasi operator (dalam transaction yang sama).
    const decisionText = decision === 'APPROVED' ? 'Disetujui' : 'Ditolak';
    const stageLabel = APPROVAL_STAGE_LABELS[params.stage];
    await createNotification({
      userId: existing.userId,
      type: 'LEAVE_STATUS',
      title: `Pengajuan ${existing.type}: ${stageLabel} ${decisionText}`,
      message: `Permohonan ${existing.type} Anda (${existing.startDate} s/d ${existing.endDate}) telah ${decisionText.toLowerCase()} pada tahap ${stageLabel}.${decision === 'APPROVED' && !nextStage ? ' Dokumen evidence cuti telah difinalisasi.' : ''}${note ? ` Catatan: ${note}` : ''}`,
      link: '/operator/requests',
    }, tx);

    // Approver berikutnya di tahap selanjutnya.
    if (decision === 'APPROVED' && nextStage) {
      const operatorProfile = await tx.user.findUnique({
        where: { id: existing.userId },
        select: { team: true },
      });
      const teamConfig = await tx.teamConfig.findUnique({ where: { code: operatorProfile?.team || '' } });
      if (nextStage === 'TEAM_LEAD') {
        const teamLeadId = teamConfig?.teamLeadId || (await getDefaultManager())?.id;
        if (teamLeadId && teamLeadId !== approver.id) {
          await createNotification({
            userId: teamLeadId,
            type: 'LEAVE_STATUS',
            title: `Pengajuan ${existing.type} menunggu persetujuan Team Lead`,
            message: `Permohonan ${existing.type} ${existing.user.name} (${existing.startDate} s/d ${existing.endDate}) telah disetujui Reviewer. Mohon diproses sebagai Team Lead.`,
            link: '/operator/requests?tab=approvals',
          }, tx);
        }
      } else if (nextStage === 'MANAGER') {
        await notifyAllManagersAndAdmins(
          'LEAVE_STATUS',
          `Pengajuan ${existing.type} menunggu keputusan Manager`,
          `Permohonan ${existing.type} ${existing.user.name} (${existing.startDate} s/d ${existing.endDate}) telah disetujui Team Lead. Mohon diberikan keputusan akhir.`,
          '/manager/requests',
          tx
        );
      }
    }

    return { request: updated, status: updated.status };
  });

  if (result.status === RequestStatus.REJECTED) {
    // REJECTED -> evidence dibersihkan, request TETAP disimpan (histori).
    try {
      await deleteEvidenceForRejectedRecord('LeaveRequest', params.requestId, params.approverId);
    } catch (error) {
      console.error('[LeaveRequest] evidence cleanup after reject failed:', error);
    }
  }
  return result.request;
}


/**
 * Perhitungan hak cuti otomatis untuk auto-fill Formulir Permohonan Cuti.
 * Mengikuti template: hak 12 hari, periode 1 September YYYY - 1 September YYYY+1.
 */
export async function getLeaveEntitlement(userId: string, referenceDate?: string): Promise<LeaveEntitlement> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { joinedDate: true },
  });

  const today = referenceDate || new Date().toISOString().substring(0, 10);
  const todayYear = parseInt(today.substring(0, 4), 10);
  const todayMonth = parseInt(today.substring(5, 7), 10);
  const startMonth = LEAVE_CONFIG.periodeMulaiBulan; // 9 (September)
  const periodStartYear = todayMonth >= startMonth ? todayYear : todayYear - 1;
  const periodStart = `${periodStartYear}-${startMonth.toString().padStart(2, '0')}-01`;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const endYear = endMonth === 12 ? periodStartYear : periodStartYear + 1;
  const endMonthDays = new Date(endYear, endMonth, 0).getDate();
  const periodEnd = `${endYear}-${endMonth.toString().padStart(2, '0')}-${endMonthDays.toString().padStart(2, '0')}`;

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: RequestStatus.APPROVED,
      type: LeaveType.LEAVE,
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
    select: { startDate: true, endDate: true },
  });

  let cutiTelahDiambil = 0;
  for (const l of approvedLeaves) {
    cutiTelahDiambil += listDatesBetween(l.startDate, l.endDate).length;
  }

  const hakCutiBerjalan = LEAVE_CONFIG.hakCutiBerjalan;
  const cutiBesar = LEAVE_CONFIG.cutiBesar;
  const sisaCuti = Math.max(0, hakCutiBerjalan - cutiTelahDiambil);
  const monthLabel = INDO_MONTHS_FULL[startMonth - 1];

  const tanggalMasukRaw = user?.joinedDate || LEAVE_CONFIG.joinedDateDefault;
  return {
    hakCutiBerjalan,
    cutiBesar,
    cutiTelahDiambil,
    sisaCuti,
    periodePengambilan: `1 ${monthLabel} ${periodStartYear} – 1 ${monthLabel} ${periodStartYear + 1}`,
    tanggalMasuk: formatIndoDate(tanggalMasukRaw),
    tanggalMasukRaw,
  };
}

/**
 * Daftar pengajuan yang MENUNGGU user ini (antrian approval tahap Reviewer/Team Lead/Manager).
 * Digunakan untuk tab "Persetujuan Tim" pada halaman operator & daftar manager.
 */
export async function getPendingLeaveApprovalsForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return [];

  const configs = await prisma.teamConfig.findMany();
  const reviewerTeams = configs.filter((c) => c.reviewerId === user.id).map((c) => c.code);
  const teamLeadTeams = configs.filter((c) => c.teamLeadId === user.id).map((c) => c.code);
  const teamsWithoutLead = configs.filter((c) => !c.teamLeadId).map((c) => c.code);
  const defaultManager = await getDefaultManager();

  const or: Prisma.LeaveRequestWhereInput[] = [];
  if (user.role === 'ADMIN') {
    // Admin: lihat semua pengajuan PENDING lintas tahap.
  } else if (user.role === 'MANAGER') {
    or.push({ approvalStage: 'MANAGER' });
    if (teamLeadTeams.length) or.push({ approvalStage: 'TEAM_LEAD', user: { team: { in: teamLeadTeams } } });
    if (defaultManager?.id === user.id && teamsWithoutLead.length) {
      or.push({ approvalStage: 'TEAM_LEAD', user: { team: { in: teamsWithoutLead } } });
    }
  } else {
    if (reviewerTeams.length) or.push({ approvalStage: 'REVIEWER', user: { team: { in: reviewerTeams } } });
    if (teamLeadTeams.length) or.push({ approvalStage: 'TEAM_LEAD', user: { team: { in: teamLeadTeams } } });
  }

  const where: Prisma.LeaveRequestWhereInput = { status: RequestStatus.PENDING };
  if (or.length) where.OR = or;

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
          team: true,
          department: true,
        },
      },
      reviewedBy: { select: { id: true, name: true, position: true } },
    },
  });
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
          team: true,
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
          team: true,
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
        team: true,
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
      team: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

