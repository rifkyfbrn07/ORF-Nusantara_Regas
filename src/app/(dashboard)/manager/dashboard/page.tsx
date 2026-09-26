import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getManpowerStatusSummary } from '@/server/services/workStatusService';
import { getCurrentShiftCoverage } from '@/server/services/coverageService';
import { formatJakartaDate } from '@/lib/time';
import { HeroCommandCenter } from '@/components/dashboard/HeroCommandCenter';
import { WorkforceOverviewCard } from '@/components/dashboard/WorkforceOverviewCard';
import { OperationalPulseCard } from '@/components/dashboard/OperationalPulseCard';
import { FacilityStatusCard } from '@/components/dashboard/FacilityStatusCard';
import { TodayScheduleCard } from '@/components/dashboard/TodayScheduleCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { CurrentShiftCard } from '@/components/dashboard/CurrentShiftCard';
import { OperationalAlertsCard } from '@/components/dashboard/OperationalAlertsCard';
import { OperatorStatusTable } from '@/components/dashboard/OperatorStatusTable';

export default async function ManagerDashboardPage() {
  const manager = await requireRole(['MANAGER', 'ADMIN']);
  const todayStr = formatJakartaDate();

  const [manpowerSummary, currentShiftCoverage, userRoleCounts, todaySchedules] = await Promise.all([
    getManpowerStatusSummary(todayStr),
    getCurrentShiftCoverage(todayStr),
    prisma.user.groupBy({
      by: ['role'],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.schedule.findMany({
      where: { date: todayStr },
      select: { status: true, shift: { select: { code: true, name: true } } },
    }),
  ]);

  const { counts, operatorStatuses } = manpowerSummary;

  const roleMap = new Map(userRoleCounts.map((r) => [r.role, r._count._all]));
  const operatorCount = roleMap.get('OPERATOR') ?? 0;
  const managerCount = roleMap.get('MANAGER') ?? 0;
  const adminCount = roleMap.get('ADMIN') ?? 0;
  const totalActiveUsers = operatorCount + managerCount + adminCount;

  // Pembagian shift hari ini (data nyata dari table schedule).
  let pagiCount = 0;
  let malamCount = 0;
  let offCount = 0;
  for (const s of todaySchedules) {
    const code = (s.shift?.code || '').toLowerCase();
    const name = (s.shift?.name || '').toLowerCase();
    if (code.includes('pagi') || name.includes('pagi')) pagiCount += 1;
    else if (code.includes('malam') || name.includes('malam')) malamCount += 1;
    else offCount += 1;
  }

  // Operator yang status operasionalnya bukan OFF/ABSENT hari ini.
  const activeToday = operatorCount - counts.off - counts.absent;

  const serializableOperatorStatuses = operatorStatuses.map((os) => ({
    ...os,
    attendance: os.attendance
      ? {
          ...os.attendance,
          checkIn: os.attendance.checkIn ? os.attendance.checkIn.toISOString() : null,
          checkOut: os.attendance.checkOut ? os.attendance.checkOut.toISOString() : null,
        }
      : null,
  }));

  const dateLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full dashboard-enter">
      {/* 1. Hero Command Center Greeting */}
      <HeroCommandCenter
        userName={manager.name}
        facilityName="ORF Muara Karang"
        facilityStatus="OCC READY"
      />

      {/* 2. Primary Command Center Row 1 (Workforce Overview, Operational Pulse, Facility Status) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <WorkforceOverviewCard
          totalUsers={totalActiveUsers}
          operatorCount={operatorCount}
          managerCount={managerCount}
          adminCount={adminCount}
          activeUsers={activeToday}
          inactiveUsers={counts.off + counts.absent}
        />

        <OperationalPulseCard
          totalToday={counts.totalOperators}
          pagiCount={pagiCount}
          malamCount={malamCount}
          offCount={offCount}
        />

        <FacilityStatusCard
          facilityName="FSRU JAWA BARAT"
          vesselStatus="Operational"
          occStatus="READY"
          orfStatus="ACTIVE"
          detailsLink="/manager/workforce"
        />
      </div>

      {/* 3. Primary Command Center Row 2 (Today Schedule + Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 min-w-0">
          <TodayScheduleCard
            dateLabel={dateLabel}
            totalJadwal={counts.totalOperators}
            shiftPagi={pagiCount}
            shiftMalam={malamCount}
            offCount={offCount}
            viewAllHref="/manager/schedules"
          />
        </div>

        <div className="lg:col-span-4 min-w-0">
          <RecentActivityCard viewAllHref="/manager/audit-logs" />
        </div>
      </div>

      {/* 4. Operations Detail Section: Current Shift Progress & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 pt-2">
        <div className="md:col-span-1 lg:col-span-8 min-w-0">
          <CurrentShiftCard coverage={currentShiftCoverage} />
        </div>

        <div className="md:col-span-1 lg:col-span-4 min-w-0">
          <OperationalAlertsCard />
        </div>
      </div>

      {/* 5. Operator Status Table */}
      <div className="w-full">
        <OperatorStatusTable data={serializableOperatorStatuses} currentDate={todayStr} />
      </div>
    </div>
  );
}
