'use server';

import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getMonthlyOvertimeReport } from '../services/overtimeService';

export async function getOvertimeReportAction(params?: {
  userId?: string;
  year?: number;
  month?: number;
}) {
  try {
    const session = await requireAuth();

    let targetUserId = session.id;
    if (params?.userId && params.userId !== session.id) {
      if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
        return { success: false, error: 'Anda tidak memiliki hak akses untuk melihat data lembur pekerja lain.' };
      }
      targetUserId = params.userId;
    }

    const year = params?.year || 2026;
    const month = params?.month || 9; // September default for ORF 2026 data

    const report = await getMonthlyOvertimeReport(targetUserId, year, month);
    return { success: true, report };
  } catch (error: unknown) {
    console.error('[overtimeActions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat data rekapitulasi lembur.',
    };
  }
}

export async function getOvertimeOperatorsListAction() {
  try {
    const session = await requireAuth();
    if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return { success: false, error: 'Akses terbatas untuk Manager & Admin.', operators: [] };
    }

    const operators = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        employeeId: true,
        position: true,
        role: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, operators };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat daftar operator.',
      operators: [],
    };
  }
}
