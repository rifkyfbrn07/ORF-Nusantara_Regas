'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ShieldCheck, Search, CalendarDays, Users } from 'lucide-react';
import type { RosterMonthData, RosterOperatorRow, RosterDayCell } from '@/server/services/rosterService';
import type { FinalDayState, FinalDayKind } from '@/server/services/workStatisticsService';
import { RosterMatrix } from '@/components/roster/RosterMatrix';
import { RosterCalendarView } from '@/components/roster/RosterCalendarView';

interface JadwalSayaClientProps {
  data: RosterMonthData;
  days: FinalDayState[];
  operatorName: string;
  operatorPosition: string;
  allOperatorUsers: { id: string; name: string; username: string | null; employeeId: string; position: string }[];
  allRosterOperators: RosterOperatorRow[];
  leaveOverlay: Record<string, 'CUTI' | 'IZIN' | 'SAKIT'>;
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function JadwalSayaClient({
  data,
  days,
  operatorName,
  operatorPosition,
  allOperatorUsers,
  allRosterOperators,
  leaveOverlay,
}: JadwalSayaClientProps) {
  const router = useRouter();
  const me = data.operators[0];
  const [view, setView] = React.useState<'table' | 'calendar' | 'list'>('table');
  const [activeTab, setActiveTab] = React.useState<'saya' | 'operator'>('saya');

  function navigate(target: { year: number; month: number }) {
    router.push(`/operator/jadwal-saya?year=${target.year}&month=${target.month}`);
  }

  const monthLabel = `${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][data.month - 1]} ${data.year}`;

  const counts = React.useMemo(() => {
    const c = { pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0, work: 0 };
    for (const d of days) {
      if (d.finalStatus === 'PAGI') c.pagi += 1;
      else if (d.finalStatus === 'MALAM') c.malam += 1;
      else if (d.finalStatus === 'WORK') c.work += 1;
      else if (d.finalStatus === 'OFF') c.off += 1;
      else if (d.finalStatus === 'CUTI') c.cuti += 1;
      else if (d.finalStatus === 'IZIN') c.izin += 1;
      else if (d.finalStatus === 'SAKIT') c.sakit += 1;
    }
    c.work = c.work + c.pagi + c.malam;
    return c;
  }, [days]);

  return (
    <div className="space-y-5 dashboard-enter">
      {/* Tabs: Jadwal Saya | Jadwal Operator */}
      <div className="flex rounded-xl border border-[#CBD7E6] overflow-hidden w-fit shadow-xs bg-white">
        <TabButton
          active={activeTab === 'saya'}
          onClick={() => setActiveTab('saya')}
          label="Jadwal Saya"
          icon={<CalendarDays className="h-3.5 w-3.5" />}
        />
        <TabButton
          active={activeTab === 'operator'}
          onClick={() => setActiveTab('operator')}
          label="Jadwal Operator"
          icon={<Users className="h-3.5 w-3.5" />}
        />
      </div>

      {activeTab === 'saya' && (
        <>
      {/* Header bulan + navigasi */}
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
            Jadwal Saya — {operatorPosition}
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#092B57] tracking-tight leading-tight">
            {monthLabel}
          </div>
          <div className="text-[10.5px] font-semibold text-slate-400">
            {operatorName} · ORF Muara Karang
          </div>
        </div>
        <div className="flex rounded-lg border border-[#CBD7E6] overflow-hidden shrink-0 self-start">
          <button
            onClick={() => navigate(prevMonth(data.year, data.month))}
            className="p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const now = new Date();
              navigate({ year: now.getFullYear(), month: now.getMonth() + 1 });
            }}
            className="px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-x border-[#CBD7E6] cursor-pointer whitespace-nowrap"
          >
            Bulan Ini
          </button>
          <button
            onClick={() => navigate(nextMonth(data.year, data.month))}
            className="p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Ringkasan pribadi (jadwal FINAL) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Shift Pagi (Pg)" value={String(counts.pagi)} accent="border-l-[#0066B3]" sub="07.00 - 19.00" />
        <KpiCard label="Shift Malam (Mlm)" value={String(counts.malam)} accent="border-l-[#0F315A]" sub="19.00 - 07.00" />
        <KpiCard label="Hari Kerja" value={String(counts.work)} accent="border-l-emerald-500" sub={`OFF ${counts.off} · Libur`} />
        <KpiCard
          label="Cuti / Izin / Sakit"
          value={String(counts.cuti + counts.izin + counts.sakit)}
          accent={
            counts.cuti + counts.izin + counts.sakit > 0
              ? 'border-l-amber-500'
              : 'border-l-slate-400'
          }
          sub={counts.cuti + counts.izin + counts.sakit > 0 ? `Cuti ${counts.cuti} · Izin ${counts.izin} · Sakit ${counts.sakit}` : undefined}
        />
      </div>

      {/* View switcher */}
      {me && (
        <>
          <div className="flex flex-wrap rounded-lg border border-[#CBD7E6] overflow-hidden w-fit">
            <ViewTab active={view === 'table'} onClick={() => setView('table')} label="Tabel Harian" />
            <ViewTab active={view === 'calendar'} onClick={() => setView('calendar')} label="Kalender Bulanan" />
            <ViewTab active={view === 'list'} onClick={() => setView('list')} label="Roster" />
          </div>

          {view === 'table' ? (
            <ScheduleTable days={days} />
          ) : view === 'calendar' ? (
            <RosterCalendarView
              operators={[me]}
              year={data.year}
              month={data.month}
              daysInMonth={data.daysInMonth}
              focusOperatorId={me.id}
            />
          ) : (
            <RosterMatrix operators={[me]} daysInMonth={data.daysInMonth} showContacts={false} />
          )}
        </>
      )}

      {!me && (
        <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs px-6 py-10 text-center">
          <div className="text-xs font-bold text-slate-400">
            Belum ada jadwal untuk bulan {monthLabel}.
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border bg-[#EAF4FC] border-[#BBDFF5] text-[#0066B3] text-[8.5px] font-black">Pg</span>
          Pagi = 07.00 - 19.00
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border bg-[#0F315A] border-[#0F315A] text-white text-[8.5px] font-black">Mlm</span>
          Malam = 19.00 - 07.00
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border bg-red-50 border-red-200 text-[#DC2626] text-[8.5px] font-black">Off</span>
          Libur
        </span>
        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border bg-amber-50 border-amber-200 text-amber-700 text-[8.5px] font-black">Ct</span>
          Cuti / Izin / Sakit (disetujui)
        </span>
        {me?.hsseMarshall && (
          <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
            <ShieldCheck className="h-3 w-3 text-[#F58220]" /> Anda bertugas sebagai HSSE Marshall
          </span>
        )}
      </div>
        </>
      )}

      {activeTab === 'operator' && (
        <JadwalOperatorPanel
          year={data.year}
          month={data.month}
          monthLabel={monthLabel}
          operatorUsers={allOperatorUsers}
          rosterOperators={allRosterOperators}
          leaveOverlay={leaveOverlay}
          navigate={navigate}
        />
      )}
    </div>
  );
}


function ViewTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${active ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
    >
      {label}
    </button>
  );
}

function ScheduleTable({ days }: { days: FinalDayState[] }) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE5EF] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="bg-[#EDF4FB] text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-black">Tanggal</th>
              <th className="px-3 py-2.5 font-black">Hari</th>
              <th className="px-3 py-2.5 font-black">Shift</th>
              <th className="px-3 py-2.5 font-black">Jam</th>
              <th className="px-3 py-2.5 font-black">Status</th>
              <th className="px-3 py-2.5 font-black">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF2F7]">
            {days.map((day) => {
              const isLeave = day.finalStatus === 'CUTI' || day.finalStatus === 'IZIN' || day.finalStatus === 'SAKIT';
              return (
                <tr key={day.date} className={day.changed ? 'bg-amber-50/40' : 'hover:bg-[#F8FBFE]'}>
                  <td className="px-3 py-2 font-mono font-bold text-[#0B3568]">{day.date}</td>
                  <td className="px-3 py-2 font-semibold text-slate-500">{day.weekday}, {day.date.slice(8, 10)} {MONTHS[Number(day.date.slice(5, 7)) - 1]}</td>
                  <td className="px-3 py-2 font-bold text-[#123D70]">
                    {day.finalStatus === 'OFF' ? '—' : day.shiftName ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-500">
                    {day.finalStatus === 'OFF' ? '—' : day.startTime && day.endTime ? `${day.startTime} - ${day.endTime}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <FinalBadge finalStatus={day.finalStatus} />
                  </td>
                  <td className="px-3 py-2 text-[10.5px] italic text-slate-500">
                    {day.changed ? (
                      <span className="block font-bold text-amber-600 not-italic">Jadwal berubah{isLeave ? ' (perubahan resmi)' : ''}</span>
                    ) : null}
                    {day.notes ? <span className="block max-w-[240px]">&ldquo;{day.notes}&rdquo;</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinalBadge({ finalStatus }: { finalStatus: FinalDayState['finalStatus'] }) {
  if (finalStatus === 'CUTI') return <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9.5px] font-black text-amber-700">CUTI</span>;
  if (finalStatus === 'IZIN') return <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[9.5px] font-black text-teal-700">IZIN</span>;
  if (finalStatus === 'SAKIT') return <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9.5px] font-black text-rose-700">SAKIT</span>;
  if (finalStatus === 'OFF') return <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9.5px] font-black text-red-600">OFF</span>;
  if (finalStatus === 'PAGI' || finalStatus === 'MALAM' || finalStatus === 'WORK') {
    return <span className="inline-flex rounded-full border border-[#BBDFF5] bg-[#EAF4FC] px-2 py-0.5 text-[9.5px] font-black text-[#0066B3]">KERJA</span>;
  }
  return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9.5px] font-black text-slate-400">—</span>;
}

function KpiCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#DCE5EF] border-l-4 ${accent} px-4 py-3 shadow-xs`}>
      <div className="text-[9.5px] font-black tracking-wider uppercase text-slate-400">{label}</div>
      <div className="text-xl font-black text-[#092B57] tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[9px] font-semibold text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black transition cursor-pointer ${
        active ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Status FINAL per tanggal operator lain — overlay cuti disetujui menang. */
function dayFinalStatus(
  overlay: Record<string, 'CUTI' | 'IZIN' | 'SAKIT'>,
  opId: string,
  cell: RosterDayCell
): FinalDayKind | null {
  const lv = overlay[`${opId}|${cell.date}`];
  if (lv) return lv;
  if (cell.status === 'OFF' || cell.shiftKey === 'OFF') return 'OFF';
  if (cell.shiftKey === 'PAGI') return 'PAGI';
  if (cell.shiftKey === 'MALAM') return 'MALAM';
  return 'WORK';
}

const SHIFT_FILTERS = [
  { key: 'ALL', label: 'Semua Shift' },
  { key: 'PAGI', label: 'Pagi' },
  { key: 'MALAM', label: 'Malam' },
  { key: 'OFF', label: 'OFF' },
] as const;

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Semua Status' },
  { key: 'WORK', label: 'Kerja' },
  { key: 'OFF', label: 'OFF' },
  { key: 'CUTI', label: 'Cuti' },
  { key: 'IZIN', label: 'Izin' },
  { key: 'SAKIT', label: 'Sakit' },
] as const;

/**
 * Tab "Jadwal Operator" — READ-ONLY.
 * Menampilkan operator lain dan jadwalnya dengan sumber data yang sama
 * (getRosterMonth + overlay cuti/izin disetujui). Tidak ada aksi edit/approve.
 */
function JadwalOperatorPanel({
  year,
  month,
  monthLabel,
  operatorUsers,
  rosterOperators,
  leaveOverlay,
  navigate,
}: {
  year: number;
  month: number;
  monthLabel: string;
  operatorUsers: { id: string; name: string; username: string | null; employeeId: string; position: string }[];
  rosterOperators: RosterOperatorRow[];
  leaveOverlay: Record<string, 'CUTI' | 'IZIN' | 'SAKIT'>;
  navigate: (target: { year: number; month: number }) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [shiftFilter, setShiftFilter] = React.useState<'ALL' | 'PAGI' | 'MALAM' | 'OFF'>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'WORK' | 'OFF' | 'CUTI' | 'IZIN' | 'SAKIT'>('ALL');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const rowByOp = React.useMemo(() => new Map(rosterOperators.map((r) => [r.id, r])), [rosterOperators]);

  const finalStatusesOf = React.useCallback(
    (opId: string): (FinalDayKind | null)[] => {
      const row = rowByOp.get(opId);
      if (!row) return [];
      return row.days.map((d) => dayFinalStatus(leaveOverlay, opId, d));
    },
    [rowByOp, leaveOverlay]
  );
const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return operatorUsers.filter((op) => {
      if (q) {
        const haystack = `${op.name} ${op.username ?? ''} ${op.employeeId} ${op.position}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const statuses = finalStatusesOf(op.id);
      if (shiftFilter !== 'ALL' && !statuses.some((s) => s === shiftFilter)) return false;
      if (statusFilter !== 'ALL') {
        const ok = statuses.some((s) =>
          statusFilter === 'WORK' ? s === 'PAGI' || s === 'MALAM' || s === 'WORK' : s === statusFilter
        );
        if (!ok) return false;
      }
      return true;
    });
  }, [operatorUsers, query, shiftFilter, statusFilter, finalStatusesOf]);

  const selectedRow = selectedId ? rowByOp.get(selectedId) : undefined;
  const selectedUser = selectedId ? operatorUsers.find((u) => u.id === selectedId) : undefined;

  return (
    <div className="rounded-2xl border border-[#DCE5EF] bg-white shadow-xs p-4 sm:p-5">
      {/* Header + navigasi bulan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">Jadwal Operator</div>
          <div className="text-lg font-black text-[#092B57] tracking-tight">{monthLabel}</div>
          <p className="text-[10.5px] font-semibold text-slate-400">
            Read-only — Operator hanya dapat melihat jadwal, tidak dapat mengubah.
          </p>
        </div>
        <div className="flex rounded-lg border border-[#CBD7E6] overflow-hidden shrink-0 self-start">
          <button onClick={() => navigate(prevMonth(year, month))} className="p-2 text-slate-500 hover:bg-slate-50 cursor-pointer" aria-label="Bulan Sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const now = new Date();
              navigate({ year: now.getFullYear(), month: now.getMonth() + 1 });
            }}
            className="px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-x border-[#CBD7E6] cursor-pointer whitespace-nowrap"
          >
            Bulan Ini
          </button>
          <button onClick={() => navigate(nextMonth(year, month))} className="p-2 text-slate-500 hover:bg-slate-50 cursor-pointer" aria-label="Bulan Berikutnya">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, username, atau NIP operator..."
            className="w-full rounded-xl border border-[#CBD7E6] py-2 pl-8 pr-3 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </label>
        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value as typeof shiftFilter)}
          className="rounded-xl border border-[#CBD7E6] px-2.5 py-2 text-xs font-bold text-slate-600"
          aria-label="Filter Shift"
        >
          {SHIFT_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-[#CBD7E6] px-2.5 py-2 text-xs font-bold text-slate-600"
          aria-label="Filter Status"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-2 text-[10px] font-semibold text-slate-400">Menampilkan {filtered.length} dari {operatorUsers.length} operator aktif.</div>
<div className="mt-4 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Daftar operator yang cocok */}
        <div className="max-h-[540px] space-y-1.5 overflow-y-auto rounded-xl border border-[#EDF2F7] p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs font-bold text-slate-400">Tidak ada operator yang cocok.</p>
          )}
          {filtered.map((op) => {
            const statuses = finalStatusesOf(op.id);
            const c = {
              pagi: statuses.filter((s) => s === 'PAGI').length,
              malam: statuses.filter((s) => s === 'MALAM').length,
              off: statuses.filter((s) => s === 'OFF').length,
              leave: statuses.filter((s) => s === 'CUTI' || s === 'IZIN' || s === 'SAKIT').length,
            };
            return (
              <button
                key={op.id}
                onClick={() => setSelectedId(op.id)}
                className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition ${
                  selectedId === op.id ? 'border-[#0066B3] bg-[#EAF4FC]' : 'border-[#E4EBF3] bg-white hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-[#0B3568]">{op.name}</div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {op.employeeId} · {op.position || '-'}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-black text-slate-500">
                  <span className="rounded bg-[#EAF4FC] px-1.5 py-0.5 text-[#0066B3]">Pg {c.pagi}</span>
                  <span className="rounded bg-[#0F315A] px-1.5 py-0.5 text-white">Mlm {c.malam}</span>
                  <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">Off {c.off}</span>
                  {c.leave > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Ct/Iz {c.leave}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail jadwal operator terpilih (read-only) */}
        <div>
          {!selectedUser ? (
            <div className="rounded-xl border border-dashed border-[#CBD7E6] px-6 py-14 text-center text-xs font-bold text-slate-400">
              Pilih operator untuk melihat jadwalnya (read-only).
            </div>
          ) : !selectedRow || selectedRow.days.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#CBD7E6] px-6 py-14 text-center text-xs font-bold text-slate-400">
              {selectedUser.name} belum memiliki jadwal pada {monthLabel}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#DCE5EF]">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead>
                  <tr className="bg-[#EDF4FB] text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2.5 font-black">Tanggal</th>
                    <th className="px-3 py-2.5 font-black">Hari</th>
                    <th className="px-3 py-2.5 font-black">Shift</th>
                    <th className="px-3 py-2.5 font-black">Jam</th>
                    <th className="px-3 py-2.5 font-black">Status</th>
                    <th className="px-3 py-2.5 font-black">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF2F7]">
                  {selectedRow.days.map((cell) => {
                    const fin = dayFinalStatus(leaveOverlay, selectedUser.id, cell);
                    return (
                      <tr key={cell.date} className="hover:bg-[#F8FBFE]">
                        <td className="px-3 py-2 font-mono font-bold text-[#0B3568]">{cell.date}</td>
                        <td className="px-3 py-2 font-semibold text-slate-500">{cell.weekday}, {cell.date.slice(8, 10)} {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][month - 1]}</td>
                        <td className="px-3 py-2 font-bold text-[#123D70]">{fin === 'OFF' ? '—' : (cell.shiftName ?? '—')}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{fin === 'OFF' ? '—' : cell.startTime && cell.endTime ? `${cell.startTime} - ${cell.endTime}` : '—'}</td>
                        <td className="px-3 py-2"><FinalBadge finalStatus={fin} /></td>
                        <td className="px-3 py-2 text-[10.5px] italic text-slate-500">{cell.notes ? <span className="block max-w-[220px]">&ldquo;{cell.notes}&rdquo;</span> : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
