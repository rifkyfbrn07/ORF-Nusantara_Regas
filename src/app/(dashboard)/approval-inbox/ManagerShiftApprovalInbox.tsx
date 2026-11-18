import { getPendingShiftExchangeApprovals } from '@/server/services/shiftExchangeService';
import { ManagerRequestsClient } from '../manager/requests/ManagerRequestsClient';
import { PageHeader } from '@/components/ui/PageHeader';

export async function ManagerShiftApprovalInbox() {
  const shiftExchanges = await getPendingShiftExchangeApprovals();

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="SHIFT EXCHANGE APPROVAL"
        title="Persetujuan Pergantian Shift"
        description="Permohonan yang sudah dikonfirmasi operator tujuan dan menunggu keputusan Manager."
      />
      <ManagerRequestsClient
        leaveRequests={[]}
        shiftExchanges={shiftExchanges}
        defaultTab="shift"
        onlyTab="shift"
        currentUserRole="MANAGER"
      />
    </section>
  );
}
