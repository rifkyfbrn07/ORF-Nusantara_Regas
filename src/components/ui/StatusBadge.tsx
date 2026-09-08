import React from 'react';
import { clsx } from 'clsx';

export type BadgeStatusType =
  | 'HADIR' | 'TERLAMBAT' | 'BELUM_ABSEN' | 'BELUM ABSEN' | 'CUTI' | 'IZIN' | 'SAKIT'
  | 'OFF' | 'ABSENT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULL' | 'WARNING'
  | 'CRITICAL' | 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'WORK' | 'KERJA' | string;

interface StatusBadgeProps {
  status: BadgeStatusType;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, label, className, size = 'md' }: StatusBadgeProps) {
  const norm = (status || '').toUpperCase().replace(/\s+/g, '_');
  const displayLabel = label || status?.replace(/_/g, ' ') || 'UNKNOWN';
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (norm) {
    case 'WORK':
    case 'KERJA':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20';
      dotColor = 'bg-blue-600';
      break;
    case 'HADIR':
    case 'APPROVED':
    case 'FULL':
    case 'COMPLETED':
    case 'ACKNOWLEDGED':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
      dotColor = 'bg-emerald-500';
      break;
    case 'TERLAMBAT':
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20';
      dotColor = 'bg-[#F58220]';
      break;
    case 'BELUM_ABSEN':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20';
      dotColor = 'bg-amber-500';
      break;
    case 'PENDING':
    case 'WARNING':
    case 'DRAFT':
    case 'IZIN':
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20';
      dotColor = 'bg-[#F58220]';
      break;
    case 'CUTI':
      colorClasses = 'bg-blue-50 text-[#1D5FA7] border-blue-200 ring-1 ring-blue-500/20';
      dotColor = 'bg-[#1D5FA7]';
      break;
    case 'SAKIT':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20';
      dotColor = 'bg-amber-500';
      break;
    case 'REJECTED':
    case 'ABSENT':
    case 'CRITICAL':
    case 'OFF':
      colorClasses = 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/20';
      dotColor = 'bg-[#DC2626]';
      break;
    case 'SUBMITTED':
      colorClasses = 'bg-blue-50 text-[#123E7A] border-blue-200 ring-1 ring-blue-500/20';
      dotColor = 'bg-[#123E7A]';
      break;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  }[size];

  return <span className={clsx('inline-flex select-none items-center justify-center gap-1.5 rounded-full border transition-colors', sizeClasses, colorClasses, className)}><span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', dotColor)} />{displayLabel}</span>;
}
