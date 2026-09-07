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
  const entranceDelay = `${Math.min(index, 11) * 35}ms`;

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

  // 1. Primary Total Operator Card (Navy Blue, Compact ~95px)
  if (variant === 'total' || (variant === 'primary' && isPrimary)) {
    return (
      <div
        onClick={onClick}
        style={{ animationDelay: entranceDelay }}
        className="anim-fade-up bg-[#0B3568] text-white rounded-xl p-3 sm:p-3.5 shadow-xs relative overflow-hidden flex flex-col justify-between h-[96px] sm:h-[104px] group hover:shadow-md transition-all select-none"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-[#1769AA]/50 text-white">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
              {label}
            </span>
          </div>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/15 text-white text-[9px] font-bold">
            ↑ 4%
          </span>
        </div>

        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            {typeof value === 'number' ? <CountUp value={value} duration={750} /> : value}
          </div>
          <span className="text-[9px] text-slate-300 font-medium">vs kemarin</span>
        </div>
      </div>
    );
  }

  // 2. Mini KPI Cards (Cuti, Izin, Sakit, Off - Compact ~96px)
  if (variant === 'mini') {
    const miniStyles = {
      cuti: {
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-50',
        textColor: 'text-indigo-950',
      },
      izin: {
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-50',
        textColor: 'text-teal-950',
      },
      sakit: {
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50',
        textColor: 'text-rose-950',
      },
      off: {
        iconColor: 'text-slate-600',
        iconBg: 'bg-slate-100',
        textColor: 'text-slate-900',
      },
    }[miniType];

    return (
      <div
        onClick={onClick}
        style={{ animationDelay: entranceDelay }}
        className="anim-fade-up bg-white rounded-xl p-2 px-2.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[96px] sm:h-[104px] hover:border-slate-300 transition-all text-center select-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </span>
          <div className={clsx('p-1 rounded-md', miniStyles.iconBg, miniStyles.iconColor)}>
            <Icon className="h-3 w-3" />
          </div>
        </div>
        <div className={clsx('text-xl sm:text-2xl font-black leading-none my-auto', miniStyles.textColor)}>
          {typeof value === 'number' ? <CountUp value={value} duration={600} /> : value}
        </div>
        <span className="text-[8.5px] text-slate-400 font-medium">Orang</span>
      </div>
    );
  }

  // 3. Metric Cards (Hadir, Terlambat, Belum Absen - Compact ~96px)
  const metricConfig = {
    hadir: {
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-700',
      barColor: 'bg-emerald-500',
      defaultPercent: '87.5%',
    },
    green: {
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-700',
      barColor: 'bg-emerald-500',
      defaultPercent: '87.5%',
    },
    terlambat: {
      dotColor: 'bg-[#F58220]',
      badgeBg: 'bg-orange-50 text-[#F58220]',
      barColor: 'bg-[#F58220]',
      defaultPercent: '6.3%',
    },
    orange: {
      dotColor: 'bg-[#F58220]',
      badgeBg: 'bg-orange-50 text-[#F58220]',
      barColor: 'bg-[#F58220]',
      defaultPercent: '6.3%',
    },
    amber: {
      dotColor: 'bg-[#F59E0B]',
      badgeBg: 'bg-amber-50 text-amber-700',
      barColor: 'bg-[#F59E0B]',
      defaultPercent: '12%',
    },
    belumAbsen: {
      dotColor: 'bg-[#DC2626]',
      badgeBg: 'bg-red-50 text-[#DC2626]',
      barColor: 'bg-[#DC2626]',
      defaultPercent: '4.2%',
    },
    red: {
      dotColor: 'bg-[#DC2626]',
      badgeBg: 'bg-red-50 text-[#DC2626]',
      barColor: 'bg-[#DC2626]',
      defaultPercent: '4.2%',
    },
    blue: {
      dotColor: 'bg-[#1769AA]',
      badgeBg: 'bg-blue-50 text-[#1769AA]',
      barColor: 'bg-[#1769AA]',
      defaultPercent: '100%',
    },
    primary: {
      dotColor: 'bg-[#0B3568]',
      badgeBg: 'bg-blue-50 text-[#0B3568]',
      barColor: 'bg-[#0B3568]',
      defaultPercent: '100%',
    },
    gray: {
      dotColor: 'bg-slate-400',
      badgeBg: 'bg-slate-50 text-slate-700',
      barColor: 'bg-slate-400',
      defaultPercent: '0%',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: entranceDelay }}
      className="anim-fade-up bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[96px] sm:h-[104px] hover:border-slate-300 transition-all select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className={clsx('inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-black', metricConfig.badgeBg)}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', metricConfig.dotColor)} />
          <span>{label}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400">
          {percent || metricConfig.defaultPercent}
        </span>
      </div>

      {/* Large Value */}
      <div className="my-1 flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-black text-[#1E293B] tracking-tight leading-none">
          {typeof value === 'number' ? <CountUp value={value} duration={750} /> : value}
        </div>
        <span className="text-[9px] text-slate-400 font-medium">Operator</span>
      </div>

      {/* Bottom Color Progress Line */}
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full bar-grow', metricConfig.barColor)} style={{ width: percent || metricConfig.defaultPercent }} />
      </div>
    </div>
  );
}
