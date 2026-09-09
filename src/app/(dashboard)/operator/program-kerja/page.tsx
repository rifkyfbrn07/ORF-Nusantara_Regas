<<<<<<< HEAD
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { ProgramKerjaOperatorClient } from './ProgramKerjaOperatorClient';

export default async function OperatorProgramKerjaPage() {
  const user = await requireRole(['OPERATOR']);
  const programs = await prisma.programKerja.findMany({
    where: { picId: user.id },
    orderBy: [{ deadline: 'asc' }, { year: 'desc' }, { sequence: 'asc' }],
    include: { tasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
  });

  return <ProgramKerjaOperatorClient programs={programs} />;
}
=======
import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { listAssignedProgramKerja } from '@/server/services/programKerjaService';
import { ProgramKerjaOperatorClient } from './ProgramKerjaOperatorClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function OperatorProgramKerjaPage() {
  // Session server-side: operator hanya lihat program yang ditugaskan (PIC).
  const user = await requireAuth();

  const programs = await listAssignedProgramKerja(user.id);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="PROGRAM KERJA"
        title="Program Kerja"
        description="Program yang ditugaskan kepada Anda — target, plan, progres, deadline, dan checklist kerja. Target utama dikontrol oleh Admin/Manager."
      />

      <ProgramKerjaOperatorClient programs={programs} viewerId={user.id} />
    </div>
  );
}
>>>>>>> f728c28 (coba)
