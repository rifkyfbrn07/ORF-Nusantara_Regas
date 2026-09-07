import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getAllHSSEChecklists, getHSSEComplianceStats } from '@/server/services/hsseService';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ShieldCheck, Check, X, Minus } from 'lucide-react';

import { KpiCard } from '@/components/dashboard/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerHSSEPage() {
  await requireRole(['MANAGER']);

  const [checklists, stats] = await Promise.all([
    getAllHSSEChecklists(),
    getHSSEComplianceStats(),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="HEALTH, SAFETY, SECURITY & ENVIRONMENT"
        title="HSSE Safety Checklist"
        description="Verifikasi kelengkapan APD, validitas Surat Izin Kerja Aman (SIKA), dan kepatuhan pre-shift di fasilitas ORF Muara Karang."
      />

      {/* HSSE Compliance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Tingkat Kepatuhan APD & K3"
          value={`${stats.complianceRate}%`}
          iconName="shieldCheck"
          variant="green"
          isPrimary={true}
          subtext="Target Zero Accident"
          index={0}
        />
        <KpiCard
          label="Total Checklist Selesai"
          value={stats.totalChecklists}
          iconName="checkCircle"
          variant="blue"
          subtext="Semua Shift Terverifikasi"
          index={1}
        />
        <KpiCard
          label="Status Fasilitas"
          value="AMAN"
          iconName="shieldCheck"
          variant="green"
          subtext="ORF Muara Karang Kondusif"
          index={2}
        />
      </div>


      {/* Checklists List */}
      <div className="space-y-4">
        {checklists.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#DCE5EF] shadow-xs">
            <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#092B57]">Belum ada catatan checklist HSSE yang disubmit.</p>
          </div>
        ) : (
          checklists.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#5F718A] font-mono">{c.date}</span>
                      <span>•</span>
                      <span className="text-xs font-bold text-[#132238]">{c.shift.name}</span>
                      <span>•</span>
                      <span className="text-xs text-[#5F718A]">{c.location.name}</span>
                    </div>
                    <p className="text-sm font-extrabold text-[#092B57] mt-0.5">
                      Inspektor: {c.operator.name} ({c.operator.position})
                    </p>
                  </div>
                </div>

                <StatusBadge status={c.status} label="TERVERIFIKASI" size="md" />
              </div>

              {/* Items checklist grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {c.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#F8FBFE] border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-semibold text-[#132238] truncate">{item.label}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.status === 'YES'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'NO'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {item.status === 'YES' && <Check className="h-3 w-3" />}
                      {item.status === 'NO' && <X className="h-3 w-3" />}
                      {item.status === 'NA' && <Minus className="h-3 w-3" />}
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {c.notes && (
                <div className="p-3 bg-[#F8FBFE] rounded-xl border border-slate-200/80 text-xs text-[#5F718A] italic">
                  Catatan Tambahan: &ldquo;{c.notes}&rdquo;
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
