import React from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import { getOperatorSchedules } from '@/server/services/scheduleService';
import { formatJakartaDate, formatIndonesianDate, getJakartaNow } from '@/lib/time';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

type ScheduleView = 'week' | 'month' | 'upcoming';

function startOfWeekJakarta(now: Date): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function computeRange(view: ScheduleView): { start: string; end: string; days: number } {
  const now = getJakartaNow();
  const today = formatJakartaDate();

  if (view === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const start = toDateStr(first);
    return { start, end: addDays(start, daysInMonth - 1), days: daysInMonth };
  }

  if (view === 'upcoming') {
    return { start: today, end: addDays(today, 13), days: 14 };
  }

  const start = toDateStr(startOfWeekJakarta(now));
  return { start, end: addDays(start, 6), days: 7 };
}

const VIEW_TABS: Array<{ key: ScheduleView; label: string }> = [
  { key: 'week', label: 'Minggu Ini' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'upcoming', label: 'Akan Datang' },
];

export default async function OperatorSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const view: ScheduleView =
    params.view === 'month' || params.view === 'upcoming' ? params.view : 'week';

  const todayStr = formatJakartaDate();
  const { start, end, days } = computeRange(view);
  const schedules = await getOperatorSchedules(user.id, start, days);

  const workDays = schedules.filter((s) => s.status === 'WORK').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto dashboard-enter">
      <PageHeader
        eyebrow="PERSONAL WORK CALENDAR"
        title="Jadwal Saya"
        description={`${formatIndonesianDate()} — Daftar giliran shift operasional pribadi Anda di Fasilitas ORF Muara Karang.`}
      />

      {/* View switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#DCE5EF] shadow-xs">
        <div className="flex items-center gap-2">
          {VIEW_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/operator/schedule?view=${tab.key}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                view === tab.key
                  ? 'bg-[#123E7A] text-white shadow-xs'
                  : 'bg-[#F3F6FA] text-[#5F718A] hover:text-[#092B57]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <span className="text-xs text-[#5F718A] font-medium pr-2">
          {workDays} hari kerja · {start} s/d {end}
        </span>
      </div>

      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#DCE5EF] shadow-xs">
            <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#092B57]">Belum ada jadwal pada rentang ini.</p>
            <p className="text-xs text-[#5F718A] mt-1">Data belum tersedia.</p>
          </div>
        ) : (
          schedules.map((s, i) => {
            const isToday = s.date === todayStr;

            return (
              <div
                key={s.id}
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                className={`anim-fade-up bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isToday ? 'border-[#123E7A] ring-2 ring-[#1769AA]/15 bg-blue-50/15' : 'border-[#DCE5EF]'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center font-mono font-bold shrink-0 ${
                      isToday ? 'bg-[#123E7A] text-white shadow-xs' : 'bg-[#F3F6FA] text-[#092B57]'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-semibold">
                      {new Date(`${s.date}T00:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-black -mt-0.5">
                      {s.date.split('-')[2]}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#132238] font-mono">{s.date}</span>
                      {isToday && (
                        <span className="text-[9px] font-black px-2 py-0.2 rounded-full bg-blue-100 text-[#123E7A] uppercase">
                          HARI INI
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-[#092B57] mt-0.5">
                      {s.shift.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[#5F718A] mt-1">
                      <div className="flex items-center gap-1 font-mono font-bold text-[#1769AA]">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{s.shift.startTime} — {s.shift.endTime} WIB</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
                        <span>{s.location.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col items-end gap-2">
                  <StatusBadge
                    status={s.status}
                    label={s.status === 'WORK' ? 'KERJA' : 'OFF'}
                    size="md"
                  />
                  {s.notes && (
                    <span className="text-[11px] text-[#5F718A] italic max-w-xs text-right truncate">
                      &ldquo;{s.notes}&rdquo;
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
