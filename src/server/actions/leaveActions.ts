'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import { submitLeaveRequest, reviewLeaveRequest, searchEmployeesForLeave } from '../services/leaveService';
import { leaveRequestSchema, reviewLeaveSchema, LeaveRequestInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function submitLeaveAction(input: LeaveRequestInput) {
  try {
    const currentUser = await requireAuth();
    const parse = leaveRequestSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

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
      attachmentUrl: parse.data.attachmentUrl,
      attachmentName: parse.data.attachmentName,
      attachmentMime: parse.data.attachmentMime,
      attachmentSize: parse.data.attachmentSize,
      driveFileId: parse.data.driveFileId,
      driveWebViewLink: parse.data.driveWebViewLink,
    });

    revalidatePath('/operator/requests');
    revalidatePath('/manager/requests');
    revalidatePath('/manager/dashboard');

    return { success: true, request };
  } catch (error: unknown) {
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

export async function reviewLeaveAction(input: { requestId: string; status: 'APPROVED' | 'REJECTED'; reviewerNote?: string }) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    const parse = reviewLeaveSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const updated = await reviewLeaveRequest({
      requestId: parse.data.requestId,
      managerId: manager.id,
      status: parse.data.status,
      reviewerNote: parse.data.reviewerNote,
    });

    revalidatePath('/manager/requests');
    revalidatePath('/manager/dashboard');
    revalidatePath('/operator/requests');
    revalidatePath('/operator/dashboard');

    return { success: true, request: updated };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memproses permohonan cuti/izin.' };
  }
}
