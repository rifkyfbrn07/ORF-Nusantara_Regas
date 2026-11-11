import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getLeaveRequestsVisibleToUser } from '@/server/services/leaveService';
import { getAllShiftExchanges } from '@/server/services/shiftExchangeService';
import { ManagerRequestsClient } from './ManagerRequestsClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sessionUser = await requireRole(['MANAGER', 'ADMIN']);
  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || 'leave';

  const [leaveRequests, shiftExchanges] = await Promise.all([
    getLeaveRequestsVisibleToUser(sessionUser.id, sessionUser.role),
    getAllShiftExchanges(),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="WORK REQUEST & APPROVAL CENTER"
        title="Persetujuan Cuti & Izin"
        description="Tinjau pengajuan cuti resmi, izin kedinasan, surat sakit dokter, dan verifikasi pergantian shift antar operator. Approval cuti berjalan berurutan: Reviewer → Team Lead → Manager."
      />

      <ManagerRequestsClient
        leaveRequests={leaveRequests}
        shiftExchanges={shiftExchanges}
        defaultTab={activeTab === 'shift' ? 'shift' : 'leave'}
        currentUserRole={sessionUser.role}
      />
    </div>
  );
}
