'use server';

import { requireRole } from '@/lib/auth/session';
import { createOperator, updateOperator, toggleOperatorActiveStatus } from '../services/operatorService';
import { operatorCreateSchema, operatorUpdateSchema, OperatorCreateInput, OperatorUpdateInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function createOperatorAction(input: OperatorCreateInput) {
  try {
    const manager = await requireRole(['MANAGER']);
    const parse = operatorCreateSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const operator = await createOperator({
      ...parse.data,
      creatorId: manager.id,
    });

    revalidatePath('/manager/operators');
    revalidatePath('/manager/dashboard');

    return { success: true, operator };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menambahkan operator.' };
  }
}

export async function updateOperatorAction(input: OperatorUpdateInput) {
  try {
    const manager = await requireRole(['MANAGER']);
    const parse = operatorUpdateSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const operator = await updateOperator({
      ...parse.data,
      updaterId: manager.id,
    });

    revalidatePath('/manager/operators');
    revalidatePath(`/manager/operators/${input.id}`);
    revalidatePath('/manager/dashboard');

    return { success: true, operator };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui data operator.' };
  }
}

export async function toggleOperatorStatusAction(operatorId: string) {
  try {
    const manager = await requireRole(['MANAGER']);
    const operator = await toggleOperatorActiveStatus(operatorId, manager.id);

    revalidatePath('/manager/operators');
    revalidatePath(`/manager/operators/${operatorId}`);

    return { success: true, operator };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengubah status aktif operator.' };
  }
}
