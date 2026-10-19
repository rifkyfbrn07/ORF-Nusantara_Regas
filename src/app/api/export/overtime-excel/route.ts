import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getMonthlyOvertimeReport } from '@/server/services/overtimeService';
import { generateMonthlyOvertimeExcel } from '@/server/services/overtimeExcelService';
import { recordAuditLog } from '@/server/services/auditService';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    // Default ke periode September 2026 (data ORF) bila parameter tidak ada.
    const year = yearParam ? parseInt(yearParam, 10) : 2026;
    const month = monthParam ? parseInt(monthParam, 10) : 9; // September default as per project

    // Target User ID:
    // Operator can only export their own overtime.
    // Manager and Admin can export for any selected operator.
    let targetUserId = session.id;
    if (queryUserId && queryUserId !== session.id) {
      if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
        return new NextResponse('Forbidden: Anda tidak berhak mengunduh rekap lembur operator lain', { status: 403 });
      }
      targetUserId = queryUserId;
    }

    const report = await getMonthlyOvertimeReport(targetUserId, year, month);
    const excelBuffer = await generateMonthlyOvertimeExcel(report);

    // Audit trail: jejak unduhan evidence lembur (operator + periode sumber).
    await recordAuditLog({
      userId: session.id,
      action: 'EXPORT_OVERTIME_EXCEL',
      entity: 'User',
      entityId: targetUserId,
      metadata: {
        targetUserName: report.user.name,
        targetEmployeeId: report.user.employeeId,
        year,
        month,
        totalJamLembur: report.summary.totalJamLembur,
        requestedByRole: session.role,
      },
    });

    const filename = `Rekapitulasi Lembur - ${report.user.name} - ${report.period.periodeBulanText}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: unknown) {
    console.error('[overtime-excel] Error generating excel:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Gagal menghasilkan dokumen lembur',
      { status: 500 }
    );
  }
}
