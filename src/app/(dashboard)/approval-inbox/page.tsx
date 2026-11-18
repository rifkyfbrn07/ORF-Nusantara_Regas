import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { hasApprovalInboxScope } from '@/server/services/leaveService';
import { OperatorRequestsView } from '../operator/requests/OperatorRequestsView';
import { ManagerShiftApprovalInbox } from './ManagerShiftApprovalInbox';

export default async function ApprovalInboxPage() {
  const user = await requireAuth();
  if (user.role === 'ADMIN') notFound();
  if (user.role !== 'MANAGER' && !(await hasApprovalInboxScope(user.id))) notFound();

  return (
    <div className="space-y-8">
      <OperatorRequestsView sessionUser={user} mode="inbox" />
      {user.role === 'MANAGER' && <ManagerShiftApprovalInbox />}
    </div>
  );
}
