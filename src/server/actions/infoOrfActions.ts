'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import {
  infoOrfDateSchema,
  infoOrfReportSchema,
  infoOrfReportUpdateSchema,
  monitoringOrfReportSchema,
  monitoringOrfReportUpdateSchema,
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
  getInfoOrfReportsInRange,
  getPreviousInfoOrfReport,
  InfoOrfDuplicateError,
} from '../services/infoOrfService';
import { revalidatePath } from 'next/cache';

const INFO_ORF_PATHS = [
  '/manager/info-orf',
  '/operator/info-orf',
  '/manager/monitoring-orf',
  '/operator/monitoring-orf',
  '/manager/dashboard',
  '/operator/dashboard',
];

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

export async function saveMonitoringOrfReportAction(
  input: InfoOrfReportInput & { nextCargoId?: string | null; nextCargoCode?: string | null; nextCargoEta?: string | null; id?: string }
): Promise<InfoOrfReportActionResult> {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);
    let report: InfoOrfReportDTO;
    if (input.id) {
      const parse = monitoringOrfReportUpdateSchema.safeParse(input);
      if (!parse.success) {
        return { success: false, error: parse.error.issues[0]?.message || 'Data Monitoring ORF tidak valid.' };
      }
      const { id, nextCargoId, nextCargoCode, nextCargoEta, ...data } = parse.data;
      const nextCargo = !nextCargoId && nextCargoCode && nextCargoEta
        ? { cargoCode: nextCargoCode, eta: new Date(nextCargoEta) }
        : undefined;
      report = await updateInfoOrfReport({ ...data, id, nextCargoId, nextCargo, updatedById: user.id });
    } else {
      const parse = monitoringOrfReportSchema.safeParse(input);
      if (!parse.success) {
        return { success: false, error: parse.error.issues[0]?.message || 'Data Monitoring ORF tidak valid.' };
      }
      const { nextCargoId, nextCargoCode, nextCargoEta, ...data } = parse.data;
      const nextCargo = !nextCargoId && nextCargoCode && nextCargoEta
        ? { cargoCode: nextCargoCode, eta: new Date(nextCargoEta) }
        : undefined;
      report = await createInfoOrfReport({ ...data, nextCargoId, nextCargo, recordedById: user.id });
    }

    revalidateInfoOrf();
    return { success: true, report };
  } catch (error: unknown) {
    if (error instanceof InfoOrfDuplicateError) {
      return {
        success: false,
        error: 'Laporan pada tanggal dan jam tersebut sudah ada. Muat laporan yang ada untuk mengoreksi.',
        code: 'DUPLICATE_REPORT',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan laporan Monitoring ORF.',
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

export async function getPreviousInfoOrfReportAction(input: {
  reportDate: string;
  reportHour: string;
}): Promise<{ success: true; report: InfoOrfReportDTO | null } | ActionError> {
  try {
    await requireAuth();
    const parsedDate = infoOrfDateSchema.safeParse(input.reportDate);
    if (!parsedDate.success || !/^([01]\d|2[0-3])$/.test(input.reportHour)) {
      return { success: false, error: 'Tanggal atau jam laporan tidak valid.' };
    }

    const report = await getPreviousInfoOrfReport(parsedDate.data, input.reportHour);
    return { success: true, report };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat nilai laporan sebelumnya.',
    };
  }
}

export async function getInfoOrfReportsInRangeAction(input: {
  startDate: string;
  endDate: string;
  startHour: string;
  endHour: string;
}) {
  try {
    await requireAuth();
    const startDate = infoOrfDateSchema.safeParse(input.startDate);
    const endDate = infoOrfDateSchema.safeParse(input.endDate);
    if (!startDate.success || !endDate.success || startDate.data > endDate.data) {
      return { success: false as const, error: 'Rentang tanggal laporan tidak valid.' };
    }
    if (!/^([01]\d|2[0-3])$/.test(input.startHour) || !/^([01]\d|2[0-3])$/.test(input.endHour) || input.startHour > input.endHour) {
      return { success: false as const, error: 'Rentang jam harus valid dan jam awal tidak boleh melewati jam akhir.' };
    }
    const dayCount = (Date.parse(`${endDate.data}T00:00:00Z`) - Date.parse(`${startDate.data}T00:00:00Z`)) / 86_400_000 + 1;
    if (dayCount > 90) return { success: false as const, error: 'Rentang histori maksimal 90 hari.' };

    const reports = await getInfoOrfReportsInRange({
      startDate: startDate.data,
      endDate: endDate.data,
      startHour: input.startHour,
      endHour: input.endHour,
    });
    return { success: true as const, reports };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Gagal memuat histori Monitoring ORF.',
    };
  }
}
