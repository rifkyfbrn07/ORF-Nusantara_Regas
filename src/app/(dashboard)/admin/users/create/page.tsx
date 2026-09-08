import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import CreateUserForm from './CreateUserForm';

export const metadata = {
  title: 'Tambah Pengguna Baru | Distribusi Gas & ORF Admin',
  description: 'Form pendaftaran akun personil baru sistem Distribusi Gas & ORF',
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
