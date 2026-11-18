import { requireRole } from '@/lib/auth/session';
import { ManagerRequestsView } from '../requests/ManagerRequestsView';

export default async function ManagerShiftExchangePage() {
  const user = await requireRole(['MANAGER', 'ADMIN']);
  return <ManagerRequestsView user={user} section="shift" />;
}
