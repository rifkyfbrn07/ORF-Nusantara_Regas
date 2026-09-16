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
      color: '#0077C8',
      operators: ['Andi Pratama', 'Budi Santoso', 'Cahyo Wibowo'],
    },
    {
      name: 'Siang',
      time: '14:00 - 22:00',
      percent: 88,
      operatorCount: '10/12',
      status: 'On Track',
      color: '#0077C8',
      operators: ['Dedi Kurniawan', 'Eko Prasetyo', 'Fajar Nugraha'],
    },
    {
      name: 'Malam',
      time: '22:00 - 06:00',
      percent: 94,
      operatorCount: '12/13',
      status: 'On Track',
      color: '#0077C8',
      operators: ['Gilang Ramadhan', 'Hadi Sucipto', 'Indra Gunawan'],
    },
  ];

  const radius = 18;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="card-command-center p-5 flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] shrink-0">
        <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider">
          Shift Hari Ini
        </h3>
        <span className="text-[10.5px] font-extrabold text-[#22A65A] dark:text-[#4ADE80] flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] shadow-[0_0_6px_#22A65A] animate-pulse-subtle" />
          3 Shift Operasional
        </span>
      </div>

      {/* 3 Shift Cards in Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-auto py-2">
        {shifts.map((shift, idx) => {
          const strokeDashoffset = circumference - (shift.percent / 100) * circumference;

          return (
            <div
              key={idx}
              className="p-3 bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)] rounded-xl flex flex-col justify-between hover:border-[#0077C8] dark:hover:border-[#38BDF8] transition-all select-none"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#0B3568] dark:text-[#F5FAFF] leading-tight">{shift.name}</h4>
                  <p className="text-[9px] text-[#64748B] dark:text-[#8FA8BF] font-mono mt-0.5">{shift.time}</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#64748B] dark:text-[#8FA8BF] shrink-0" />
              </div>

              {/* Circular Progress Ring */}
              <div className="my-2 flex items-center justify-center">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                    <circle
                      cx="25"
                      cy="25"
                      r={radius}
                      stroke="currentColor"
                      className="text-[#E2E8F0] dark:text-[rgba(120,190,235,0.12)]"
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
                  <span className="absolute text-xs font-black text-[#0B3568] dark:text-[#F5FAFF]">
                    {shift.percent}%
                  </span>
                </div>
              </div>

              {/* Operators Avatars + On Track Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)] text-[9.5px]">
                <div className="flex items-center">
                  <div className="flex -space-x-1 overflow-hidden">
                    {shift.operators.slice(0, 2).map((op, opIdx) => (
                      <UserAvatar key={opIdx} name={op} size={18} className="ring-1 ring-white dark:ring-slate-800" />
                    ))}
                  </div>
                  <span className="text-[#123D70] dark:text-[#C8D8E8] font-bold text-[9.5px] ml-1.5">{shift.operatorCount}</span>
                </div>

                <div className="flex items-center gap-1 text-[#22A65A] dark:text-[#4ADE80] font-bold text-[9px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A]" />
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
