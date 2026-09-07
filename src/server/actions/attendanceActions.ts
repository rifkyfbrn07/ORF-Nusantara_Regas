'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import { performCheckIn, performCheckOut, performManualCorrection } from '../services/attendanceService';
import { checkInSchema, checkOutSchema, manualAttendanceCorrectionSchema, ManualAttendanceCorrectionInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function checkInAction(input: { scheduleId: string; location?: string; notes?: string }) {
  try {
    const user = await requireAuth();
    const parse = checkInSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const attendance = await performCheckIn({
      userId: user.id,
      scheduleId: parse.data.scheduleId,
      location: parse.data.location,
      notes: parse.data.notes,
    });

    revalidatePath('/operator/dashboard');
    revalidatePath('/operator/attendance');
    revalidatePath('/manager/dashboard');
    revalidatePath('/manager/attendance');

    return { success: true, attendance };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal melakukan check-in.' };
  }
}

export async function checkOutAction(input: { attendanceId: string; notes?: string }) {
  try {
    const user = await requireAuth();
    const parse = checkOutSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const attendance = await performCheckOut({
      userId: user.id,
      attendanceId: parse.data.attendanceId,
      notes: parse.data.notes,
    });

    revalidatePath('/operator/dashboard');
    revalidatePath('/operator/attendance');
    revalidatePath('/manager/dashboard');
    revalidatePath('/manager/attendance');

    return { success: true, attendance };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal melakukan check-out.' };
  }
}

export async function manualCorrectionAction(input: ManualAttendanceCorrectionInput) {
  try {
    const manager = await requireRole(['MANAGER']);
    const parse = manualAttendanceCorrectionSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const attendance = await performManualCorrection({
      managerId: manager.id,
      attendanceId: parse.data.attendanceId,
      userId: parse.data.userId,
      date: parse.data.date,
      checkInTime: parse.data.checkInTime,
      checkOutTime: parse.data.checkOutTime,
      status: parse.data.status,
      notes: parse.data.notes,
    });

    revalidatePath('/manager/dashboard');
    revalidatePath('/manager/attendance');
    revalidatePath('/manager/reports');

    return { success: true, attendance };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal melakukan koreksi absensi.' };
  }
}
