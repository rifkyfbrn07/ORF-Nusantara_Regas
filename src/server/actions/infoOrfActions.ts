'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import {
  infoOrfDateSchema,
  infoOrfReportSchema,
  infoOrfReportUpdateSchema,
  nextCargoSchema,
  InfoOrfReportInput,
  InfoOrfReportUpdateInput,
  NextCargoInput,
} from '@/lib/validation';
import type { InfoOrfReportDTO, NextCargoDTO } from '@/lib/infoOrfTypes';
import {
  createInfoOrfReport,
  updateInfoOrfReport,
  upsertNextCargo,
  getInfoOrfReportsForDate,
  InfoOrfDuplicateError,
} from '../services/infoOrfService';
import { revalidatePath } from 'next/cache';

const INFO_ORF_PATHS = ['/manager/info-orf', '/operator/info-orf', '/manager/dashboard', '/operator/dashboard'];

type ActionError = { success: false; error: string; code?: string };
type InfoOrfReportActionResult = { success: true; report: InfoOrfReportDTO } | ActionError;
type NextCargoActionResult = { success: true; cargo: NextCargoDTO } | ActionError;

function revalidateInfoOrf() {
  for (const path of INFO_ORF_PATHS) revalidatePath(path);
}

export async function createInfoOrfReportAction(input: InfoOrfReportInput): Promise<InfoOrfReportActionResult> {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);
    const parse = infoOrfReportSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message || 'Data laporan tidak valid.' };
    }

    const report = await createInfoOrfReport({
      ...parse.data,
      recordedById: user.id,
    });

    revalidateInfoOrf();
    return { success: true, report };
  } catch (error: unknown) {
    if (error instanceof InfoOrfDuplicateError) {
      return {
        success: false,
        error: 'Laporan untuk tanggal dan jam ini sudah ada. Gunakan Edit untuk mengoreksi, bukan menambah laporan baru.',
        code: 'DUPLICATE_REPORT',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan laporan Info ORF.',
    };
  }
}

export async function updateInfoOrfReportAction(input: InfoOrfReportUpdateInput): Promise<InfoOrfReportActionResult> {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);
    const parse = infoOrfReportUpdateSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message || 'Data laporan tidak valid.' };
    }

    const { id, ...data } = parse.data;
    const report = await updateInfoOrfReport({ ...data, id, updatedById: user.id });

    revalidateInfoOrf();
    return { success: true, report };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memperbarui laporan Info ORF.',
    };
  }
}

export async function upsertNextCargoAction(input: NextCargoInput): Promise<NextCargoActionResult> {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);
    const parse = nextCargoSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message || 'Data Next Cargo tidak valid.' };
    }

    const cargo = await upsertNextCargo({
      ...parse.data,
      eta: new Date(parse.data.eta),
      lastUpdatedById: user.id,
    });

    revalidateInfoOrf();
    return { success: true, cargo };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan data Next Cargo.',
    };
  }
}

/** Ambil laporan untuk satu tanggal (untuk pergantian tanggal di sisi client). */
export async function getInfoOrfReportsForDateAction(
  date: string
): Promise<{ success: true; reports: InfoOrfReportDTO[] } | ActionError> {
  try {
    await requireAuth();
    const parsedDate = infoOrfDateSchema.safeParse(date);
    if (!parsedDate.success) {
      return { success: false, error: parsedDate.error.issues[0]?.message || 'Tanggal laporan tidak valid.' };
    }
    const reports = await getInfoOrfReportsForDate(parsedDate.data);
    return { success: true, reports };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat laporan Info ORF.',
    };
  }
}
