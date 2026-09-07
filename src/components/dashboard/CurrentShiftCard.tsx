'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ShiftCoverageData } from '@/server/services/coverageService';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface CurrentShiftCardProps {
  coverage?: ShiftCoverageData | null;
}

export function CurrentShiftCard({ coverage }: CurrentShiftCardProps) {
  const shifts = [
    {
      name: 'Pagi',
      time: '06:00 - 14:00',
      percent: coverage?.coveragePercentage || 92,
      operatorCount: '11/12',
      status: 'On Track',
      color: '#1769AA',
      operators: ['Andi Pratama', 'Budi Santoso', 'Cahyo Wibowo'],
    },
    {
      name: 'Siang',
      time: '14:00 - 22:00',
      percent: 88,
      operatorCount: '10/12',
      status: 'On Track',
      color: '#1769AA',
      operators: ['Dedi Kurniawan', 'Eko Prasetyo', 'Fajar Nugraha'],
    },
    {
      name: 'Malam',
      time: '22:00 - 06:00',
      percent: 94,
      operatorCount: '12/13',
      status: 'On Track',
      color: '#1769AA',
      operators: ['Gilang Ramadhan', 'Hadi Sucipto', 'Indra Gunawan'],
    },
  ];

  const radius = 18;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-full min-h-[250px] max-h-[290px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
        <h3 className="text-xs sm:text-sm font-bold text-[#0B3568]">
          Shift Hari Ini
        </h3>
        <span className="text-[10px] font-semibold text-emerald-600">
          ● 3 Shift Operasional
        </span>
      </div>

      {/* 3 Shift Cards in Row */}
      <div className="grid grid-cols-3 gap-2 my-auto py-1">
        {shifts.map((shift, idx) => {
          const strokeDashoffset = circumference - (shift.percent / 100) * circumference;

          return (
            <div
              key={idx}
              className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-xl flex flex-col justify-between hover:bg-slate-50 transition-all select-none"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0B3568] leading-tight">{shift.name}</h4>
                  <p className="text-[8.5px] text-slate-400 font-mono mt-0.5">{shift.time}</p>
                </div>
                <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />
              </div>

              {/* Circular Progress Ring */}
              <div className="my-1.5 flex items-center justify-center">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                    <circle
                      cx="25"
                      cy="25"
                      r={radius}
                      stroke="#E2E8F0"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="25"
                      cy="25"
                      r={radius}
                      stroke={shift.color}
                      strokeWidth="4"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black text-[#0B3568]">
                    {shift.percent}%
                  </span>
                </div>
              </div>

              {/* Operators Avatars + On Track Badge */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[9px]">
                <div className="flex items-center">
                  <div className="flex -space-x-1 overflow-hidden">
                    {shift.operators.slice(0, 2).map((op, opIdx) => (
                      <UserAvatar key={opIdx} name={op} size={16} className="ring-1 ring-white" />
                    ))}
                  </div>
                  <span className="text-slate-500 font-semibold text-[9px] ml-1">{shift.operatorCount}</span>
                </div>

                <div className="flex items-center gap-0.5 text-emerald-600 font-bold text-[8.5px]">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  <span>On Track</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
