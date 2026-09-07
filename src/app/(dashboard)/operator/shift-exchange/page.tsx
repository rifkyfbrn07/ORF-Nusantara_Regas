import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getOperatorShiftExchanges } from '@/server/services/shiftExchangeService';
import { getOperatorSchedules } from '@/server/services/scheduleService';
import { formatJakartaDate } from '@/lib/time';
import { OperatorShiftExchangeClient } from './OperatorShiftExchangeClient';

export default async function OperatorShiftExchangePage() {
  const user = await requireAuth();
  const today = formatJakartaDate();

  const [exchanges, mySchedules, peerOperators] = await Promise.all([
    getOperatorShiftExchanges(user.id),
    getOperatorSchedules(user.id, today, 14),
    prisma.user.findMany({
      where: {
        role: 'OPERATOR',
        isActive: true,
        id: { not: user.id },
      },
      select: { id: true, name: true, employeeId: true, position: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Peer Shift Swap Request
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Permohonan Pergantian Shift
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ajukan permohonan pertukaran giliran shift kerja dengan rekan sesama operator lapangan
        </p>
      </div>

      <OperatorShiftExchangeClient
        initialExchanges={exchanges}
        mySchedules={mySchedules}
        peerOperators={peerOperators}
        today={today}
      />
    </div>
  );
}
