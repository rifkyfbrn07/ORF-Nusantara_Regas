import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      position: true,
      employeeId: true,
      departmentId: true,
      isActive: true,
    },
  });
  console.log('TOTAL', users.length);
  const byRole: Record<string, number> = {};
  for (const u of users) {
    byRole[u.role] = (byRole[u.role] || 0) + 1;
  }
  console.log(JSON.stringify(byRole));
  console.log('--- NON-OPERATOR USERS ---');
  for (const u of users.filter((x) => x.role !== 'OPERATOR')) {
    console.log(u.role, '|', u.name, '|', u.position, '|', u.employeeId, '| active=' + u.isActive);
  }
  console.log('--- DEPARTMENTS ---');
  const depts = await prisma.department.findMany();
  console.log(JSON.stringify(depts));
  console.log('--- SHIFTS ---');
  const shifts = await prisma.shift.findMany();
  console.log(JSON.stringify(shifts.map((s) => ({ code: s.code, name: s.name, start: s.startTime, end: s.endTime }))));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
