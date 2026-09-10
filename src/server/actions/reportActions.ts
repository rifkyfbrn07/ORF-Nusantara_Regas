'use server';

import { requireAuth, requireRole } from '@/lib/auth/session';
import { operationalReportSchema, OperationalReportInput } from '@/lib/validation';
import {
  createOperationalReport,
  getOperationalReports,
  deleteOperationalReport,
} from '../services/operationalReportService';
import { revalidatePath } from 'next/cache';

export async function createOperationalReportAction(input: OperationalReportInput) {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);
    const parse = operationalReportSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const report = await createOperationalReport({
      title: parse.data.title,
      reportType: parse.data.reportType,
      periodDate: parse.data.periodDate,
      departmentId: parse.data.departmentId,
      description: parse.data.description,
      attachmentUrl: parse.data.attachmentUrl,
      attachmentName: parse.data.attachmentName,
      attachmentMime: parse.data.attachmentMime,
      attachmentSize: parse.data.attachmentSize,
      driveFileId: parse.data.driveFileId,
      driveWebViewLink: parse.data.driveWebViewLink,
      uploadedById: user.id,
    });

    revalidatePath('/manager/reports');
    return { success: true, report };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan laporan operasional.',
    };
  }
}

export async function getOperationalReportsAction(options?: {
  reportType?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    await requireAuth();
    const reports = await getOperationalReports(options);
    return { success: true, reports };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat data laporan.',
      reports: [],
    };
  }
}

export async function deleteOperationalReportAction(id: string) {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);
    await deleteOperationalReport(id, user.id);
    revalidatePath('/manager/reports');
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menghapus laporan.',
    };
  }
}
