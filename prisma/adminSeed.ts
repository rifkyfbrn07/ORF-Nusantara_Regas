import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Admin Account for Distribusi Gas & ORF ---');

  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  const adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID || 'FO-ADM-001';

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD must be configured when running the admin seed.');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const defaultDept = await prisma.department.findFirst({ where: { code: 'OPS' }, select: { id: true } });

  const adminUser = await prisma.user.upsert({
    where: { employeeId: adminEmployeeId },
    update: {
      username: adminUsername,
      name: adminName,
      email: adminEmail,
      role: Role.ADMIN,
      position: 'System Administrator',
      isActive: true,
      passwordHash,
      departmentId: defaultDept?.id || null,
    },
    create: {
      username: adminUsername,
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

  console.log(`✓ Admin account successfully upserted: [@${adminUser.username}] ${adminUser.name} (Role: ${adminUser.role}, Status: ${adminUser.isActive ? 'Active' : 'Inactive'})`);
}

main()
  .catch((error) => {
    console.error('Failed to seed admin account:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
