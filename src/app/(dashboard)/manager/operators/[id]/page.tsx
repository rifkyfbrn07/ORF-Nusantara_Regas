import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { getOperatorFullDossier } from '@/server/services/operatorService';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { formatJakartaTime } from '@/lib/time';
import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  Clock,
  Calendar,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

export default async function OperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['MANAGER']);
  const resolvedParams = await params;
  const dossier = await getOperatorFullDossier(resolvedParams.id);

  if (!dossier) {
    notFound();
  }

  const { user, todayStatus, attendances, leaveRequests, schedules, hsseLogs } = dossier;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/manager/operators"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123E7A] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Master Roster Operator</span>
        </Link>
      </div>

      {/* Operator Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={64} className="shadow-md" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{user.name}</h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {user.isActive ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-0.5 font-mono">
              {user.employeeId} • <span className="font-sans font-bold text-slate-800">{user.position}</span>
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <div className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-1 font-mono">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                <span>{user.department?.name || 'Operations'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Operational Status Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[220px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Status Operasional Hari Ini
          </span>
          <div className="mt-1.5">
            <StatusBadge
              status={todayStatus.status}
              label={todayStatus.statusLabel}
              size="lg"
            />
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-medium">
            Shift: <b>{todayStatus.shift?.name || 'Tidak Terjadwal / OFF'}</b>
          </p>
        </div>
      </div>

      {/* Grid of Histories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#123E7A]" />
              <h3 className="font-extrabold text-sm text-slate-900">Riwayat Absensi Terakhir</h3>
            </div>
            <span className="text-xs text-slate-400">{attendances.length} catatan</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {attendances.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada data absensi.</p>
            ) : (
              attendances.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{a.date}</span>
                    <p className="text-[11px] text-slate-500">{a.schedule?.shift?.name || 'Shift Operasional'}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={a.status} size="sm" />
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      In: {formatJakartaTime(a.checkIn)} | Out: {formatJakartaTime(a.checkOut)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Schedule Roster */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#123E7A]" />
              <h3 className="font-extrabold text-sm text-slate-900">Penugasan Jadwal Kerja</h3>
            </div>
            <span className="text-xs text-slate-400">{schedules.length} jadwal</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {schedules.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada jadwal penugasan.</p>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{s.date}</span>
                    <p className="text-[11px] text-slate-500">{s.location.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800">{s.shift.name}</span>
                    <p className="text-[10px] font-mono text-slate-500">{s.shift.startTime} - {s.shift.endTime} WIB</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leave & Permission History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#123E7A]" />
              <h3 className="font-extrabold text-sm text-slate-900">Pengajuan Cuti & Izin</h3>
            </div>
            <span className="text-xs text-slate-400">{leaveRequests.length} pengajuan</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {leaveRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada pengajuan cuti/izin.</p>
            ) : (
              leaveRequests.map((l) => (
                <div key={l.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 uppercase">{l.type}</span>
                      <span className="font-mono text-slate-500">{l.startDate} s/d {l.endDate}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">&ldquo;{l.reason}&rdquo;</p>
                  </div>
                  <StatusBadge status={l.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* HSSE Safety Records */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">Aktivitas HSSE Safety Checklist</h3>
            </div>
            <span className="text-xs text-slate-400">{hsseLogs.length} checklist</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {hsseLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada rekam keselamatan HSSE.</p>
            ) : (
              hsseLogs.map((h) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{h.date}</span>
                    <p className="text-[11px] text-slate-500">{h.shift.name} • {h.items.length} Parameter APD/K3</p>
                  </div>
                  <StatusBadge status="COMPLETED" label="VERIFIED" size="sm" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
