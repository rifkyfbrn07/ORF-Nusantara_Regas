import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nurman = await prisma.user.findFirst({
    where: { name: { contains: 'Nurman', mode: 'insensitive' } },
    include: { department: true }
  });
  if (!nurman) {
    console.log('Nurman not found');
    return;
  }
  console.log('User Nurman:', {
    id: nurman.id,
    name: nurman.name,
    employeeId: nurman.employeeId,
    position: nurman.position,
    phone: nurman.phone,
    department: nurman.department?.name,
  });

  const scheds = await prisma.schedule.findMany({
    where: { userId: nurman.id, date: { startsWith: '2026-09' } },
    include: { shift: true },
    orderBy: { date: 'asc' }
  });
  console.log('September 2026 schedules count:', scheds.length);
  for (const s of scheds) {
    console.log(s.date + ': status=' + s.status + ' | shift=' + s.shift?.name + ' (' + s.shift?.code + ') | notes=' + (s.notes || '-'));
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: nurman.id },
    include: { reviewedBy: true }
  });
  console.log('Nurman leaves count:', leaves.length);
  for (const l of leaves) {
    console.log('Leave:', l.id, l.type, l.startDate, 'to', l.endDate, l.status, 'rev:', l.reviewedBy?.name);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
