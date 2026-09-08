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
