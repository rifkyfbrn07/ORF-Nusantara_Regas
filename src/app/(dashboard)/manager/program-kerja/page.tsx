import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  listProgramKerja,
  getProgramKerjaStats,
  getProgramKerjaYears,
} from '@/server/services/programKerjaService';
import { ProgramKerjaClient } from './ProgramKerjaClient';
import { PageHeader } from '@/components/ui/PageHeader';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagerProgramKerjaPage({ searchParams }: PageProps) {
  await requireRole(['MANAGER', 'ADMIN']);

  const params = await searchParams;
  const yearParam = typeof params.year === 'string' ? Number(params.year) : NaN;

  const [programs, stats, years, picUsers] = await Promise.all([
    listProgramKerja({ year: Number.isFinite(yearParam) ? yearParam : undefined }),
    getProgramKerjaStats(Number.isFinite(yearParam) ? yearParam : undefined),
    getProgramKerjaYears(),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, username: true, position: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="DEPARTEMEN DISTRIBUSI GAS & MANAJEMEN ORF"
        title="Program Kerja 2026"
        description="Monitoring target tahunan — P = Plan, R = Realisasi. Data awal mengikuti dokumen Program Kerja Departemen Distribusi Gas dan Manajemen ORF Tahun 2026."
      />

      <ProgramKerjaClient
        programs={programs}
        stats={stats}
        years={years}
        picUsers={picUsers.map((u) => ({ id: u.id, name: u.name, username: u.username, position: u.position }))}
      />
    </div>
  );
}
