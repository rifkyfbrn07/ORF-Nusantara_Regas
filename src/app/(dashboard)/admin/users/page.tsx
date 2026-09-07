import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import UsersClient from './UsersClient';

export default async function AdminUsersPage() {
  await requireAdmin();
  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        position: true,
        phone: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        departmentId: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return <UsersClient users={users} departments={departments} />;
}
