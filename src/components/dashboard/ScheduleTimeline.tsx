import { CalendarDays, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatJakartaDate } from '@/lib/time';
import { getUpcomingWorkSchedules } from '@/server/services/workforceService';

export async function ScheduleTimeline() {
  const today = formatJakartaDate();
  const end = new Date(`${today}T00:00:00+07:00`);
  end.setDate(end.getDate() + 6);
  const schedules = await getUpcomingWorkSchedules(today, end.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));

  return (
    <section className="bg-white rounded-xl border border-[#DCE6F2] shadow-xs overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#123E7A]" />
          <div>
            <h3 className="text-sm font-black text-[#0F2F63] uppercase tracking-wider">Jadwal Kerja Berikutnya</h3>
            <p className="text-[10px] text-[#64748B]">7 hari ke depan · termasuk jadwal OFF</p>
          </div>
        </div>
        <Link href="/manager/schedules" className="text-xs font-bold text-[#1D5FA7] hover:underline flex items-center">
          Lihat semua <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="max-h-[330px] overflow-auto">
        <table className="w-full min-w-[570px] text-left text-xs">
          <thead className="sticky top-0 bg-[#EDF4FB] text-[10px] uppercase text-[#45617f] font-bold border-b border-[#DCE6F2]">
            <tr>
              <th className="px-4 py-2.5 font-bold">Tanggal</th>
              <th className="px-4 py-2.5 font-bold">Operator</th>
              <th className="px-4 py-2.5 font-bold">Shift</th>
              <th className="px-4 py-2.5 font-bold">Jam</th>
              <th className="px-4 py-2.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {schedules.slice(0, 24).map((schedule) => (
              <tr key={schedule.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-2.5 font-mono font-bold text-[#172033]">{schedule.date}</td>
                <td className="px-4 py-2.5">
                  <p className="font-bold text-[#0F2F63]">{schedule.user.name}</p>
                  <p className="text-[10px] text-[#64748B] font-mono">{schedule.user.employeeId}</p>
                </td>
                <td className="px-4 py-2.5 font-semibold text-[#172033]">{schedule.shift.name}</td>
                <td className="px-4 py-2.5 font-mono text-[#64748B]">{schedule.shift.startTime}–{schedule.shift.endTime}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${schedule.status === 'WORK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {schedule.status === 'WORK' ? 'KERJA' : 'OFF / LIBUR'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedules.length === 0 && <p className="p-8 text-center text-xs text-[#64748B]">Belum ada jadwal kerja.</p>}
      </div>
    </section>
  );
}
