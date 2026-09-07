import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getOperatorHandovers } from '@/server/services/handoverService';
import { formatJakartaDate } from '@/lib/time';
import { OperatorHandoverClient } from './OperatorHandoverClient';

export default async function OperatorHandoverPage() {
  const user = await requireAuth();
  const today = formatJakartaDate();

  const [handovers, shifts, peerOperators] = await Promise.all([
    getOperatorHandovers(user.id),
    prisma.shift.findMany({ where: { isActive: true } }),
    prisma.user.findMany({
      where: { role: 'OPERATOR', isActive: true, id: { not: user.id } },
      select: { id: true, name: true, employeeId: true, position: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Digital Shift Logbook & Handover
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Serah Terima Shift (Handover)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tulis log pergantian shift untuk operator berikutnya dan konfirmasi penerimaan operasional (Acknowledge)
        </p>
      </div>

      <OperatorHandoverClient
        initialHandovers={handovers}
        shifts={shifts}
        peerOperators={peerOperators}
        today={today}
        currentUserId={user.id}
      />
    </div>
  );
}
