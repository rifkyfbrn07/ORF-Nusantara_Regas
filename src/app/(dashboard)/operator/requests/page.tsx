import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { OperatorRequestsView } from './OperatorRequestsView';

export default async function OperatorRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sessionUser = await requireAuth();
  const { tab } = await searchParams;

  // Preserve old inbox links while keeping the request page focused on the
  // user's own leave and permission submissions.
  if (tab === 'approvals') redirect('/approval-inbox');

  return <OperatorRequestsView sessionUser={sessionUser} mode="requests" />;
}
