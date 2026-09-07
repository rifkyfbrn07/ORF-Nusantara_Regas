import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getOperatorLeaveRequests } from '@/server/services/leaveService';
import { formatJakartaDate } from '@/lib/time';
import { OperatorRequestsClient } from './OperatorRequestsClient';

export default async function OperatorRequestsPage() {
  const user = await requireAuth();
  const today = formatJakartaDate();
  const requests = await getOperatorLeaveRequests(user.id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Work Request & Leave Submission
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Pengajuan Cuti, Izin & Sakit
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ajukan permohonan cuti tahunan, izin dispensasi kedinasan, atau pemberitahuan sakit untuk persetujuan Manager
        </p>
      </div>

      <OperatorRequestsClient initialRequests={requests} today={today} />
    </div>
  );
}
