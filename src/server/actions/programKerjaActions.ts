'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { createProgramKerja, updateProgramKerja, deleteProgramKerja } from '../services/programKerjaService';
import { programKerjaCreateSchema, programKerjaUpdateSchema, ProgramKerjaCreateInput, ProgramKerjaUpdateInput } from '@/lib/validation';

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

export async function updateProgramTaskAction(input: { taskId: string; isDone: boolean }) {
  try {
    const user = await requireAuth();
    if (user.role !== 'OPERATOR' && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return { success: false as const, error: 'Akses ditolak.' };
    }
    if (!input.taskId) return { success: false as const, error: 'Task tidak valid.' };

    const task = await prisma.programKerjaTask.findUnique({
      where: { id: input.taskId },
      include: { program: { select: { id: true, picId: true } } },
    });
    if (!task) return { success: false as const, error: 'Checklist tidak ditemukan.' };

    if (user.role === 'OPERATOR' && task.program.picId !== user.id) {
      return { success: false as const, error: 'Checklist ini bukan bagian dari tugas Anda.' };
    }

    const updated = await prisma.programKerjaTask.update({
      where: { id: task.id },
      data: {
        isDone: input.isDone,
        doneAt: input.isDone ? new Date() : null,
        doneById: input.isDone ? user.id : null,
      },
    });

    const total = await prisma.programKerjaTask.count({ where: { programId: task.program.id } });
    const completed = await prisma.programKerjaTask.count({ where: { programId: task.program.id, isDone: true } });
    const picProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    await prisma.programKerja.update({
      where: { id: task.program.id },
      data: { picProgress, progress: Math.max(picProgress, 0) },
    });

    revalidateProgramKerja();
    return { success: true as const, task: updated, picProgress };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memperbarui checklist' };
  }
}
