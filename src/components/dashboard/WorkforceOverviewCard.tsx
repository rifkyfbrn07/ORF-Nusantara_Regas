'use client';

import React, { useState } from 'react';
import { Users, UserCheck, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface WorkforceOverviewCardProps {
  totalUsers: number;
  operatorCount: number;
  managerCount: number;
  adminCount: number;
  activeUsers: number;
  inactiveUsers: number;
}

export function WorkforceOverviewCard({
  totalUsers,
  operatorCount,
  managerCount,
  adminCount,
  activeUsers,
  inactiveUsers,
}: WorkforceOverviewCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = Math.max(totalUsers, operatorCount + managerCount + adminCount, 1);

  const operatorPercent = total > 0 ? ((operatorCount / total) * 100).toFixed(1) : '0.0';
  const managerPercent = total > 0 ? ((managerCount / total) * 100).toFixed(1) : '0.0';
  const adminPercent = total > 0 ? ((adminCount / total) * 100).toFixed(1) : '0.0';

  const categories = [
    { label: 'Operator', count: operatorCount, percent: operatorPercent, color: '#42A5F5' },
    { label: 'Manager', count: managerCount, percent: managerPercent, color: '#69BE28' },
    { label: 'Admin', count: adminCount, percent: adminPercent, color: '#EF4652' },
  ];

  // SVG Donut calculations
  const radius = 48;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = categories.map((cat, idx) => {
    const rawPercent = (Number(cat.percent) || 0) / 100;
    const strokeDasharray = `${rawPercent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += rawPercent;

    return {
      ...cat,
      index: idx,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="card-command-center p-5 flex flex-col justify-between h-full min-h-[300px]">
      {/* 1. Header */}
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
          <Users className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider leading-tight">
            WORKFORCE OVERVIEW
          </h3>
          <p className="text-[11px] text-[#64748B] dark:text-[#AFC4D6] font-medium mt-0.5">
            Total tenaga kerja operasional
          </p>
        </div>
      </div>

      {/* 2. Middle: Donut on Left + Breakdown Legend on Right */}
      <div className="flex items-center justify-between gap-4 my-auto py-2">
        {/* SVG Donut Chart */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              className="text-[#E2E8F0] dark:text-[rgba(120,190,235,0.14)]"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Slices */}
            {slices.map((slice) => (
              <circle
                key={slice.index}
                cx="60"
                cy="60"
                r={radius}
                stroke={slice.color}
                strokeWidth={hoveredIndex === slice.index ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
          </svg>

          {/* Donut Center Count */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-black text-[#0B3568] dark:text-[#F8FBFF] leading-none">
              {totalUsers}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#AFC4D6] mt-0.5">
              TOTAL USER
            </span>
            <Users className="h-3 w-3 text-[#0077C8] dark:text-[#45B5F4] mt-0.5" />
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="flex-1 space-y-2 min-w-0">
          {categories.map((item, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={clsx(
                'flex items-center justify-between text-xs py-1 px-2 rounded-lg transition-colors cursor-pointer',
                hoveredIndex === idx ? 'bg-[#F4F9FC] dark:bg-[#143653]' : ''
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-bold text-[#0B3568] dark:text-[#F5FAFF] text-xs">
                  {item.count}
                </span>
                <span className="font-medium text-[#64748B] dark:text-[#C5D7E7] truncate text-xs">
                  {item.label}
                </span>
              </div>

              <span className="text-[11px] font-mono font-bold text-[#123D70] dark:text-[#AFC4D6] shrink-0">
                {item.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bottom Mini Stat Cards (Active vs Inactive) */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)]">
        {/* Active Users */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
          <div className="h-7 w-7 rounded-lg bg-[#22A65A]/15 dark:bg-[#69BE28]/15 text-[#22A65A] dark:text-[#69BE28] flex items-center justify-center shrink-0">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#0B3568] dark:text-[#F8FBFF] leading-tight">
                {activeUsers}
              </span>
              <span className="text-[11px] font-bold text-[#123D70] dark:text-[#C5D7E7]">
                Active User
              </span>
            </div>
            <p className="text-[9px] text-[#22A65A] dark:text-[#69BE28] font-semibold">Status operasional</p>
          </div>
        </div>

        {/* Inactive Users */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
          <div className="h-7 w-7 rounded-lg bg-[#64748B]/15 text-[#64748B] dark:text-[#8EA7BD] flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#0B3568] dark:text-[#F8FBFF] leading-tight">
                {inactiveUsers}
              </span>
              <span className="text-[11px] font-bold text-[#123D70] dark:text-[#C5D7E7]">
                Inactive User
              </span>
            </div>
            <p className="text-[9px] text-[#64748B] dark:text-[#8EA7BD] font-semibold">Non-aktif / off</p>
          </div>
        </div>
      </div>
    </div>
  );
}
