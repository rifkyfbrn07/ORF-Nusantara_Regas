import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getAuditLogs } from '@/server/services/auditService';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerAuditLogsPage() {
  await requireRole(['MANAGER', 'ADMIN']);
  const { logs, total } = await getAuditLogs(100);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="SYSTEM SECURITY & INTEGRITY"
        title="Audit Trail"
        description="Rekam jejak seluruh mutasi data operasional, otentikasi login, pergantian jadwal shift, absensi, dan persetujuan cuti."
        action={
          <span className="text-xs font-bold bg-[#EDF4FB] text-[#092B57] px-3.5 py-1.5 rounded-xl border border-[#DCE5EF]">
            {total} Total Catatan Log
          </span>
        }
      />

      <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#132238]">
            <thead className="bg-[#EDF4FB] text-[11px] uppercase font-bold text-[#3F5570] border-b border-[#DCE5EF]">
              <tr>
                <th className="px-5 py-3.5">WAKTU (WIB)</th>
                <th className="px-5 py-3.5">USER / INISIATOR</th>
                <th className="px-5 py-3.5">AKSI (ACTION)</th>
                <th className="px-5 py-3.5">ENTITAS</th>
                <th className="px-5 py-3.5">DETAIL METADATA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F8FBFE] transition">
                  <td className="px-5 py-3.5 font-mono text-[#5F718A] text-[11px] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })} WIB
                  </td>
                  <td className="px-5 py-3.5">
                    {log.user ? (
                      <div>
                        <span className="font-bold text-[#092B57]">{log.user.name}</span>
                        <div className="text-[10px] text-[#5F718A] font-mono">
                          {log.user.employeeId} • {log.user.role}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sistem / Anonim</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-[#092B57] px-2 py-0.5 rounded-md bg-[#F3F6FA] text-[10px] font-mono border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#132238]">
                    {log.entity}
                  </td>
                  <td className="px-5 py-3.5 text-[11px] font-mono text-[#5F718A] max-w-md truncate">
                    {log.metadata || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
