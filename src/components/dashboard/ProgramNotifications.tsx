'use client';

import React, { useMemo } from 'react';
import { Clock, Target, AlertTriangle, Play, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ProgramStatus, ProgramCategory as ProgramKerjaCategory } from '@prisma/client';
import { getProgramCurrentStatus } from '@/lib/programKerjaLogic';
import { CATEGORY_LABELS, STATUS_COLORS } from '@/app/(dashboard)/manager/program-kerja/shared';
import { fmtPercent } from '@/app/(dashboard)/manager/program-kerja/shared';

export interface ProgramNotificationRow {
  id: string;
  name: string;
  category: ProgramKerjaCategory;
  status: ProgramStatus | null;
  progress: number;
  deadline: Date | null;
}

interface ProgramNotificationsProps {
  programs: ProgramNotificationRow[];
  userRole: 'ADMIN' | 'MANAGER' | 'OPERATOR';
}

function computeCategory(p: ProgramNotificationRow): 'MENDEKATI_TARGET' | 'TERLAMAT' | 'BELUM_TEREALISASI' | 'SEDANG_BERJALAN' | null {
  const currentStatus = getProgramCurrentStatus(p);
  const progress = Number(p.progress || 0);
  const now = new Date();
  const deadlinePassed = p.deadline ? p.deadline < now : false;

  if (deadlinePassed && progress < 100) return 'TERLAMAT';
  if (progress === 0) return 'BELUM_TEREALISASI';
  if (currentStatus === ProgramStatus.ON_PROGRESS && progress >= 50) return 'MENDEKATI_TARGET';
  if (currentStatus === ProgramStatus.ON_PROGRESS && progress < 50) return 'SEDANG_BERJALAN';
  return null;
}

export function ProgramNotifications({
  programs,
  userRole,
}: ProgramNotificationsProps) {
  const categorized = useMemo(() => {
    const groups: Record<string, ProgramNotificationRow[]> = {
      MENDEKATI_TARGET: [],
      TERLAMAT: [],
      BELUM_TEREALISASI: [],
      SEDANG_BERJALAN: [],
    };

    for (const p of programs) {
      const cat = computeCategory(p);
      if (cat && groups[cat]) {
        groups[cat].push(p);
      }
    }

    for (const key of Object.keys(groups) as (keyof typeof groups)[]) {
      groups[key].sort((a, b) => {
        const pa = Number(a.progress || 0);
        const pb = Number(b.progress || 0);
        if (key === 'TERLAMAT') return pa - pb;
        if (key === 'MENDEKATI_TARGET') return pb - pa;
        return pb - pa;
      });
    }

    return groups;
  }, [programs]);

  const totalNotified = Object.values(categorized).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <section className="rounded-2xl border border-[rgba(15,62,105,0.10)] dark:border-[#1E456A] bg-white dark:bg-[#102B45] p-5 shadow-[0_2px_12px_rgba(15,49,90,0.03)]">
      <div className="flex items-center justify-between border-b border-[#EDF2F7] dark:border-[#1A3F63] pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-[#0088D8]/10 text-[#0088D8] dark:text-[#38BDF8] p-2">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#092B57] dark:text-[#F8FAFC]">Pemberitahuan Program</h3>
            <p className="text-[10px] text-text-muted">
              {totalNotified} program perlu perhatian berdasarkan Plan vs Realisasi
            </p>
          </div>
        </div>
        <Link href="/manager/program-kerja" className="text-xs font-bold text-[#0088D8] dark:text-[#38BDF8] hover:underline shrink-0">
          Lihat Semua Program <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['MENDEKATI_TARGET', 'TERLAMAT', 'BELUM_TEREALISASI', 'SEDANG_BERJALAN'].map((key) => {
          const items = categorized[key];
          const cfg = CATEGORY_CONFIG[key];
          if (!items || items.length === 0) return null;

          const Icon = cfg.icon;

          return (
            <div key={key} className={`rounded-xl border p-4 shadow-2xs ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`rounded-lg p-1.5 ${cfg.bg.replace('50', '100')} text-[${cfg.color}]`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-xs font-bold tabular-nums ${cfg.color}`}>{items.length}</span>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{cfg.label}</p>
              <ul className="space-y-1.5">
                {items.slice(0, 3).map((p) => {
                  const statusColor = STATUS_COLORS[p.status ?? 'PLAN'] ?? '#64748B';
                  const statusLabel =
                    p.progress >= 100 ? 'TEREALISASI' : p.progress > 0 ? 'ON PROGRESS' : 'PLAN';
                  const badgeClass = `text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusColor}20 text-[${statusColor}]`;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                          {p.name}
                        </p>
                        <p className="text-[9px] text-text-muted truncate">
                          {CATEGORY_LABELS[p.category] ?? p.category} · {fmtPercent(Number(p.progress || 0))}% realisasi
                        </p>
                      </div>
                      <span className={badgeClass}>{statusLabel}</span>
                    </li>
                  );
                })}
                {items.length > 3 && (
                  <li className="text-[9px] text-text-muted italic">+{items.length - 3} lainnya</li>
                )}
              </ul>
              <Link
                href="/manager/program-kerja"
                className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0088D8] dark:text-[#38BDF8] hover:underline"
              >
                Lihat semua <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  MENDEKATI_TARGET: { label: 'Mendekati Target', icon: Target, color: '#0066B3', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
  TERLAMAT: { label: 'Terlambat', icon: AlertTriangle, color: '#DC2626', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800' },
  BELUM_TEREALISASI: { label: 'Belum Terealisasi', icon: Play, color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
  SEDANG_BERJALAN: { label: 'Sedang Berjalan', icon: Clock, color: '#16A34A', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
};