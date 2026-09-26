import { prisma } from '@/lib/db/prisma';
import { Prisma, RequestStatus, ScheduleStatus, LeaveType } from '@prisma/client';
import { recordAuditLog } from './auditService';
import {
  createNotification,
  notifyAllManagersAndAdmins,
  PENDING_CONFIRMATION,
  ACCEPTED_CONFIRMATION,
  REJECTED_CONFIRMATION,
  PENDING_APPROVAL,
  APPROVED_APPROVAL,
  REJECTED_APPROVAL,
} from './notificationService';
import { deleteEvidenceForRejectedRecord } from './evidenceCleanupService';
import { formatJakartaDate } from '@/lib/time';

type TxClient = Prisma.TransactionClient;


export interface SubmitShiftExchangeParams {
  requesterId: string;
  requesterScheduleId: string; // A's OFF day (schedule id)
  targetUserId: string;        // Operator B
  targetScheduleId: string;    // B's OFF day (schedule id)
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

export interface ReviewShiftExchangeParams {
  exchangeId: string;
  managerId: string;
  status: 'APPROVED' | 'REJECTED';
  reviewerNote?: string;
}

/** Security: never trust client. Validate both OFF days belong to their owners. */
/** Lock schedule rows (SELECT ... FOR UPDATE) inside a tx — serializes concurrent submits/approvals on the same dates (race-condition prevention). */
async function lockScheduleRows(tx: TxClient, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter((id) => Boolean(id)))].sort();
  if (uniqueIds.length === 0) return;
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Schedule" WHERE id IN (${Prisma.join(uniqueIds)}) FOR UPDATE`);
}

/** Lock the ShiftExchange row inside a tx — serializes respond/review actions (double-process prevention). */
async function lockShiftExchangeRow(tx: TxClient, exchangeId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "ShiftExchange" WHERE id = ${exchangeId} FOR UPDATE`);
}

async function loadOffSchedules(requesterScheduleId: string, targetScheduleId: string, client: TxClient | typeof prisma = prisma) {
  const requesterSchedule = await client.schedule.findUnique({
    where: { id: requesterScheduleId },
    include: { shift: true, location: true, user: true },
  });
  const targetSchedule = await client.schedule.findUnique({
    where: { id: targetScheduleId },
    include: { shift: true, location: true, user: true },
  });
  return { requesterSchedule, targetSchedule };
}

async function hasApprovedLeave(userId: string, date: string, client: TxClient | typeof prisma = prisma) {
  return client.leaveRequest.findFirst({
    where: { userId, status: RequestStatus.APPROVED, startDate: { lte: date }, endDate: { gte: date } },
    select: { type: true },
  });
}
/**
 * VALIDASI OFF↔OFF EXCHANGE (server-side; value nunca dari client blind):
 * - requester & target berbeda, aktif, role OPERATOR
 * - requesterSchedule = OFF milik requester ; targetSchedule = OFF milik target
 * - kedua tanggal belum lewat, tanggal OFF berbeda
 * - cross-work: target WORK pada tanggal OFF requester ; requester WORK pada tanggal OFF target
 *   (INI GUARANTEE hasil: kedua operator tetap memperoleh OFF — niet OFF→ON)
 * - geen approved cuti/izin/sakit op beide data
 * - geen pending/actieve exchange die deze schedules blokkeert (duplicate protection;
 *   status blijft PENDING tot finale beslissing → dekt BEIDE fases: nog te bevestigen
 *   door operator én bevestigd-maar-wachtend-op-manager)
 */
async function assertOffExchangeValid(
  requesterId: string,
  requesterSchedule: { id: string; userId: string; date: string; status: ScheduleStatus },
  targetUserId: string,
  targetSchedule: { id: string; userId: string; date: string; status: ScheduleStatus },
  client: TxClient | typeof prisma = prisma
) {
  const today = formatJakartaDate();

  if (requesterId === targetUserId) {
    throw new Error('Anda tidak dapat tukar hari OFF dengan diri Anda sendiri.');
  }
  if (requesterSchedule.userId !== requesterId) {
    throw new Error('Jadwal OFF sumber tidak valid (tidak milik Anda).');
  }
  if (targetSchedule.userId !== targetUserId) {
    throw new Error('Jadwal OFF tujuan tidak valid (tidak milik operator tujuan).');
  }
  if (requesterSchedule.status !== ScheduleStatus.OFF) {
    throw new Error('Jadwal yang dipilih bukan hari OFF — hanya hari OFF dapat ditukar.');
  }
  if (targetSchedule.status !== ScheduleStatus.OFF) {
    throw new Error('Jadwal tujuan bukan hari OFF — hanya hari OFF dapat ditukar.');
  }
  if (requesterSchedule.date < today) {
    throw new Error('Hari OFF sumber sudah lewat — tidak dapat ditukar.');
  }
  if (targetSchedule.date < today) {
    throw new Error('Hari OFF tujuan sudah lewat — tidak dapat ditukar.');
  }
  if (requesterSchedule.date === targetSchedule.date) {
    throw new Error('Hari OFF sumber dan tujuan berada pada tanggal sama — pertukaran tidak makna.');
  }

  // Cross-work requirement (matrix swap): target must WORK on A's OFF date,
  // requester must WORK on B's OFF date. This preserves each operator's OFF count.
  const targetOnADate = await client.schedule.findUnique({
    where: { userId_date: { userId: targetUserId, date: requesterSchedule.date } },
  });
  const requesterOnBDate = await client.schedule.findUnique({
    where: { userId_date: { userId: requesterId, date: targetSchedule.date } },
  });
  if (!targetOnADate || targetOnADate.status !== ScheduleStatus.WORK) {
    throw new Error(`Operator tujuan tidak bekerja pada ${requesterSchedule.date} — tidak kompatibel untuk tukar OFF.`);
  }
  if (!requesterOnBDate || requesterOnBDate.status !== ScheduleStatus.WORK) {
    throw new Error(`Anda tidak bekerja pada ${targetSchedule.date} — tanggal OFF tujuan tidak kompatibel.`);
  }

  // Approved leaves on either date for either operator
  for (const d of [requesterSchedule.date, targetSchedule.date]) {
    const l = await hasApprovedLeave(requesterId, d, client);
    if (l) {
      const label = l.type === LeaveType.SICK ? 'sakit' : l.type === LeaveType.PERMISSION ? 'izin' : 'cuti';
      throw new Error(`Tidak dapat tukar hari OFF tanggal ${d} — Anda sedang ${label} pada tanggal tersebut.`);
    }
    const l2 = await hasApprovedLeave(targetUserId, d, client);
    if (l2) {
      const label = l2.type === LeaveType.SICK ? 'sakit' : l2.type === LeaveType.PERMISSION ? 'izin' : 'cuti';
      throw new Error(`Operator tujuan sedang ${label} pada tanggal ${d} — tidak valid untuk pertukaran.`);
    }
  }

  // No pending/active exchange involving either schedules (duplicate request protection)
  const pending = await client.shiftExchange.findFirst({
    where: {
      status: RequestStatus.PENDING,
      OR: [
        { requesterScheduleId: requesterSchedule.id },
        { targetScheduleId: targetSchedule.id },
        { requesterScheduleId: targetSchedule.id },
        { targetScheduleId: requesterSchedule.id },
      ],
    },
    select: { id: true },
  });
  if (pending) {
    throw new Error('Salah satu hari OFF sedang dalam pengajuan pertukaran shift lain (pending).');
  }

  return { targetOnADate, requesterOnBDate };
}
export async function submitShiftExchange(params: SubmitShiftExchangeParams) {
  // ATOMIC + race-safe: de twee OFF-schedules worden first gelocked
  // (SELECT ... FOR UPDATE), zodat twee gelijktijdige identieke aanvragen niet
  // beide door de duplicate-check kunnen komen. Heel de submit (validatie +
  // create + audit + notificatie naar Operator B) draait in ÉÉN transaction.
  return prisma.$transaction(async (tx) => {
    // 1. Lock the two involved OFF schedules FIRST (duplicate submit serialization).
    await lockScheduleRows(tx, [params.requesterScheduleId, params.targetScheduleId]);

    // 2. Fresh load INSIDE the transaction (nooit vertrouwen op stale reads).
    const { requesterSchedule, targetSchedule } = await loadOffSchedules(
      params.requesterScheduleId,
      params.targetScheduleId,
      tx
    );
    if (!requesterSchedule || !targetSchedule) {
      throw new Error('Jadwal OFF tidak ditemukan.');
    }

    const targetUser = await tx.user.findUnique({
      where: { id: params.targetUserId },
      select: { name: true, role: true, isActive: true },
    });
    if (!targetUser || targetUser.role !== 'OPERATOR') {
      throw new Error('Operator tujuan tidak valid.');
    }
    if (!targetUser.isActive) {
      throw new Error('Operator tujuan tidak aktif.');
    }

    // 3. Full server-side re-validation (OFF↔OFF, cross-work, duplicate protection).
    await assertOffExchangeValid(
      params.requesterId,
      { id: requesterSchedule.id, userId: requesterSchedule.userId, date: requesterSchedule.date, status: requesterSchedule.status },
      params.targetUserId,
      { id: targetSchedule.id, userId: targetSchedule.userId, date: targetSchedule.date, status: targetSchedule.status },
      tx
    );

    // 4. Create the exchange — status workflow gescheiden:
    //    status PENDING (algehele status) + confirmationStatus PENDING (operator B)
    //    + approvalStatus PENDING (manager/admin).
    const exchange = await tx.shiftExchange.create({
      data: {
        requesterId: params.requesterId,
        requesterScheduleId: requesterSchedule.id,
        targetUserId: params.targetUserId,
        targetScheduleId: targetSchedule.id,
        targetDate: targetSchedule.date,
        reason: params.reason,
        attachmentUrl: params.attachmentUrl || params.driveWebViewLink || null,
        attachmentName: params.attachmentName || null,
        attachmentMime: params.attachmentMime || null,
        attachmentSize: params.attachmentSize || null,
        driveFileId: params.driveFileId || null,
        driveWebViewLink: params.driveWebViewLink || params.attachmentUrl || null,
        storageProvider: params.storageProvider || null,
        storagePath: params.storagePath || null,
        uploadedAt: params.attachmentUrl || params.driveFileId || params.storagePath ? new Date() : null,
        status: RequestStatus.PENDING,
        confirmationStatus: PENDING_CONFIRMATION,
        approvalStatus: PENDING_APPROVAL,
      },
      include: {
        requester: { select: { name: true } },
        targetUser: { select: { name: true } },
        requesterSchedule: { include: { shift: true } },
        targetSchedule: { include: { shift: true } },
      },
    });

    // 5. Audit — binnen dezelfde transaction.
    await recordAuditLog({
      userId: params.requesterId,
      action: 'SUBMIT_SHIFT_EXCHANGE',
      entity: 'ShiftExchange',
      entityId: exchange.id,
      metadata: {
        requester: requesterSchedule.user.name,
        requesterOffDate: requesterSchedule.date,
        targetUser: targetUser.name,
        targetOffDate: targetSchedule.date,
        hasProof: Boolean(exchange.driveFileId || exchange.attachmentUrl),
      },
    }, tx);

    // 6. Operator B WAJIB krijgt een notificatie (binnen dezelfde transaction).
    await createNotification({
      userId: params.targetUserId,
      type: 'SHIFT_EXCHANGE',
      title: `Permintaan Tukar Hari OFF dari ${requesterSchedule.user.name}`,
      message: `${requesterSchedule.user.name} mengajukan pertukaran hari OFF dengan Anda. Hari OFF Anda: ${targetSchedule.date}. Hari OFF paham: ${requesterSchedule.date}.${exchange.driveFileId ? ' Bukti surat tersedia.' : ''}`,
      link: '/operator/shift-exchange',
    }, tx);

    return exchange;
  });
}
export async function respondShiftExchange(params: { exchangeId: string; targetUserId: string; accepted: boolean }) {
  return prisma.$transaction(async (tx) => {
    // Concurrency: alleen één action (respond/review) mag deze exchange verwerken.
    await lockShiftExchangeRow(tx, params.exchangeId);

    const exchange = await tx.shiftExchange.findUnique({
      where: { id: params.exchangeId },
      include: {
        requester: { select: { name: true } },
        targetUser: { select: { name: true } },
        requesterSchedule: { include: { shift: true } },
        targetSchedule: { include: { shift: true } },
      },
    });

    if (!exchange) throw new Error('Pengajuan tukar hari OFF tidak ditemukan.');
    if (exchange.targetUserId !== params.targetUserId) {
      throw new Error('Anda tidak berwenang menjawab permintaan ini.');
    }
    // FINAL-STATE GUARD — nooit opnieuw verwerken (PENDING → REJECTED → APPROVED etc.).
    if (exchange.status !== RequestStatus.PENDING) {
      throw new Error('Pengajuan ini sudah diprosses (status final) — tidak dapat diprosses ulang.');
    }
    // Operator-confirmation fase: alleen als de target nog niet heeft gereageerd.
    if (exchange.confirmationStatus !== PENDING_CONFIRMATION) {
      throw new Error('Persetujuan operator voor deze pengajuan is al verwerkt.');
    }

    if (!params.accepted) {
      // Conditional write: status email; als een andere actie tussentijds won → 0 rijen.
      const guarded = await tx.shiftExchange.updateMany({
        where: { id: exchange.id, status: RequestStatus.PENDING },
        data: {
          status: RequestStatus.REJECTED,
          confirmationStatus: REJECTED_CONFIRMATION,
          reviewedAt: new Date(),
          reviewerNote: 'Ditolak door operator doelwit.',
        },
      });
      if (guarded.count === 0) {
        throw new Error('Pengajuan is inmiddels door iemand anders verwerkt.');
      }

      await recordAuditLog({
        userId: params.targetUserId,
        action: 'REJECT_SHIFT_EXCHANGE_BY_TARGET',
        entity: 'ShiftExchange',
        entityId: exchange.id,
        metadata: { targetUser: exchange.targetUser.name, decision: 'REJECTED_BY_TARGET' },
      }, tx);

      // Operator A krijgt notificatie van de afwijzing.
      await createNotification({
        userId: exchange.requesterId,
        type: 'SHIFT_EXCHANGE',
        title: 'Tukar Hari OFF Ditolak',
        message: `${exchange.targetUser.name} menolak permintaan tukar hari OFF Anda.`,
        link: '/operator/shift-exchange',
      }, tx);

      // GEEN manager-approval task: request is REJECTED → beheerders kunnen niets meer doen.
      return { updatedExchange: exchange.id, rejected: true };
    }

    // ---- ACCEPT door Operator B ----
    const guarded = await tx.shiftExchange.updateMany({
      where: { id: exchange.id, status: RequestStatus.PENDING, confirmationStatus: PENDING_CONFIRMATION },
      data: {
        confirmationStatus: ACCEPTED_CONFIRMATION,
        targetAcceptedAt: new Date(),
      },
    });
    if (guarded.count === 0) {
      throw new Error('Persetujuan operator is al verwerkt of request is final.');
    }

    await recordAuditLog({
      userId: params.targetUserId,
      action: 'ACCEPT_SHIFT_EXCHANGE_BY_TARGET',
      entity: 'ShiftExchange',
      entityId: exchange.id,
      metadata: {
        targetUser: exchange.targetUser.name,
        decision: 'ACCEPTED_BY_TARGET',
        requesterOff: exchange.requesterSchedule.date,
        targetOff: exchange.targetSchedule.date,
      },
    }, tx);

    // Operator A ontvangt bevestiging.
    await createNotification({
      userId: exchange.requesterId,
      type: 'SHIFT_EXCHANGE',
      title: 'Permintaan Tukar Hari OFF Disetujui',
      message: `${exchange.targetUser.name} menerima permintaan tukar hari OFF Anda. Menunggu persetujuan Manager/Admin.`,
      link: '/operator/shift-exchange',
    }, tx);

    // Manager en Admin krijgen de approval task (alle actieve gebruikers, geen duplicaten).
    await notifyAllManagersAndAdmins(
      'SHIFT_EXCHANGE',
      'Permintaan Tukar Hari OFF menunggu persetujuan',
      `${exchange.targetUser.name} menerima permintaan tukar hari OFF dari ${exchange.requester.name} (${exchange.requesterSchedule.date} ↔ ${exchange.targetSchedule.date}).`,
      '/manager/requests',
      tx
    );

    return { updatedExchange: exchange.id, rejected: false };
  }).then(async (result) => {
    if (result.rejected) {
      // REJECTED → evidence (blob + metadata) opruimen; request-regel BLIJFT bewaard.
      try {
        await deleteEvidenceForRejectedRecord('ShiftExchange', params.exchangeId, params.targetUserId);
      } catch (error) {
        console.error('[ShiftExchange] evidence cleanup after target reject failed:', error);
      }
    }
    return prisma.shiftExchange.findUnique({ where: { id: params.exchangeId } });
  });
}
async function applyOffExchangeSwap(
  tx: TxClient,
  exchange: {
    requesterId: string;
    targetUserId: string;
    requesterSchedule: { id: string; date: string };
    targetSchedule: { id: string; date: string };
  },
  managerId: string
) {
  const A = exchange.requesterId;
  const B = exchange.targetUserId;
  const dA = exchange.requesterSchedule.date; // A OFF hier
  const dB = exchange.targetSchedule.date;    // B OFF hier

  // Lock de vier roster-cellen (serialiseert gelijktijdige submit/approve op deze data).
  await lockScheduleRows(tx, [exchange.requesterSchedule.id, exchange.targetSchedule.id]);

  const sA_dA = await tx.schedule.findUnique({ where: { userId_date: { userId: A, date: dA } } });
  const sB_dA = await tx.schedule.findUnique({ where: { userId_date: { userId: B, date: dA } } });
  const sA_dB = await tx.schedule.findUnique({ where: { userId_date: { userId: A, date: dB } } });
  const sB_dB = await tx.schedule.findUnique({ where: { userId_date: { userId: B, date: dB } } });

  // Re-validasi cuti/izin APPROVED (bisa disetujui setelah exchange dibuat).
  // REQUIREMENT #11: jangan menimpa schedule yang sudah menjadi CUTI/IZIN/SAKIT.
  const leaveChecks = await Promise.all([
    hasApprovedLeave(A, dA, tx),
    hasApprovedLeave(A, dB, tx),
    hasApprovedLeave(B, dA, tx),
    hasApprovedLeave(B, dB, tx),
  ]);
  if (leaveChecks.some((l) => Boolean(l))) {
    const leaveLabel = (l?: { type: LeaveType } | null) =>
      !l ? '' : l.type === LeaveType.SICK ? 'sakit' : l.type === LeaveType.PERMISSION ? 'izin' : 'cuti';
    const combos: Array<[string, string, { type: LeaveType } | null]> = [
      [A, dA, leaveChecks[0]],
      [A, dB, leaveChecks[1]],
      [B, dA, leaveChecks[2]],
      [B, dB, leaveChecks[3]],
    ];
    const conflict = combos.find(([, , l]) => Boolean(l));
    if (conflict) {
      throw new Error(
        `Konflik: operator ${conflict[0]} kini memiliki cuti/izin/sakit (${leaveLabel(conflict[2])}) pada tanggal ${conflict[1]}. Pertukaran tidak dapat diterapkan.`
      );
    }
  }

  if (!sA_dA || !sB_dA || !sA_dB || !sB_dB) {
    throw new Error('Roster veranderd — een van de jadwal is niet meer beschikbaar. Pertukaran niet kunnen toepassen.');
  }
  if (sA_dA.status !== ScheduleStatus.OFF || sB_dB.status !== ScheduleStatus.OFF) {
    throw new Error('OFF validatie veranderd sinds de aanvraag. Pertukaran niet kunnen toepassen.');
  }
  if (sB_dA.status !== ScheduleStatus.WORK || sA_dB.status !== ScheduleStatus.WORK) {
    throw new Error('Cross-work validatie gefaald — roster is niet meer compatibel.');
  }

  // PAYLOAD-SWAP: verwissel shiftId/locationId/status tussen de rijen op elke dag.
  // userId van een Schedule verandert NOOIT → UNIQUE(userId, date) kan nooit conflicteren.
  const swap = (dest: { id: string }, src: { shiftId: string; locationId: string; status: ScheduleStatus }, note: string) =>
    tx.schedule.update({
      where: { id: dest.id },
      data: { shiftId: src.shiftId, locationId: src.locationId, status: src.status, notes: note },
    });

  await swap(sA_dA, sB_dA, `Tukar hari OFF s/d ${exchange.targetUserId} (approve ${managerId})`);
  await swap(sB_dA, sA_dA, `Tukar hari OFF s/d ${exchange.requesterId} (approve ${managerId})`);
  await swap(sA_dB, sB_dB, `Tukar hari OFF s/d ${exchange.targetUserId} (approve ${managerId})`);
  await swap(sB_dB, sA_dB, `Tukar hari OFF s/d ${exchange.requesterId} (approve ${managerId})`);

  return { A, B, dA, dB };
}
export async function reviewShiftExchange(params: ReviewShiftExchangeParams) {
  const result = await prisma.$transaction(async (tx) => {
    // Concurrency: slechts één actie (respond/review) mag de exchange verwerken.
    await lockShiftExchangeRow(tx, params.exchangeId);

    const exchange = await tx.shiftExchange.findUnique({
      where: { id: params.exchangeId },
      include: {
        requester: { select: { name: true } },
        targetUser: { select: { name: true } },
        requesterSchedule: true,
        targetSchedule: true,
      },
    });

    if (!exchange) throw new Error('Pengajuan tukar hari OFF niet gevonden.');

    // FINAL-STATE GUARD — nooit herverwerken (PENDING → APPROVED → REJECTED etc.).
    if (exchange.status !== RequestStatus.PENDING) {
      throw new Error('Pengajuan tukar hari OFF heeft al een definitieve status — herverwerking niet toegestaan.');
    }

    // Manager mag alleen APPROVE als Operator B de aanvraag al heeft bevestigd.
    if (params.status === 'APPROVED' && exchange.confirmationStatus !== ACCEPTED_CONFIRMATION && !exchange.targetAcceptedAt) {
      throw new Error('Operator doelwit heeft de aanvraag nog niet bevestigd — APPROVE pas na bevestiging toegestaan.');
    }

    const updatedStatus = params.status === 'APPROVED' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

    // APPROVED → atomic roster swap (alles-of-niets, zelfde transaction).
    let swapped: { A: string; B: string; dA: string; dB: string } | null = null;
    if (updatedStatus === RequestStatus.APPROVED) {
      swapped = await applyOffExchangeSwap(tx, exchange, params.managerId);
    }

    // Conditional write (guard op status=PENDING naast de row-lock).
    const guarded = await tx.shiftExchange.updateMany({
      where: { id: params.exchangeId, status: RequestStatus.PENDING },
      data: {
        status: updatedStatus,
        approvalStatus: params.status === 'APPROVED' ? APPROVED_APPROVAL : REJECTED_APPROVAL,
        reviewedById: params.managerId,
        reviewedAt: new Date(),
        reviewerNote: params.reviewerNote || null,
      },
    });
    if (guarded.count === 0) {
      throw new Error('Aanvraag is inmiddels door iemand anders verwerkt (definitieve status).');
    }

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
    }, tx);

    if (swapped) {
      await recordAuditLog({
        userId: params.managerId,
        action: 'SCHEDULE_CHANGED_BY_SHIFT_EXCHANGE',
        entity: 'Schedule',
        entityId: exchange.requesterScheduleId,
        metadata: {
          exchangeId: exchange.id,
          offA: swapped.dA,
          offB: swapped.dB,
          atomicTransaction: true,
          swapStrategy: 'PAYLOAD_SWAP_NO_USERID_CHANGE',
        },
      }, tx);
    }

    const decisionText = params.status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
    await createNotification({
      userId: exchange.requesterId,
      type: 'SHIFT_EXCHANGE',
      title: `Tukar Hari OFF ${decisionText}`,
      message: `Permintaan tukar hari OFF dengan ${exchange.targetUser.name} telah ${decisionText.toLowerCase()} oleh Manager/Admin. Roster${params.status === 'APPROVED' ? ' resmi diperbarui' : ''}.`,
      link: '/operator/shift-exchange',
    }, tx);
    await createNotification({
      userId: exchange.targetUserId,
      type: 'SHIFT_EXCHANGE',
      title: `Tukar Hari OFF ${decisionText}`,
      message: `Permintaan tukar hari OFF dengan ${exchange.requester.name} telah ${decisionText.toLowerCase()} oleh Manager/Admin. Roster${params.status === 'APPROVED' ? ' resmi diperbarui' : ''}.`,
      link: '/operator/jadwal-saya',
    }, tx);

    return { exchangeId: params.exchangeId, rejected: params.status === 'REJECTED' };
  });

  if (result.rejected) {
    // REJECTED → evidence (blob + metadata) opruimen; request-regel BLIJFT bewaard.
    try {
      await deleteEvidenceForRejectedRecord('ShiftExchange', params.exchangeId, params.managerId);
    } catch (error) {
      console.error('[ShiftExchange] evidence cleanup after manager reject failed:', error);
    }
  }
  return prisma.shiftExchange.findUnique({ where: { id: params.exchangeId } });
}
export async function getOperatorShiftExchanges(userId: string) {
  return prisma.shiftExchange.findMany({
    where: { OR: [{ requesterId: userId }, { targetUserId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { name: true, employeeId: true } },
      targetUser: { select: { name: true, employeeId: true } },
      requesterSchedule: { include: { shift: true, location: true } },
      targetSchedule: { include: { shift: true, location: true } },
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
      requesterSchedule: { include: { shift: true, location: true } },
      targetSchedule: { include: { shift: true, location: true } },
      reviewedBy: { select: { name: true } },
    },
  });
}

/**
 * Kalender roster milik operator (untuk UI "Pilih Hari OFF Anda").
 * Return semua schedule dalam bulan yang diminta dengan shift + status.
 */
export async function getMyOffCalendar(userId: string, year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const schedules = await prisma.schedule.findMany({
    where: { userId, date: { startsWith: prefix } },
    orderBy: { date: 'asc' },
    include: { shift: true, location: true },
  });

  const pendingScheduleIds = await prisma.shiftExchange.findMany({
    where: {
      status: RequestStatus.PENDING,
      OR: [{ requesterScheduleId: { in: schedules.map((s) => s.id) } }, { requesterId: userId }],
    },
    select: { requesterScheduleId: true },
  });
  const busy = new Set(pendingScheduleIds.map((p) => p.requesterScheduleId));

  return schedules.map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    isEligibleOff: s.status === ScheduleStatus.OFF && !busy.has(s.id),
    shift: {
      id: s.shift.id,
      name: s.shift.name,
      code: s.shift.code,
      startTime: s.shift.startTime,
      endTime: s.shift.endTime,
    },
    location: s.location ? { name: s.location.name, code: s.location.code } : null,
  }));
}

/**
 * Hari OFF eligible milik satu operator (untuk UI select OFF dari Operator B).
 * Tanggal OFF yang: belum lewat, bukan OFF yang sedang pending exchange.
 * Validasi cross-work & cuti dilakukan final di server (submit).
 */
export async function getOperatorEligibleOffDays(operatorId: string) {
  const today = formatJakartaDate();
  const rows = await prisma.schedule.findMany({
    where: { userId: operatorId, status: ScheduleStatus.OFF, date: { gte: today } },
    orderBy: { date: 'asc' },
    include: { shift: true, location: true },
  });
  if (rows.length === 0) return [];

  const pendingInvolving = await prisma.shiftExchange.findMany({
    where: {
      status: RequestStatus.PENDING,
      OR: [
        { requesterScheduleId: { in: rows.map((r) => r.id) } },
        { targetScheduleId: { in: rows.map((r) => r.id) } },
      ],
    },
    select: { requesterScheduleId: true, targetScheduleId: true },
  });
  const using = new Set<string>();
  for (const p of pendingInvolving) {
    if (p.requesterScheduleId) using.add(p.requesterScheduleId);
    if (p.targetScheduleId) using.add(p.targetScheduleId);
  }

  return rows
    .filter((r) => !using.has(r.id))
    .map((r) => ({
      id: r.id,
      date: r.date,
      shift: { name: r.shift.name, startTime: r.shift.startTime, endTime: r.shift.endTime },
      location: r.location ? r.location.name : null,
    }));
}
/**
 * Cari operator lain yang memiliki hari OFF eligible untuk pertukaran.
 * Filter: aktif, role OPERATOR, bukan requester, nama/username/employeeId (case-insensitive).
 * Tidak fetch seluruh roster — hanya count OFF eligible per kandidat (performance).
 */
/**
 * CARI KARYAWAN YANG BISA DIAJAK TUKAR — berbasis TANGGAL OFF yang dipilih user.
 *
 * Filter server-side (bisnis rule OFF↔OFF, matrix swap):
 * - kandidat aktif, role OPERATOR, bukan requester
 * - kandidat WORK pada tanggal OFF requester (cross-work)
 * - requester WORK pada tanggal OFF kandidat (cross-work)
 * - tanggal OFF kandidat != tanggal OFF requester, belum lewat
 * - OFF kandidat belum terlibat dalam exchange pending
 * - tidak ada approved cuti/izin/sakit pada kedua tanggal (kedua operator)
 * - query (nama/username/employeeId) OPSIONAL sebagai filter search
 */
export async function findExchangeCandidates(params: {
  requesterId: string;
  requesterOffDate: string; // tanggal OFF yang dipilih user (konteks pencarian)
  query?: string;
  limit?: number;
}) {
  const { requesterId, requesterOffDate, query = '', limit = 8 } = params;
  const today = formatJakartaDate();

  // Resolver schedule requester pada tanggal OFF sendiri (wajib OFF valid)
  const requesterOwnOff = await prisma.schedule.findUnique({
    where: { userId_date: { userId: requesterId, date: requesterOffDate } },
  });
  if (!requesterOwnOff || requesterOwnOff.status !== ScheduleStatus.OFF) {
    throw new Error('Hari OFF sumber tidak valid.');
  }
  if (requesterOwnOff.date < today) {
    throw new Error('Hari OFF sumber sudah lewat — tidak dapat ditukar.');
  }

  const operators = await prisma.user.findMany({
    where: {
      role: 'OPERATOR',
      isActive: true,
      id: { not: requesterId },
      ...(query.trim().length >= 2
        ? {
            OR: [
              { name: { contains: query.trim(), mode: 'insensitive' } },
              { username: { contains: query.trim(), mode: 'insensitive' } },
              { employeeId: { contains: query.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, username: true, employeeId: true, position: true, avatarUrl: true },
    orderBy: { name: 'asc' },
    take: 25,
  });

  interface CandidateOff {
    id: string;
    date: string;
  }

  const candidates: Array<{
    operator: { id: string; name: string; username: string; employeeId: string; position: string | null; avatarUrl: string | null };
    offDays: CandidateOff[];
    offCount: number;
  }> = [];

  for (const op of operators) {
    // 1. Cross-work: kandidat WAJIB WORK pada tanggal OFF requester
    const candidateOnReqOffDate = await prisma.schedule.findUnique({
      where: { userId_date: { userId: op.id, date: requesterOffDate } },
    });
    if (!candidateOnReqOffDate || candidateOnReqOffDate.status !== ScheduleStatus.WORK) {
      continue; // kandidat tidak bekerja pada tanggal tersebut → bukan kandidat valid
    }

    // 2. Hari OFF eligible milik kandidat
    const eligibleOffs = await getOperatorEligibleOffDays(op.id);
    const validOppDays: CandidateOff[] = [];

    for (const off of eligibleOffs) {
      if (off.date === requesterOffDate) continue; // bukan tanggal sama
      if (off.date < today) continue;

      // 3. Cross-work: requester WAJIB WORK pada tanggal OFF kandidat
      const requesterOnCandidateOff = await prisma.schedule.findUnique({
        where: { userId_date: { userId: requesterId, date: off.date } },
      });
      if (!requesterOnCandidateOff || requesterOnCandidateOff.status !== ScheduleStatus.WORK) {
        continue;
      }

      // 4. No approved leave on either date for either operator
      const leaveOk = await Promise.all([
        hasApprovedLeave(requesterId, requesterOffDate),
        hasApprovedLeave(requesterId, off.date),
        hasApprovedLeave(op.id, requesterOffDate),
        hasApprovedLeave(op.id, off.date),
      ]);
      // approved leave on requester own OFF date => shouldn't even be selectable; treat as block
      if (leaveOk.some((l) => Boolean(l))) continue;

      // 5. No pending exchange involving these two OFF schedules
      const pending = await prisma.shiftExchange.findFirst({
        where: {
          status: RequestStatus.PENDING,
          OR: [
            { requesterScheduleId: requesterOwnOff.id },
            { targetScheduleId: off.id },
            { targetScheduleId: requesterOwnOff.id },
            { requesterScheduleId: off.id },
          ],
        },
        select: { id: true },
      });
      if (pending) continue;

      validOppDays.push({ id: off.id, date: off.date });
    }

    if (validOppDays.length > 0) {
      candidates.push({
        operator: {
          id: op.id,
          name: op.name,
          username: op.username ?? '',
          employeeId: op.employeeId,
          position: op.position,
          avatarUrl: op.avatarUrl,
        },
        offDays: validOppDays,
        offCount: validOppDays.length,
      });
    }
  }

  candidates.sort((a, b) => b.offCount - a.offCount || a.operator.name.localeCompare(b.operator.name));
  return candidates.slice(0, limit);
}

/** @deprecated ON↔ON flow — kept for compat only; returns OFF schedules. */
export async function getExchangeableSchedules(userId: string) {
  return prisma.schedule.findMany({
    where: { userId, status: ScheduleStatus.OFF },
    orderBy: { date: 'asc' },
    include: { shift: true, location: true },
  });
}