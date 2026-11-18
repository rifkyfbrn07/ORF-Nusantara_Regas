import { getLeaveRequestsVisibleToUser } from '@/server/services/leaveService';
import { getAllShiftExchanges } from '@/server/services/shiftExchangeService';
import { ManagerRequestsClient } from './ManagerRequestsClient';
import type { SessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/PageHeader';

export async function ManagerRequestsView({
  user,
  section,
}: {
  user: SessionUser;
  section: 'leave' | 'shift';
}) {
  const [leaveRequests, shiftExchanges] = await Promise.all([
    section === 'leave' ? getLeaveRequestsVisibleToUser(user.id, user.role) : Promise.resolve([]),
    section === 'shift' ? getAllShiftExchanges() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow={section === 'leave' ? 'WORK REQUEST MANAGEMENT' : 'SHIFT EXCHANGE MANAGEMENT'}
        title={section === 'leave' ? 'Cuti & Izin' : 'Pergantian Shift'}
        description={section === 'leave'
          ? 'Pengelolaan pengajuan cuti, izin, dan sakit operator.'
          : 'Tinjau permohonan tukar hari OFF antar operator sesuai kewenangan.'}
      />
      <ManagerRequestsClient
        leaveRequests={leaveRequests}
        shiftExchanges={shiftExchanges}
        defaultTab={section}
        onlyTab={section}
        currentUserRole={user.role}
      />
    </div>
  );
}
