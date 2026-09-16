'use client';

import React from 'react';
import { clsx } from 'clsx';
import {
  Users,
  UserCheck,
  UserCog,
  UserX,
  HardHat,
  Shield,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  ClockAlert,
  Clock,
  CalendarDays,
  CalendarOff,
  Calendar,
  FileCheck2,
  HeartPulse,
  Coffee,
  TrendingUp,
  Activity,
  LucideIcon,
  ArrowUpRight,
} from 'lucide-react';
import { CountUp } from '@/components/ui/CountUp';

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  userCheck: UserCheck,
  userCog: UserCog,
  userX: UserX,
  hardHat: HardHat,
  shield: Shield,
  shieldCheck: ShieldCheck,
  checkCircle: CheckCircle2,
  check: CheckCircle,
  alertOctagon: AlertOctagon,
  alertTriangle: AlertTriangle,
  clockAlert: ClockAlert,
  clock: Clock,
  calendarDays: CalendarDays,
  calendarOff: CalendarOff,
  calendar: Calendar,
  fileCheck: FileCheck2,
  heartPulse: HeartPulse,
  sick: HeartPulse,
  coffee: Coffee,
  off: Coffee,
  trendingUp: TrendingUp,
  activity: Activity,
};

export type KpiIconName = keyof typeof iconMap | string;

interface KpiCardProps {
  label: string;
  value: number | string;
  iconName?: KpiIconName;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  subtext?: string;
  percent?: string;
  variant?:
    | 'total'
    | 'hadir'
    | 'terlambat'
    | 'belumAbsen'
    | 'mini'
    | 'primary'
    | 'green'
    | 'amber'
    | 'orange'
    | 'red'
    | 'blue'
    | 'navy'
    | 'slate'
    | 'gray';
  miniType?: 'cuti' | 'izin' | 'sakit' | 'off';
  isPrimary?: boolean;
  onClick?: () => void;
  index?: number;
}

export function KpiCard({
  label,
  value,
  iconName,
  icon: IconProp,
  percent,
  variant = 'hadir',
  miniType = 'cuti',
  isPrimary = false,
  onClick,
  index = 0,
}: KpiCardProps) {
  const entranceDelay = `${Math.min(index, 11) * 60}ms`;

  // Resolve Icon Component safely
  let Icon: LucideIcon | React.ComponentType<{ className?: string }> = Users;

  if (iconName && iconMap[iconName]) {
    Icon = iconMap[iconName];
  } else if (IconProp) {
    Icon = IconProp;
  } else if (variant === 'total' || (variant === 'primary' && isPrimary)) {
    Icon = Users;
  } else if (variant === 'hadir' || variant === 'green') {
    Icon = CheckCircle2;
  } else if (variant === 'terlambat' || variant === 'orange' || variant === 'amber') {
    Icon = AlertOctagon;
  } else if (variant === 'belumAbsen' || variant === 'red') {
    Icon = ClockAlert;
  } else if (variant === 'mini') {
    if (miniType === 'cuti') Icon = CalendarOff;
    else if (miniType === 'izin') Icon = FileCheck2;
    else if (miniType === 'sakit') Icon = HeartPulse;
    else if (miniType === 'off') Icon = Coffee;
  }

  // 1. Primary Total Operator Card (Navy Blue Card with Top Accent)
  if (variant === 'total' || (variant === 'primary' && isPrimary)) {
    return (
      <div
        onClick={onClick}
        style={{ animationDelay: entranceDelay }}
        className="anim-fade-up bg-gradient-to-br from-[#0B3568] to-[#061D3B] dark:from-[#0D2B4D] dark:to-[#07192C] text-white rounded-2xl p-4 border-t-2 border-t-[#0088D8] border-x border-b border-[#0B3568]/40 shadow-sm relative overflow-hidden flex flex-col justify-between h-[110px] group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg select-none cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#0088D8]/20 text-[#38BDF8] border border-blue-400/20 shadow-xs">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-200">
              {label}
            </span>
          </div>
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/15 text-white text-[9.5px] font-extrabold">
            <ArrowUpRight className="h-3 w-3" /> 4%
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            {typeof value === 'number' ? <CountUp value={value} duration={750} /> : value}
          </div>
          <span className="text-[9.5px] text-slate-300 font-medium">vs kemarin</span>
        </div>
      </div>
    );
  }

  // 2. Mini KPI Cards (Cuti, Izin, Sakit, Off)
  if (variant === 'mini') {
    const miniStyles = {
      cuti: {
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        iconBg: 'bg-indigo-50 dark:bg-indigo-500/15',
        topAccent: 'border-t-indigo-500',
      },
      izin: {
        iconColor: 'text-teal-600 dark:text-teal-400',
        iconBg: 'bg-teal-50 dark:bg-teal-500/15',
        topAccent: 'border-t-teal-500',
      },
      sakit: {
        iconColor: 'text-[#E5242A] dark:text-rose-400',
        iconBg: 'bg-red-50 dark:bg-rose-500/15',
        topAccent: 'border-t-[#E5242A]',
      },
      off: {
        iconColor: 'text-slate-600 dark:text-slate-300',
        iconBg: 'bg-slate-100 dark:bg-slate-500/15',
        topAccent: 'border-t-slate-400',
      },
    }[miniType];

    return (
      <div
        onClick={onClick}
        style={{ animationDelay: entranceDelay }}
        className={clsx(
          'anim-fade-up bg-white dark:bg-[#0D263E] rounded-2xl p-3 border-t-2 border-x border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] shadow-sm flex flex-col justify-between h-[110px] text-center select-none cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md',
          miniStyles.topAccent
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-extrabold text-[#64748B] dark:text-[#8EA7BD] uppercase tracking-wider">
            {label}
          </span>
          <div className={clsx('p-1 rounded-lg', miniStyles.iconBg, miniStyles.iconColor)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-[#0B3568] dark:text-[#F5FAFF] leading-none my-auto">
          {typeof value === 'number' ? <CountUp value={value} duration={600} /> : value}
        </div>
        <span className="text-[9px] text-[#64748B] dark:text-[#8EA7BD] font-medium">Personil</span>
      </div>
    );
  }

  // 3. Metric Cards with Login-Style Clean Badges & Top Accent
  const metricConfig = {
    hadir: {
      iconColor: 'text-[#69BE28] dark:text-[#4ADE80]',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      topAccent: 'border-t-[#69BE28]',
      badgeBg: 'bg-emerald-50 text-[#69BE28] dark:bg-emerald-500/15 dark:text-emerald-400',
      badgeText: '↑ 87.5%',
      subtext: 'Tercatat hadir',
    },
    green: {
      iconColor: 'text-[#69BE28] dark:text-[#4ADE80]',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      topAccent: 'border-t-[#69BE28]',
      badgeBg: 'bg-emerald-50 text-[#69BE28] dark:bg-emerald-500/15 dark:text-emerald-400',
      badgeText: 'Aktif',
      subtext: 'Status operasional',
    },
    terlambat: {
      iconColor: 'text-[#F58220] dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-500/15',
      topAccent: 'border-t-[#F58220]',
      badgeBg: 'bg-orange-50 text-[#F58220] dark:bg-orange-500/15 dark:text-orange-400',
      badgeText: '6.3%',
      subtext: 'Perlu verifikasi',
    },
    orange: {
      iconColor: 'text-[#F58220] dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-500/15',
      topAccent: 'border-t-[#F58220]',
      badgeBg: 'bg-orange-50 text-[#F58220] dark:bg-orange-500/15 dark:text-orange-400',
      badgeText: 'Progress',
      subtext: 'Target berjalan',
    },
    amber: {
      iconColor: 'text-[#F59E0B] dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-500/15',
      topAccent: 'border-t-[#F59E0B]',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
      badgeText: 'Pending',
      subtext: 'Menunggu review',
    },
    belumAbsen: {
      iconColor: 'text-[#E5242A] dark:text-red-400',
      iconBg: 'bg-red-50 dark:bg-red-500/15',
      topAccent: 'border-t-[#E5242A]',
      badgeBg: 'bg-red-50 text-[#E5242A] dark:bg-red-500/15 dark:text-red-400',
      badgeText: '4.2%',
      subtext: 'Belum check-in',
    },
    red: {
      iconColor: 'text-[#E5242A] dark:text-red-400',
      iconBg: 'bg-red-50 dark:bg-red-500/15',
      topAccent: 'border-t-[#E5242A]',
      badgeBg: 'bg-red-50 text-[#E5242A] dark:bg-red-500/15 dark:text-red-400',
      badgeText: 'Inactive',
      subtext: 'Non-aktif / off',
    },
    blue: {
      iconColor: 'text-[#0088D8] dark:text-[#38BDF8]',
      iconBg: 'bg-blue-50 dark:bg-blue-500/15',
      topAccent: 'border-t-[#0088D8]',
      badgeBg: 'bg-blue-50 text-[#0088D8] dark:bg-blue-500/15 dark:text-[#38BDF8]',
      badgeText: '↑ 12%',
      subtext: 'Total jadwal',
    },
    navy: {
      iconColor: 'text-[#0B3568] dark:text-[#93C5FD]',
      iconBg: 'bg-slate-100 dark:bg-slate-500/15',
      topAccent: 'border-t-[#0066B3]',
      badgeBg: 'bg-blue-50 text-[#0066B3] dark:bg-blue-500/15 dark:text-[#93C5FD]',
      badgeText: 'Roster',
      subtext: 'Tenaga kerja',
    },
    slate: {
      iconColor: 'text-[#64748B] dark:text-[#94A3B8]',
      iconBg: 'bg-slate-100 dark:bg-slate-500/15',
      topAccent: 'border-t-slate-400',
      badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
      badgeText: 'Plan',
      subtext: 'Rencana program',
    },
    primary: {
      iconColor: 'text-[#0088D8] dark:text-[#38BDF8]',
      iconBg: 'bg-blue-50 dark:bg-blue-500/15',
      topAccent: 'border-t-[#0088D8]',
      badgeBg: 'bg-blue-50 text-[#0088D8] dark:bg-blue-500/15 dark:text-[#38BDF8]',
      badgeText: 'Total',
      subtext: 'Semua personil',
    },
    gray: {
      iconColor: 'text-[#64748B] dark:text-slate-400',
      iconBg: 'bg-slate-100 dark:bg-slate-500/15',
      topAccent: 'border-t-slate-300',
      badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
      badgeText: '0%',
      subtext: 'Tidak ada data',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: entranceDelay }}
      className={clsx(
        'anim-fade-up bg-white dark:bg-[#0D263E] rounded-2xl p-4 border-t-2 border-x border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] shadow-sm flex flex-col justify-between h-[110px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md select-none cursor-pointer',
        metricConfig.topAccent
      )}
    >
      {/* Top Row: Icon + Label + Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx('p-1.5 rounded-xl shadow-2xs', metricConfig.iconBg, metricConfig.iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-extrabold text-[#64748B] dark:text-[#8EA7BD] uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-extrabold', metricConfig.badgeBg)}>
          {percent ? `↑ ${percent}` : metricConfig.badgeText}
        </span>
      </div>

      {/* Middle/Bottom Row: Big Number & Subtext */}
      <div className="flex items-baseline justify-between mt-1">
        <div className="text-2xl sm:text-3xl font-black text-[#0B3568] dark:text-[#F5FAFF] tracking-tight leading-none">
          {typeof value === 'number' ? <CountUp value={value} duration={750} /> : value}
        </div>
        <span className="text-[9.5px] text-[#64748B] dark:text-[#8EA7BD] font-medium">
          {metricConfig.subtext}
        </span>
      </div>
    </div>
  );
}
