import React from 'react';
import { requireRole } from '@/lib/auth/session';
import {
  listProgramKerja,
  getProgramKerjaStats,
  getProgramKerjaYears,
  getProgramKerjaAnnualChart,
} from '@/server/services/programKerjaService';
import { ProgramKerjaClient } from './ProgramKerjaClient';
import { PageHeader } from '@/components/ui/PageHeader';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagerProgramKerjaPage({ searchParams }: PageProps) {
  // Otorisasi server-side: MANAGER melihat & mengelola seluruh Program Kerja,
  // ADMIN melihat & mengelola sesuai permission admin.
  await requireRole(['MANAGER', 'ADMIN']);

  const params = await searchParams;
  const yearParam = typeof params.year === 'string' ? Number(params.year) : NaN;
  const activeYear = Number.isFinite(yearParam) ? yearParam : 2026;

  const [programs, stats, years, chart] = await Promise.all([
    listProgramKerja({ year: Number.isFinite(yearParam) ? yearParam : undefined }),
    getProgramKerjaStats(Number.isFinite(yearParam) ? yearParam : undefined),
    getProgramKerjaYears(),
    getProgramKerjaAnnualChart(activeYear),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="DEPARTEMEN DISTRIBUSI GAS & MANAJEMEN ORF"
        title="Program Kerja 2026"
        description="Monitoring target tahunan — P = Plan, R = Realisasi. Data awal mengikuti dokumen Program Kerja Departemen Distribusi Gas dan Manajemen ORF Tahun 2026."
      />

      <ProgramKerjaClient programs={programs} stats={stats} years={years} chart={chart} />
    </div>
  );
}

