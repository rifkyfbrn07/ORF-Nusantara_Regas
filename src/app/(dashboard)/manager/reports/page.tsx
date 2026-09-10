import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getAttendanceAnalytics } from '@/server/services/reportService';
import { getOperationalReports } from '@/server/services/operationalReportService';
import { prisma } from '@/lib/db/prisma';
import { ReportsClient } from './ReportsClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  await requireRole(['MANAGER', 'ADMIN']);
  const resolvedParams = await searchParams;
  const startDate = resolvedParams.startDate || '2026-09-01';
  const endDate = resolvedParams.endDate || '2026-09-30';

  const [analytics, operationalReports, departments] = await Promise.all([
    getAttendanceAnalytics(startDate, endDate),
    getOperationalReports({ startDate, endDate }),
    prisma.department.findMany({ select: { id: true, name: true, code: true } }),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="ANALYTICS & EXECUTIVE INTELLIGENCE"
        title="Laporan & Analitik"
        description="Analisis tren kehadiran manpower, tingkat kepatuhan waktu, serta pengelolaan berkas laporan operasional terhubung Google Drive."
      />

      <ReportsClient
        summary={analytics.summary}
        trendData={analytics.trendData}
        shiftDistribution={analytics.shiftDistribution}
        initialOperationalReports={operationalReports}
        departments={departments}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
