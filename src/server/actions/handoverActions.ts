'use server';

import { requireAuth } from '@/lib/auth/session';
import { saveHandover, acknowledgeHandover } from '../services/handoverService';
import { handoverSchema, HandoverInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function saveHandoverAction(input: HandoverInput) {
  try {
    const user = await requireAuth();
    const parse = handoverSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const handover = await saveHandover({
      ...parse.data,
      outgoingOperatorId: user.id,
    });

    revalidatePath('/operator/handover');
    revalidatePath('/manager/handover');

    return { success: true, handover };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menyimpan catatan handover.' };
  }
}

export async function acknowledgeHandoverAction(handoverId: string) {
  try {
    const user = await requireAuth();
    const updated = await acknowledgeHandover(handoverId, user.id);

    revalidatePath('/operator/handover');
    revalidatePath('/manager/handover');

    return { success: true, handover: updated };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengonfirmasi handover.' };
  }
}
