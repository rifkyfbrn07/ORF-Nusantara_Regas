import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getOperatorHSSEChecklists, DEFAULT_HSSE_CHECKLIST_TEMPLATE } from '@/server/services/hsseService';
import { formatJakartaDate } from '@/lib/time';
import { OperatorHSSEClient } from './OperatorHSSEClient';

export default async function OperatorHSSEPage() {
  const user = await requireAuth();
  const today = formatJakartaDate();

  const [checklists, shifts, locations] = await Promise.all([
    getOperatorHSSEChecklists(user.id),
    prisma.shift.findMany({ where: { isActive: true } }),
    prisma.location.findMany(),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          HSSE Pre-Shift Safety Protocol
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Checklist Keselamatan Kerja (HSSE)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pastikan seluruh parameter APD, validitas izin SIKA, kesiapan alat proteksi kebakaran, dan briefing keselamatan telah terpenuhi sebelum bertugas
        </p>
      </div>

      <OperatorHSSEClient
        initialChecklists={checklists}
        shifts={shifts}
        locations={locations}
        template={DEFAULT_HSSE_CHECKLIST_TEMPLATE}
        today={today}
      />
    </div>
  );
}
