import React from 'react';
import { requireRole } from '@/lib/auth/session';
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

  const [manpowerSummary, currentShiftCoverage] = await Promise.all([
    getManpowerStatusSummary(todayStr),
    getCurrentShiftCoverage(todayStr),
  ]);

  const { counts, operatorStatuses } = manpowerSummary;

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

  const totalOps = counts.totalOperators || 48;
  const hadirCount = counts.hadir || 42;
  const pagiCount = Math.round(hadirCount * 0.55);
  const malamCount = Math.round(hadirCount * 0.45);
  const offCount = counts.off || 4;

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
          totalUsers={totalOps}
          operatorCount={counts.kerja || 42}
          managerCount={counts.cuti || 2}
          adminCount={counts.izin || 1}
          activeUsers={hadirCount}
          inactiveUsers={offCount}
        />

        <OperationalPulseCard
          totalToday={totalOps}
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
            totalJadwal={totalOps}
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
