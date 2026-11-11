import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import UsersClient from './UsersClient';

export default async function AdminUsersPage() {
  await requireAdmin();
  const [users, departments, teamConfigs] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        team: true,
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
    prisma.teamConfig.findMany({
      select: {
        code: true,
        name: true,
        reviewerId: true,
        teamLeadId: true,
        managerId: true,
      },
      orderBy: { code: 'asc' },
    }),
  ]);

  return <UsersClient users={users} departments={departments} teamConfigs={teamConfigs} />;
}
