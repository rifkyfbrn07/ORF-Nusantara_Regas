import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';

export default async function ManagerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole(['MANAGER', 'ADMIN']);
  const { tab } = await searchParams;
  if (tab === 'shift') redirect('/manager/shift-exchange');
  redirect('/operator/requests');
}
