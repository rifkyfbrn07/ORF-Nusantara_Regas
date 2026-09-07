import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import CreateUserForm from './CreateUserForm';

export const metadata = {
  title: 'Tambah Pengguna Baru | REGAS FIELDOPS Admin',
  description: 'Form pendaftaran akun personil baru sistem REGAS FIELDOPS',
};

export default async function CreateUserPage() {
  await requireAdmin();

  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return <CreateUserForm departments={departments} />;
}
