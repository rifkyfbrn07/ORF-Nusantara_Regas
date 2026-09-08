'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import {
  createProgramKerja,
  updateProgramKerja,
  deleteProgramKerja,
} from '../services/programKerjaService';
import {
  programKerjaCreateSchema,
  programKerjaUpdateSchema,
  ProgramKerjaCreateInput,
  ProgramKerjaUpdateInput,
} from '@/lib/validation';

/** MANAGER & ADMIN boleh mengelola Program Kerja (otorisasi server-side). */
const ALLOWED_ROLES = ['MANAGER', 'ADMIN'] as const;

function revalidateProgramKerja() {
  revalidatePath('/manager/program-kerja');
  revalidatePath('/manager/dashboard');
}

export async function createProgramKerjaAction(input: ProgramKerjaCreateInput) {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programKerjaCreateSchema.safeParse(input);
    if (!parse.success) {
      return { success: false as const, error: parse.error.issues[0]?.message || 'Data tidak valid' };
    }
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
    if (!parse.success) {
      return { success: false as const, error: parse.error.issues[0]?.message || 'Data tidak valid' };
    }
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
    if (!id || typeof id !== 'string') {
      return { success: false as const, error: 'ID Program tidak valid' };
    }
    await deleteProgramKerja(id, user.id);
    revalidateProgramKerja();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghapus program' };
  }
}
