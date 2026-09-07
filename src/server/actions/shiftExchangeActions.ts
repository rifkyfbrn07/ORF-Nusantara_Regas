'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import { submitShiftExchange, reviewShiftExchange } from '../services/shiftExchangeService';
import { shiftExchangeSchema, reviewShiftExchangeSchema, ShiftExchangeInput } from '@/lib/validation';
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
      targetDate: parse.data.targetDate,
      reason: parse.data.reason,
    });

    revalidatePath('/operator/shift-exchange');
    revalidatePath('/manager/requests');

    return { success: true, exchange };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengajukan pergantian shift.' };
  }
}

export async function reviewShiftExchangeAction(input: { exchangeId: string; status: 'APPROVED' | 'REJECTED'; reviewerNote?: string }) {
  try {
    const manager = await requireRole(['MANAGER']);
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
