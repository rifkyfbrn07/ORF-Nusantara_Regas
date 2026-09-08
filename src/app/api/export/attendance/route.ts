import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { formatJakartaTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'MANAGER') {
    return new NextResponse('Unauthorized: Manager role required', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || '2026-09-01';
  const endDate = searchParams.get('endDate') || '2026-09-30';

  const attendances = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: { select: { name: true, employeeId: true, position: true } },
      schedule: { include: { shift: true, location: true } },
    },
    orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }],
  });

  // Build CSV content
  const headers = ['Date', 'Employee ID', 'Operator Name', 'Position', 'Shift', 'Location', 'Status', 'Check In (WIB)', 'Check Out (WIB)', 'Late (Mins)', 'Notes'];
  
  const rows = attendances.map((a) => [
    a.date,
    `"${a.user.employeeId}"`,
    `"${a.user.name}"`,
    `"${a.user.position}"`,
    `"${a.schedule?.shift?.name || '—'}"`,
    `"${a.schedule?.location?.name || a.checkInLocation || 'ORF Muara Karang'}"`,
    a.status,
    a.checkIn ? formatJakartaTime(a.checkIn) : '—',
    a.checkOut ? formatJakartaTime(a.checkOut) : '—',
    a.lateMinutes || 0,
    `"${(a.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="DistribusiGasORF_Attendance_${startDate}_to_${endDate}.csv"`,
    },
  });
}
