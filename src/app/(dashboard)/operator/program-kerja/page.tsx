import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { listProgramKerja } from '@/server/services/programKerjaService';
import { ProgramKerjaOperatorClient } from './ProgramKerjaOperatorClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function OperatorProgramKerjaPage() {
  const session = await requireAuth();
  const programs = await listProgramKerja({});

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="PROGRAM KERJA"
        title="Program Kerja"
        description="Seluruh program kerja Distribusi Gas & ORF — kategori, target, progress, deadline, status, checklist, catatan, dan evidence. Operator dapat melihat (read-only)."
      />
      <ProgramKerjaOperatorClient programs={programs} currentUserId={session.id} />
    </div>
  );
}
