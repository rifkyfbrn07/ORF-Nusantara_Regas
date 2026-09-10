import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getOperatorShiftExchanges, getMyOffCalendar } from '@/server/services/shiftExchangeService';
import { OperatorShiftExchangeClient } from './OperatorShiftExchangeClient';

export default async function OperatorShiftExchangePage() {
  const user = await requireAuth();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [exchanges, myCalendar] = await Promise.all([
    getOperatorShiftExchanges(user.id),
    getMyOffCalendar(user.id, year, month),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Tukar Hari OFF — Antar Operator
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Tukar Hari OFF
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pertukaran hari OFF dengan rekan operator: OFF ditukar dengan OFF — setiap operator tetap mendapat jatah OFF.
        </p>
      </div>

      <OperatorShiftExchangeClient
        initialExchanges={exchanges}
        initialCalendar={myCalendar}
        currentUserId={user.id}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
