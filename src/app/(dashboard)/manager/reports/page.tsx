import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getAttendanceAnalytics } from '@/server/services/reportService';
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

  const analytics = await getAttendanceAnalytics(startDate, endDate);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="ANALYTICS & EXECUTIVE INTELLIGENCE"
        title="Laporan & Analitik"
        description="Analisis tren kehadiran manpower, tingkat kepatuhan waktu, serta evaluasi operasional shift fasilitas ORF Muara Karang."
      />

      <ReportsClient
        summary={analytics.summary}
        trendData={analytics.trendData}
        shiftDistribution={analytics.shiftDistribution}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
