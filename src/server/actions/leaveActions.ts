'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import {
  submitLeaveRequest,
  processLeaveApproval,
  searchEmployeesForLeave,
  getPendingLeaveApprovalsForUser,
  type ApprovalStage,
} from '../services/leaveService';
import { rollbackBlobIfUnreferenced } from '../services/vercelBlobService';
import { leaveRequestSchema, leaveApprovalSchema, LeaveRequestInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function submitLeaveAction(input: LeaveRequestInput) {
  let storagePathForRollback: string | undefined;
  try {
    const currentUser = await requireAuth();
    const parse = leaveRequestSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    // If DB write below fails, we can roll back the just-uploaded blob
    // (only when it's not referenced by an existing record).
    storagePathForRollback = parse.data.storagePath || undefined;

    let finalUserId = currentUser.id;

    // If submitting on behalf of another employee
    if (parse.data.targetUserId && parse.data.targetUserId !== currentUser.id) {
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
        return { success: false, error: 'Anda tidak memiliki izin untuk mengajukan cuti atas nama operator lain.' };
      }
      finalUserId = parse.data.targetUserId;
    }

    const request = await submitLeaveRequest({
      userId: finalUserId,
      type: parse.data.type,
      startDate: parse.data.startDate,
      endDate: parse.data.endDate,
      reason: parse.data.reason,
      telepon: parse.data.telepon,
      alamatCuti: parse.data.alamatCuti,
      penyerahanTugas: parse.data.penyerahanTugas,
      attachmentUrl: parse.data.attachmentUrl,
      attachmentName: parse.data.attachmentName,
      attachmentMime: parse.data.attachmentMime,
      attachmentSize: parse.data.attachmentSize,
      driveFileId: parse.data.driveFileId,
      driveWebViewLink: parse.data.driveWebViewLink,
      storageProvider: parse.data.storageProvider,
      storagePath: parse.data.storagePath,
    });

    revalidatePath('/operator/requests');
    revalidatePath('/manager/requests');
    revalidatePath('/manager/dashboard');

    return { success: true, request };
  } catch (error: unknown) {
    // Rollback: jangan pernah meninggalkan record palsu bila metadata-write gagal
    // setelah blob upload berhasil.
    if (storagePathForRollback) {
      await rollbackBlobIfUnreferenced(storagePathForRollback).catch(() => {});
    }
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengajukan permohonan cuti/izin.' };
  }
}

export async function searchEmployeesAction(query: string) {
  try {
    await requireRole(['MANAGER', 'ADMIN']);
    const results = await searchEmployeesForLeave(query, 12);
    return { success: true, data: results };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mencari data karyawan.', data: [] };
  }
}

/**
 * Approval cuti berurutan 3 tahap (Reviewer -> Team Lead -> Manager).
 * Validasi kewenangan & urutan tahap dilaksanakan di service (server-side).
 */
export async function processLeaveApprovalAction(input: {
  requestId: string;
  stage: ApprovalStage;
  status: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  try {
    const approver = await requireAuth();
    const parse = leaveApprovalSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const updated = await processLeaveApproval({
      requestId: parse.data.requestId,
      approverId: approver.id,
      stage: parse.data.stage,
      status: parse.data.status,
      note: parse.data.note,
    });

    revalidatePath('/manager/requests');
    revalidatePath('/manager/dashboard');
    revalidatePath('/operator/requests');
    revalidatePath('/operator/dashboard');
    revalidatePath('/operator/jadwal-saya');
    revalidatePath('/manager/jadwal-operator');
    revalidatePath('/admin/dashboard');

    return { success: true, request: updated };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memproses permohonan cuti/izin.' };
  }
}

/** Antrian pengajuan yang menunggu keputusan user ini (Reviewer/Team Lead/Manager). */
export async function getMyPendingApprovalsAction() {
  try {
    const user = await requireAuth();
    const items = await getPendingLeaveApprovalsForUser(user.id);
    return { success: true, items };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat antrian persetujuan.',
      items: [],
    };
  }
}
