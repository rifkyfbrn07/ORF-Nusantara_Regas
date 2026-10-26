'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import { rollbackBlobIfUnreferenced } from '../services/vercelBlobService';
import {
  createProgramKerja,
  updateProgramKerja,
  deleteProgramKerja,
  upsertProgramKerjaTask,
  setTaskDone,
  updateProgramProgress,
  submitProgramUpdate,
  addProgramRealization,
  updateProgramKerjaSchedule,
  setProgramRealization,
  getProgramKerjaScheduleHistory,
  getProgramKerjaRealizationLog,
} from '../services/programKerjaService';
import type {
  ProgramRealizationAddInput,
  ProgramUpdateSubmitInput,
  ProgramKerjaScheduleChangeInput,
  ProgramKerjaSetRealizationInput,
} from '@/lib/validation';
import {
  programKerjaCreateSchema,
  programKerjaUpdateSchema,
  programKerjaProgressSchema,
  programUpdateSubmitSchema,
  programRealizationAddSchema,
  programKerjaScheduleChangeSchema,
  programKerjaSetRealizationSchema,
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
  let storagePathForRollback: string | undefined;
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programKerjaCreateSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data tidak valid' };
    storagePathForRollback = parse.data.storagePath || parse.data.driveFileId || undefined;
    const program = await createProgramKerja(parse.data, user.id);
    revalidateProgramKerja();
    return { success: true as const, program };
  } catch (error: unknown) {
    // Rollback blob wanneer metadata-write faalde na succesvolle upload
    // (alleen wanneer file nog nergens gerefereerd wordt).
    if (storagePathForRollback) await rollbackBlobIfUnreferenced(storagePathForRollback).catch(() => {});
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal membuat program' };
  }
}

export async function updateProgramKerjaAction(input: ProgramKerjaUpdateInput) {
  let storagePathForRollback: string | undefined;
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programKerjaUpdateSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data tidak valid' };
    storagePathForRollback = parse.data.storagePath || parse.data.driveFileId || undefined;
    const program = await updateProgramKerja(parse.data, user.id);
    revalidateProgramKerja();
    return { success: true as const, program };
  } catch (error: unknown) {
    if (storagePathForRollback) await rollbackBlobIfUnreferenced(storagePathForRollback).catch(() => {});
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
    const user = await requireRole(['ADMIN', 'MANAGER']);
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
    const user = await requireRole(['ADMIN', 'MANAGER']);
    await setTaskDone({ taskId: input.taskId, isDone: input.isDone, actorId: user.id, actorRole: user.role });
    revalidateProgramKerja();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memperbarui task.' };
  }
}

export async function submitProgramUpdateAction(input: ProgramUpdateSubmitInput) {
  let storagePathForRollback: string | undefined;
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programUpdateSubmitSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data update tidak valid' };
    storagePathForRollback = parse.data.storagePath || parse.data.driveFileId || undefined;
    const update = await submitProgramUpdate(parse.data, user.id);
    revalidateProgramKerja();
    return { success: true as const, update };
  } catch (error: unknown) {
    // Jika pembuatan record gagal setelah upload berhasil, buang blob yang
    // masih belum direferensikan — jangan biarkan file yatim.
    if (storagePathForRollback) await rollbackBlobIfUnreferenced(storagePathForRollback).catch(() => {});
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal mengirim update' };
  }
}

export async function addProgramRealizationAction(input: ProgramRealizationAddInput) {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programRealizationAddSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data tidak valid' };
    const program = await addProgramRealization(parse.data.programId, parse.data.amount, user.id, parse.data.note);
    revalidateProgramKerja();
    return { success: true as const, program };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menambahkan realisasi.' };
  }
}

export async function updatePicProgressAction(input: {
  programId: string;
  progress: number;
  note?: string;
  evidenceUrl?: string;
  evidenceName?: string;
  evidenceMime?: string;
  evidenceSize?: number;
  driveFileId?: string;
  driveWebViewLink?: string;
  storageProvider?: string;
  storagePath?: string;
}) {
  let storagePathForRollback: string | undefined;
  try {
    const user = await requireRole(['ADMIN', 'MANAGER']);
    const parsedProgress = programKerjaProgressSchema.safeParse(input.progress);
    if (!parsedProgress.success) return { success: false as const, error: parsedProgress.error.issues[0]?.message || 'Progress harus 0–100%.' };
    storagePathForRollback = input.storagePath || input.driveFileId || undefined;
    const result = await updateProgramProgress(input.programId, parsedProgress.data, user.id, user.role, {
      note: input.note,
      evidenceUrl: input.evidenceUrl,
      evidenceName: input.evidenceName,
      evidenceMime: input.evidenceMime,
      evidenceSize: input.evidenceSize,
      driveFileId: input.driveFileId,
      driveWebViewLink: input.driveWebViewLink,
      storageProvider: input.storageProvider,
      storagePath: input.storagePath,
    });
    revalidateProgramKerja();
    return { success: true as const, progress: result.progress };
  } catch (error: unknown) {
    if (storagePathForRollback) await rollbackBlobIfUnreferenced(storagePathForRollback).catch(() => {});
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memperbarui progress.' };
  }
}

export async function updateProgramKerjaScheduleAction(input: ProgramKerjaScheduleChangeInput) {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programKerjaScheduleChangeSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data jadwal tidak valid' };
    await updateProgramKerjaSchedule(parse.data.programId, parse.data.monthChanges, user.id, parse.data.reason ?? null);
    revalidateProgramKerja();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memperbarui jadwal program' };
  }
}

export async function setProgramRealizationAction(input: ProgramKerjaSetRealizationInput) {
  try {
    const user = await requireRole([...ALLOWED_ROLES]);
    const parse = programKerjaSetRealizationSchema.safeParse(input);
    if (!parse.success) return { success: false as const, error: parse.error.issues[0]?.message || 'Data realisasi tidak valid' };
    const program = await setProgramRealization(
      parse.data.programId,
      parse.data.year,
      parse.data.month,
      parse.data.week,
      parse.data.realization,
      user.id,
      parse.data.note ?? null,
    );
    revalidateProgramKerja();
    return { success: true as const, program };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan realisasi periode' };
  }
}

export async function getProgramKerjaScheduleHistoryAction(programId: string) {
  try {
    await requireRole([...ALLOWED_ROLES, 'OPERATOR']);
    if (!programId || typeof programId !== 'string') return { success: false as const, error: 'ID Program tidak valid' };
    const history = await getProgramKerjaScheduleHistory(programId);
    return { success: true as const, history };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memuat riwayat jadwal' };
  }
}

export async function getProgramKerjaRealizationLogAction(programId: string, month?: number) {
  try {
    await requireRole([...ALLOWED_ROLES, 'OPERATOR']);
    if (!programId || typeof programId !== 'string') return { success: false as const, error: 'ID Program tidak valid' };
    const log = await getProgramKerjaRealizationLog(programId, month);
    return { success: true as const, log };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memuat riwayat realisasi' };
  }
}
