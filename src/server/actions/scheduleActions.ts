'use server';

import { requireRole } from '@/lib/auth/session';
import { createOrUpdateSchedule, updateSchedule, deleteSchedule, duplicateDaySchedules } from '../services/scheduleService';
import { scheduleSchema, duplicateScheduleSchema, ScheduleInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function createScheduleAction(input: ScheduleInput) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    const parse = scheduleSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const schedule = await createOrUpdateSchedule({
      ...parse.data,
      creatorId: manager.id,
    });

    revalidatePath('/manager/schedules');
    revalidatePath('/manager/dashboard');
    revalidatePath('/operator/schedule');
    revalidatePath('/operator/dashboard');

    return { success: true, schedule };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menyimpan jadwal kerja.' };
  }
}

export async function updateScheduleAction(id: string, input: Partial<ScheduleInput>) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    const schedule = await updateSchedule({
      id,
      ...input,
      updaterId: manager.id,
    });

    revalidatePath('/manager/schedules');
    revalidatePath('/manager/dashboard');
    revalidatePath('/operator/schedule');
    revalidatePath('/operator/dashboard');

    return { success: true, schedule };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui jadwal kerja.' };
  }
}

export async function deleteScheduleAction(scheduleId: string) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    await deleteSchedule(scheduleId, manager.id);

    revalidatePath('/manager/schedules');
    revalidatePath('/manager/dashboard');

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menghapus jadwal kerja.' };
  }
}

export async function duplicateScheduleAction(sourceDate: string, targetDate: string) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    const parse = duplicateScheduleSchema.safeParse({ sourceDate, targetDate });
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const result = await duplicateDaySchedules(sourceDate, targetDate, manager.id);

    revalidatePath('/manager/schedules');
    revalidatePath('/manager/dashboard');

    return { success: true, result };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menduplikasi jadwal kerja.' };
  }
}
