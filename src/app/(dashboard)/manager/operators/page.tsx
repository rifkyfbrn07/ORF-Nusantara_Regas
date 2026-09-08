import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getAllOperators } from '@/server/services/operatorService';
import { OperatorsManagerClient } from './OperatorsManagerClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerOperatorsPage() {
  await requireRole(['MANAGER', 'ADMIN']);

  const [operators, departments] = await Promise.all([
    getAllOperators(),
    prisma.department.findMany(),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="WORKFORCE MASTER ROSTER"
        title="Operator Roster"
        description="Kelola data induk personil ORF Muara Karang, akun operasional, penugasan departemen, dan pantau status presensi harian."
      />

      <OperatorsManagerClient
        initialOperators={operators}
        departments={departments}
      />
    </div>
  );
}
