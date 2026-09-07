import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getOperatorAttendanceHistory } from '@/server/services/attendanceService';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatJakartaTime } from '@/lib/time';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function OperatorAttendancePage() {
  const user = await requireAuth();
  const attendances = await getOperatorAttendanceHistory(user.id, 50);

  return (
    <div className="space-y-6 max-w-4xl mx-auto dashboard-enter">
      <PageHeader
        eyebrow="PERSONAL ATTENDANCE LOG"
        title="Absensi Saya"
        description="Riwayat lengkap catatan waktu masuk, keluar, dan kepatuhan presensi shift kerja Anda di ORF Muara Karang."
      />

      <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#132238]">
            <thead className="bg-[#EDF4FB] text-[11px] uppercase font-bold text-[#3F5570] border-b border-[#DCE5EF]">
              <tr>
                <th className="px-5 py-3.5">TANGGAL</th>
                <th className="px-5 py-3.5">SHIFT</th>
                <th className="px-5 py-3.5 text-center">STATUS</th>
                <th className="px-5 py-3.5">CHECK IN</th>
                <th className="px-5 py-3.5">CHECK OUT</th>
                <th className="px-5 py-3.5">TERLAMBAT</th>
                <th className="px-5 py-3.5">LOKASI / CATATAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#5F718A]">
                    Belum ada riwayat absensi yang tercatat.
                  </td>
                </tr>
              ) : (
                attendances.map((a) => {
                  const inTime = formatJakartaTime(a.checkIn);
                  const outTime = formatJakartaTime(a.checkOut);

                  return (
                    <tr key={a.id} className="hover:bg-[#F8FBFE] transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#092B57]">
                        {a.date}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#132238]">
                        {a.schedule?.shift?.name || 'Shift Operasional'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={a.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {inTime !== '—' ? (
                          <span className={`font-bold ${a.status === 'TERLAMBAT' ? 'text-[#F58220]' : 'text-[#132238]'}`}>
                            {inTime} WIB
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {outTime !== '—' ? (
                          <span className="font-bold text-[#132238]">{outTime} WIB</span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {a.lateMinutes > 0 ? (
                          <span className="text-[#F58220] font-bold bg-[#FFF1E6] px-2 py-0.5 rounded text-[11px]">
                            +{a.lateMinutes} menit
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[11px]">
                        <span className="text-[#132238] font-medium">
                          {a.checkInLocation || a.schedule?.location?.name || 'ORF Muara Karang'}
                        </span>
                        {a.notes && (
                          <p className="text-[#5F718A] italic mt-0.5 truncate max-w-xs">
                            &ldquo;{a.notes}&rdquo;
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
