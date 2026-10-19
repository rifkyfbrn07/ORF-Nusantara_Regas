import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getMonthlyOvertimeReport } from '@/server/services/overtimeService';
import { OvertimeViewer } from '@/components/overtime/OvertimeViewer';

export default async function ManagerLemburPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; year?: string; month?: string }>;
}) {
  const sessionUser = await requireRole(['MANAGER', 'ADMIN']);
  const resolvedParams = await searchParams;

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

  // Default to requested user, or first operator, or session user
  const targetUserId =
    resolvedParams.userId ||
    operators.find((o) => o.role === 'OPERATOR')?.id ||
    sessionUser.id;

  const year = resolvedParams.year ? parseInt(resolvedParams.year, 10) : 2026;
  const month = resolvedParams.month ? parseInt(resolvedParams.month, 10) : 9;

  const report = await getMonthlyOvertimeReport(targetUserId, year, month);

  return (
    <div className="space-y-6 max-w-6xl mx-auto dashboard-enter pb-10">
      <OvertimeViewer
        initialReport={report}
        isManagerOrAdmin={true}
        operatorList={operators}
        currentUserId={sessionUser.id}
      />
    </div>
  );
}
