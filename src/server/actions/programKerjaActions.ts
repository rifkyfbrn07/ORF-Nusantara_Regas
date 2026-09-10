'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import {
  createProgramKerja,
  updateProgramKerja,
  deleteProgramKerja,
  upsertProgramKerjaTask,
  setTaskDone,
  updatePicProgress,
} from '../services/programKerjaService';
import {
  programKerjaCreateSchema,
  programKerjaUpdateSchema,
  programKerjaProgressSchema,
  ProgramKerjaCreateInput,
  ProgramKerjaUpdateInput,
} from '@/lib/validation';

const ALLOWED_ROLES = ['MANAGER', 'ADMIN'] as const;

function revalidateProgramKerja() {
  revalidatePath('/manager/program-kerja');
  revalidatePath('/operator/program-kerja');
  revalidatePath('/manager/dashboard');
  revalidatePath('/operator/dashboard');
}

export async function createProgramKerjaAction(input: ProgramKerjaCreateInput) {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programKerjaCreateSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data tidak valid' };
    const program = await createProgramKerja(parse.data, user.id);
    revalidateProgramKerja();
    return { success: true as const, program };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal membuat program' };
  }
}

export async function updateProgramKerjaAction(input: ProgramKerjaUpdateInput) {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programKerjaUpdateSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data tidak valid' };
    const program = await updateProgramKerja(parse.data, user.id);
    revalidateProgramKerja();
    return { success: true as const, program };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memperbarui program' };
  }
}

export async function deleteProgramKerjaAction(id: string) {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    if (!id || typeof id !== 'string') return { success: false as const, error: 'ID Program tidak valid' };
    await deleteProgramKerja(id, user.id);
    revalidateProgramKerja();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghapus program' };
  }
}

export async function upsertTaskAction(input: { programId: string; label: string; isDone: boolean }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR']);
    if (!input.programId || input.label.trim().length < 3) return { success: false as const, error: 'Program dan nama task wajib diisi.' };
    const task = await upsertProgramKerjaTask({
      programId: input.programId,
      label: input.label.trim(),
      isDone: input.isDone,
      actorId: user.id,
      actorRole: user.role,
    });
    revalidateProgramKerja();
    return { success: true as const, task };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal simpan task.' };
  }
}

export async function setTaskDoneAction(input: { taskId: string; isDone: boolean }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR']);
    await setTaskDone({ taskId: input.taskId, isDone: input.isDone, actorId: user.id, actorRole: user.role });
    revalidateProgramKerja();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memperbarui task.' };
  }
}

export async function updatePicProgressAction(input: { programId: string; progress: number }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR']);
    const parsedProgress = programKerjaProgressSchema.safeParse(input.progress);
    if (!parsedProgress.success) return { success: false as const, error: parsedProgress.error.issues[0]?.message || 'Progress harus 0–100%.' };
    const result = await updatePicProgress(input.programId, parsedProgress.data, user.id, user.role);
    revalidateProgramKerja();
    return { success: true as const, progress: result.progress };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memperbarui progress.' };
  }
}
