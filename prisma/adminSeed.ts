import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Admin Account for PERTAMINA FIELDOPS ---');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fieldops.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  const adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID || 'FO-ADM-001';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Attempt to find default department if exists
  const defaultDept = await prisma.department.findFirst({
    where: { code: 'OPS' },
    select: { id: true },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      employeeId: adminEmployeeId,
      role: Role.ADMIN,
      position: 'System Administrator',
      isActive: true,
      passwordHash,
      departmentId: defaultDept?.id || undefined,
    },
    create: {
      email: adminEmail,
      name: adminName,
      employeeId: adminEmployeeId,
      role: Role.ADMIN,
      position: 'System Administrator',
      isActive: true,
      passwordHash,
      departmentId: defaultDept?.id || null,
    },
  });

  console.log(`✓ Admin account successfully upserted: [${adminUser.employeeId}] ${adminUser.email} (Role: ${adminUser.role}, Status: ${adminUser.isActive ? 'Active' : 'Inactive'})`);
}

main()
  .catch((e) => {
    console.error('Failed to seed admin account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
