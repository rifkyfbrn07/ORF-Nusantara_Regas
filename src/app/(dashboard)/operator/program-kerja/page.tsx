import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { listAssignedProgramKerja } from '@/server/services/programKerjaService';
import { ProgramKerjaOperatorClient } from './ProgramKerjaOperatorClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function OperatorProgramKerjaPage() {
  const user = await requireAuth();
  const programs = await listAssignedProgramKerja(user.id);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="PROGRAM KERJA SAYA"
        title="Program Kerja Saya"
        description="Program yang ditugaskan kepada Anda — kategori, target, progress, deadline, PIC, status, checklist, catatan, dan waktu pembaruan."
      />
      <ProgramKerjaOperatorClient programs={programs} viewerId={user.id} />
    </div>
  );
}
