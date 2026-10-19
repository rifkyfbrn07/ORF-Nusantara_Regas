import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getMonthlyOvertimeReport } from '@/server/services/overtimeService';
import { OvertimeViewer } from '@/components/overtime/OvertimeViewer';

export default async function OperatorLemburPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireAuth();
  const resolvedParams = await searchParams;

  const year = resolvedParams.year ? parseInt(resolvedParams.year, 10) : 2026;
  const month = resolvedParams.month ? parseInt(resolvedParams.month, 10) : 9;

  const report = await getMonthlyOvertimeReport(user.id, year, month);

  return (
    <div className="space-y-6 max-w-6xl mx-auto dashboard-enter pb-10">
      <OvertimeViewer
        initialReport={report}
        isManagerOrAdmin={false}
        currentUserId={user.id}
      />
    </div>
  );
}
