import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@fieldops.local' },
    update: { employeeId: 'FO-ADM-001', name: 'FIELDOPS Administrator', passwordHash, role: Role.ADMIN, position: 'System Administrator', isActive: true },
    create: { employeeId: 'FO-ADM-001', name: 'FIELDOPS Administrator', email: 'admin@fieldops.local', passwordHash, role: Role.ADMIN, position: 'System Administrator', isActive: true },
  });
}

main().finally(() => prisma.$disconnect());
