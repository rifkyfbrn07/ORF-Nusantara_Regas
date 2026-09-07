'use server';

import { requireAuth } from '@/lib/auth/session';
import { submitHSSEChecklist } from '../services/hsseService';
import { hsseChecklistSchema, HSSEChecklistInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function submitHSSEAction(input: HSSEChecklistInput) {
  try {
    const user = await requireAuth();
    const parse = hsseChecklistSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const checklist = await submitHSSEChecklist({
      ...parse.data,
      operatorId: user.id,
    });

    revalidatePath('/operator/hsse');
    revalidatePath('/manager/hsse');

    return { success: true, checklist };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menyimpan checklist HSSE.' };
  }
}
