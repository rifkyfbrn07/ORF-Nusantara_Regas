import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './auditService';

export interface CreateOperationalReportParams {
  title: string;
  reportType: string;
  periodDate: string;
  departmentId?: string;
  description?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentSize?: number;
  driveFileId?: string;
  driveWebViewLink?: string;
  uploadedById: string;
}

export async function createOperationalReport(params: CreateOperationalReportParams) {
  const report = await prisma.operationalReport.create({
    data: {
      title: params.title,
      reportType: params.reportType,
      periodDate: params.periodDate,
      departmentId: params.departmentId || null,
      description: params.description || null,
      attachmentUrl: params.attachmentUrl || params.driveWebViewLink || null,
      attachmentName: params.attachmentName || null,
      attachmentMime: params.attachmentMime || null,
      attachmentSize: params.attachmentSize || null,
      driveFileId: params.driveFileId || null,
      driveWebViewLink: params.driveWebViewLink || params.attachmentUrl || null,
      uploadedById: params.uploadedById,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      uploadedBy: { select: { id: true, name: true, position: true } },
    },
  });

  await recordAuditLog({
    userId: params.uploadedById,
    action: 'CREATE_OPERATIONAL_REPORT',
    entity: 'OperationalReport',
    entityId: report.id,
    metadata: {
      title: report.title,
      reportType: report.reportType,
      periodDate: report.periodDate,
      hasDriveAttachment: Boolean(report.driveFileId || report.attachmentUrl),
    },
  });

  return report;
}

export async function getOperationalReports(options?: {
  reportType?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: Record<string, unknown> = {};

  if (options?.reportType && options.reportType !== 'ALL') {
    where.reportType = options.reportType;
  }
  if (options?.departmentId && options.departmentId !== 'ALL') {
    where.departmentId = options.departmentId;
  }
  if (options?.startDate || options?.endDate) {
    where.periodDate = {
      ...(options.startDate ? { gte: options.startDate } : {}),
      ...(options.endDate ? { lte: options.endDate } : {}),
    };
  }

  return prisma.operationalReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      department: { select: { id: true, name: true, code: true } },
      uploadedBy: { select: { id: true, name: true, employeeId: true, position: true } },
    },
  });
}

export async function deleteOperationalReport(id: string, userId: string) {
  const existing = await prisma.operationalReport.findUnique({
    where: { id },
  });

  if (!existing) throw new Error('Laporan tidak ditemukan.');

  await prisma.operationalReport.delete({
    where: { id },
  });

  await recordAuditLog({
    userId,
    action: 'DELETE_OPERATIONAL_REPORT',
    entity: 'OperationalReport',
    entityId: id,
    metadata: { title: existing.title, reportType: existing.reportType },
  });

  return { success: true };
}
