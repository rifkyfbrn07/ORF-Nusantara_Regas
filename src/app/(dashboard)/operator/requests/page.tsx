import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import {
  getOperatorLeaveRequests,
  getLeaveEntitlement,
  getPendingLeaveApprovalsForUser,
} from '@/server/services/leaveService';
import { formatJakartaDate } from '@/lib/time';
import { OperatorRequestsClient } from './OperatorRequestsClient';
import { prisma } from '@/lib/db/prisma';

export default async function OperatorRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sessionUser = await requireAuth();
  const resolvedParams = await searchParams;
  const today = formatJakartaDate();
  const defaultTab = resolvedParams.tab === 'approvals' ? 'approvals' : 'mine';

  const [requests, dbUser, entitlement] = await Promise.all([
    getOperatorLeaveRequests(sessionUser.id),
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        name: true,
        employeeId: true,
        position: true,
        phone: true,
        team: true,
        department: { select: { name: true } },
      },
    }),
    getLeaveEntitlement(sessionUser.id, today),
  ]);

  const pendingApprovals = await getPendingLeaveApprovalsForUser(sessionUser.id);

  const currentUser = {
    name: dbUser?.name || sessionUser.name,
    employeeId: dbUser?.employeeId || sessionUser.employeeId,
    position: dbUser?.position || sessionUser.position || 'Penunjang Pengoperasian ORF',
    department: dbUser?.department?.name || 'Operasi',
    phone: dbUser?.phone || '',
    team: dbUser?.team || null,
    role: sessionUser.role,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-[#0B1E32] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Work Request &amp; Official Leave Document
        </span>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
          Pengajuan Cuti, Izin &amp; Sakit
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Formulir Permohonan Cuti resmi diterbitkan secara otomatis sesuai template resmi PT Permata Karya Jasa (.docx) dan mengikuti alur persetujuan berurutan: Reviewer → Team Lead → Manager.
        </p>
      </div>

      <OperatorRequestsClient
        initialRequests={requests}
        today={today}
        currentUser={currentUser}
        entitlement={entitlement}
        pendingApprovals={pendingApprovals}
        defaultTab={defaultTab}
      />
    </div>
  );
}
