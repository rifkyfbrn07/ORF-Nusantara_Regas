import React from 'react';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getAllOperators, getOperatorTeamScope } from '@/server/services/operatorService';
import { OperatorsManagerClient } from './OperatorsManagerClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerOperatorsPage() {
  const currentUser = await requireAuth();
  const canManage = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';
  const teamCodes = canManage ? undefined : await getOperatorTeamScope(currentUser.id);
  if (!canManage && !teamCodes?.length) notFound();

  const [operators, departments] = await Promise.all([
    getAllOperators({ ...(teamCodes ? { teamCodes } : {}) }),
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
        canManage={canManage}
      />
    </div>
  );
}
