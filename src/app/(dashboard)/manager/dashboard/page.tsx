import React from 'react';
import Image from 'next/image';
import { requireRole } from '@/lib/auth/session';
import { getManpowerStatusSummary } from '@/server/services/workStatusService';
import { getCurrentShiftCoverage } from '@/server/services/coverageService';
import { formatJakartaDate } from '@/lib/time';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { DonutChartCard } from '@/components/dashboard/DonutChartCard';
import { CurrentShiftCard } from '@/components/dashboard/CurrentShiftCard';
import { OperationalAlertsCard } from '@/components/dashboard/OperationalAlertsCard';
import { ActivityFeedCard } from '@/components/dashboard/ActivityFeedCard';
import { OperatorStatusTable } from '@/components/dashboard/OperatorStatusTable';
import {
  MapPin,
  Clock,
  Activity,
} from 'lucide-react';

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

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto w-full">
      {/* 1. Hero Greeting Section from Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B3568] tracking-tight">
            Selamat Pagi, {manager.name} 👋
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">
            Operational workforce overview untuk ORF Muara Karang.
          </p>
        </div>

        {/* Right 3-Segment Operational Summary Card */}
        <div className="relative overflow-hidden bg-[#F8FAFC] border border-slate-200/80 rounded-lg p-2 px-3 shrink-0">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none">
            <Image
              src="/Background.svg"
              alt="Terminal LNG Distribusi Gas & ORF"
              fill
              className="object-cover object-right"
            />
          </div>

          <div className="relative z-10 flex items-center divide-x divide-slate-200 text-xs gap-2 sm:gap-3">
            <div className="pr-2 sm:pr-3">
              <div className="flex items-center gap-1 text-[#0B3568] font-bold">
                <MapPin className="w-3 h-3 text-[#1769AA]" />
                <span className="truncate text-[10.5px]">ORF Muara Karang</span>
              </div>
              <p className="text-[9px] text-slate-400">Lokasi Operasional</p>
            </div>

            <div className="px-2 sm:px-3">
              <div className="flex items-center gap-1 text-[#0B3568] font-bold">
                <Clock className="w-3 h-3 text-[#1769AA]" />
                <span className="truncate text-[10.5px]">Shift Pagi</span>
              </div>
              <p className="text-[9px] text-slate-400">06:00 - 14:00</p>
            </div>

            <div className="pl-2 sm:pl-3">
              <div className="flex items-center gap-1 text-emerald-600 font-bold">
                <Activity className="w-3 h-3 text-emerald-500" />
                <span className="truncate text-[10.5px]">Operational</span>
              </div>
              <p className="text-[9px] text-slate-400">Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Compact KPI Section: Strip of 8 Metrics (~96px height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-2 sm:gap-3">
        {/* Total Operator (Navy Card) */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-3">
          <KpiCard
            label="TOTAL OPERATOR"
            value={counts.totalOperators || 48}
            iconName="users"
            variant="total"
            index={0}
          />
        </div>

        {/* Hadir */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-2">
          <KpiCard
            label="HADIR"
            value={counts.hadir || 42}
            percent="87.5%"
            iconName="checkCircle"
            variant="hadir"
            index={1}
          />
        </div>

        {/* Terlambat */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-2">
          <KpiCard
            label="TERLAMBAT"
            value={counts.terlambat || 3}
            percent="6.3%"
            iconName="alertOctagon"
            variant="terlambat"
            index={2}
          />
        </div>

        {/* Belum Absen */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <KpiCard
            label="BELUM ABSEN"
            value={counts.belumAbsen || 2}
            percent="4.2%"
            iconName="clockAlert"
            variant="belumAbsen"
            index={3}
          />
        </div>

        {/* 4 Mini KPI Cards (Cuti, Izin, Sakit, Off) */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-3 grid grid-cols-4 gap-1.5">
          <KpiCard
            label="CUTI"
            value={counts.cuti || 2}
            iconName="calendarOff"
            variant="mini"
            miniType="cuti"
            index={4}
          />
          <KpiCard
            label="IZIN"
            value={counts.izin || 1}
            iconName="fileCheck"
            variant="mini"
            miniType="izin"
            index={5}
          />
          <KpiCard
            label="SAKIT"
            value={counts.sakit || 1}
            iconName="heartPulse"
            variant="mini"
            miniType="sakit"
            index={6}
          />
          <KpiCard
            label="OFF"
            value={counts.off || 0}
            iconName="coffee"
            variant="mini"
            miniType="off"
            index={7}
          />
        </div>
      </div>

      {/* 3. Main Dashboard Row 1: 3 Balanced Cards (Donut Chart + Shift Hari Ini + Alerts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Status Tenaga Kerja Hari Ini (Donut Chart) */}
        <div className="md:col-span-1 lg:col-span-4 min-w-0">
          <DonutChartCard counts={counts} />
        </div>

        {/* Shift Hari Ini (3 Circular Progress Rings) */}
        <div className="md:col-span-1 lg:col-span-5 min-w-0">
          <CurrentShiftCard coverage={currentShiftCoverage} />
        </div>

        {/* Operational Alerts */}
        <div className="md:col-span-2 lg:col-span-3 min-w-0">
          <OperationalAlertsCard />
        </div>
      </div>

      {/* 4. Main Dashboard Row 2: Jadwal Mendatang Table (2/3) + Recent Activity Timeline (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Jadwal Mendatang (Table) */}
        <div className="lg:col-span-8 min-w-0">
          <OperatorStatusTable data={serializableOperatorStatuses} currentDate={todayStr} />
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-4 min-w-0">
          <ActivityFeedCard />
        </div>
      </div>
    </div>
  );
}
