'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import {
  submitShiftExchange,
  reviewShiftExchange,
  respondShiftExchange,
  findExchangeCandidates,
  getOperatorEligibleOffDays,
} from '../services/shiftExchangeService';
import { shiftExchangeSchema, reviewShiftExchangeSchema, acceptShiftExchangeSchema, ShiftExchangeInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function submitShiftExchangeAction(input: ShiftExchangeInput) {
  try {
    const user = await requireAuth();
    const parse = shiftExchangeSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const exchange = await submitShiftExchange({
      requesterId: user.id,
      requesterScheduleId: parse.data.requesterScheduleId,
      targetUserId: parse.data.targetUserId,
      targetScheduleId: parse.data.targetScheduleId,
      reason: parse.data.reason,
      attachmentUrl: parse.data.attachmentUrl,
      attachmentName: parse.data.attachmentName,
      attachmentMime: parse.data.attachmentMime,
      attachmentSize: parse.data.attachmentSize,
      driveFileId: parse.data.driveFileId,
      driveWebViewLink: parse.data.driveWebViewLink,
    });

    revalidatePath('/operator/shift-exchange');
    revalidatePath('/manager/requests');

    return { success: true, exchange };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengajukan tukar hari OFF.' };
  }
}

export async function respondShiftExchangeAction(input: { exchangeId: string; accepted: boolean }) {
  try {
    const user = await requireAuth();
    const parse = acceptShiftExchangeSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const updated = await respondShiftExchange({
      exchangeId: parse.data.exchangeId,
      targetUserId: user.id,
      accepted: parse.data.accepted,
    });

    revalidatePath('/operator/shift-exchange');
    revalidatePath('/manager/requests');

    return { success: true, exchange: updated };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memproces jawaban permintaan penukaran shift.',
    };
  }
}

export async function findExchangeCandidatesAction(input: { requesterOffDate?: string; query?: string }) {
  try {
    const user = await requireAuth();
    if (!input.requesterOffDate) {
      return { success: false as const, error: 'Tanggal OFF wajib dipilih.', candidates: [] };
    }
    const result = await findExchangeCandidates({
      requesterId: user.id,
      requesterOffDate: input.requesterOffDate,
      query: input.query || '',
    });
    return { success: true as const, candidates: result };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Gagal mencari kandidat tukar hari OFF.',
      candidates: [],
    };
  }
}

export async function getOperatorEligibleOffDaysAction(operatorId: string) {
  try {
    await requireAuth();
    const offDays = await getOperatorEligibleOffDays(operatorId);
    return { success: true, offDays };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat hari OFF operator.',
      offDays: [],
    };
  }
}

export async function reviewShiftExchangeAction(input: { exchangeId: string; status: 'APPROVED' | 'REJECTED'; reviewerNote?: string }) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    const parse = reviewShiftExchangeSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const updated = await reviewShiftExchange({
      exchangeId: parse.data.exchangeId,
      managerId: manager.id,
      status: parse.data.status,
      reviewerNote: parse.data.reviewerNote,
    });

    revalidatePath('/manager/requests');
    revalidatePath('/manager/schedules');
    revalidatePath('/operator/shift-exchange');
    revalidatePath('/operator/schedule');

    return { success: true, exchange: updated };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memproses pengajuan pergantian shift.' };
  }
}
