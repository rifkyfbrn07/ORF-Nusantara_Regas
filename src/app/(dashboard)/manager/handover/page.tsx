import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getAllHandovers } from '@/server/services/handoverService';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatJakartaTime } from '@/lib/time';
import { ClipboardList, ArrowRight, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerHandoverPage() {
  await requireRole(['MANAGER']);
  const handovers = await getAllHandovers();

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="OPERATIONAL HANDOVER & LOGBOOK"
        title="Shift Handover"
        description="Tinjau catatan serah terima shift digital, status parameter peralatan mesin kompresor & metering, serta isu lapangan."
      />

      <div className="space-y-4">
        {handovers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#DCE5EF] shadow-xs">
            <ClipboardList className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#092B57]">Belum ada catatan serah terima shift.</p>
          </div>
        ) : (
          handovers.map((h) => (
            <div key={h.id} className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#EDF4FB] text-[#092B57] font-bold">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#5F718A] uppercase tracking-wider font-mono">{h.date}</span>
                      <span>•</span>
                      <span className="text-xs font-bold text-[#132238]">{h.shift.name} ({h.shift.startTime} - {h.shift.endTime} WIB)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-extrabold text-[#092B57]">{h.outgoingOperator.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-extrabold text-[#1769AA]">{h.incomingOperator.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={h.status} size="md" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#F8FBFE] rounded-xl border border-slate-200/80 space-y-1">
                  <span className="font-bold text-[#092B57] uppercase text-[11px] block">Catatan Operasional:</span>
                  <p className="text-[#132238] font-medium leading-relaxed">{h.operationalNotes}</p>
                </div>

                <div className="p-4 bg-[#F8FBFE] rounded-xl border border-slate-200/80 space-y-1">
                  <span className="font-bold text-[#092B57] uppercase text-[11px] block">Status Peralatan / Mesin:</span>
                  <p className="text-[#132238] font-medium leading-relaxed">{h.equipmentStatus}</p>
                </div>
              </div>

              {(h.issues || h.pendingTasks || h.safetyNotes) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                  {h.issues && (
                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900">
                      <div className="flex items-center gap-1 font-bold mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Isu / Anomali:</span>
                      </div>
                      <p>{h.issues}</p>
                    </div>
                  )}

                  {h.pendingTasks && (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[#092B57]">
                      <div className="flex items-center gap-1 font-bold mb-1">
                        <Clock className="h-3.5 w-3.5 text-[#1769AA]" />
                        <span>Tugas Tertunda:</span>
                      </div>
                      <p>{h.pendingTasks}</p>
                    </div>
                  )}

                  {h.safetyNotes && (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900">
                      <div className="flex items-center gap-1 font-bold mb-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Catatan HSSE / SIKA:</span>
                      </div>
                      <p>{h.safetyNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {h.acknowledgedAt && (
                <div className="text-[11px] text-slate-400 font-mono text-right pt-2 border-t border-slate-100">
                  Dikonfirmasi oleh {h.incomingOperator.name} pada {formatJakartaTime(h.acknowledgedAt)} WIB
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
