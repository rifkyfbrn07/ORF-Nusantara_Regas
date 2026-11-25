'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { setGlobalTeamLeaderAction, updateTeamApprovalConfigAction } from '@/server/actions/approvalConfigActions';

type ApprovalUser = {
  id: string;
  name: string;
  username: string | null;
  role: 'ADMIN' | 'MANAGER' | 'LEAD_OPERATOR' | 'OPERATOR';
  isActive: boolean;
};

type TeamConfig = {
  code: string;
  name: string;
  reviewerId: string | null;
  teamLeadId: string | null;
  managerId: string | null;
  leadOperatorId: string | null;
};

type ConfigForm = {
  reviewerId: string;
  teamLeadId: string;
  managerId: string;
  leadOperatorId: string;
};

function createForms(teamCodes: string[], configs: TeamConfig[]): Record<string, ConfigForm> {
  const configByTeam = new Map(configs.map((config) => [config.code, config]));
  return Object.fromEntries(teamCodes.map((team) => {
    const config = configByTeam.get(team);
    return [team, {
      reviewerId: config?.reviewerId || '',
      teamLeadId: config?.teamLeadId || '',
      managerId: config?.managerId || '',
      leadOperatorId: config?.leadOperatorId || '',
    }];
  }));
}

function accountIsValid(
  id: string,
  stage: 'reviewer' | 'teamLead' | 'manager',
  users: ApprovalUser[],
  managerId?: string,
) {
  const user = users.find((item) => item.id === id);
  if (!user || !user.isActive || user.role === 'ADMIN') return false;
  if (stage === 'teamLead' && id === managerId) return false;
  return stage !== 'manager' || user.role === 'MANAGER';
}

export function ApprovalTeamConfigPanel({
  teamCodes,
  configs,
  users,
  globalTeamLeaderId,
  unassignedOperatorCount,
}: {
  teamCodes: string[];
  configs: TeamConfig[];
  users: ApprovalUser[];
  globalTeamLeaderId: string | null;
  unassignedOperatorCount: number;
}) {
  const router = useRouter();
  const [forms, setForms] = useState(() => createForms(teamCodes, configs));
  const [pending, startTransition] = useTransition();
  const [globalLeaderValue, setGlobalLeaderValue] = useState(globalTeamLeaderId || '');
  const configByTeam = useMemo(() => new Map(configs.map((config) => [config.code, config])), [configs]);
  const approverOptions = useMemo(
    () => users.filter((user) => user.isActive && user.role !== 'ADMIN'),
    [users]
  );
  const managerOptions = useMemo(
    () => approverOptions.filter((user) => user.role === 'MANAGER'),
    [approverOptions]
  );
  const globalLeaderOptions = useMemo(() => users.filter((user) => user.isActive && user.role !== 'ADMIN' && user.name.toLocaleLowerCase('id-ID').replace(/\./g, '').replace(/\s+/g, ' ').trim() === 'm t ibrahim'), [users]);
  const leadOperatorOptions = useMemo(() => users.filter((user) => user.isActive && user.role === 'LEAD_OPERATOR'), [users]);

  const setField = (team: string, field: keyof ConfigForm, value: string) => {
    setForms((current) => ({
      ...current,
      [team]: { ...current[team], [field]: value },
    }));
  };

  const save = (team: string) => {
    const form = forms[team];
    if (!form) return;
    startTransition(async () => {
      const result = await updateTeamApprovalConfigAction({ team, ...form });
      if (!result.success) {
        toast.error(result.error || 'Gagal memperbarui pemetaan approver.');
        return;
      }
      toast.success(`Pemetaan approver Tim ${team} berhasil disimpan.`);
      router.refresh();
    });
  };

  const saveGlobalLeader = () => startTransition(async () => {
    const result = await setGlobalTeamLeaderAction(globalLeaderValue);
    if (!result.success) { toast.error(result.error || 'Gagal memetakan Team Leader.'); return; }
    toast.success('Global Team Leader berhasil dipetakan untuk seluruh tim.');
    router.refresh();
  });

  const renderSelect = (
    team: string,
    field: keyof ConfigForm,
    label: string,
    options: ApprovalUser[]
  ) => {
    const value = forms[team]?.[field] || '';
    const selectedAccount = users.find((user) => user.id === value);
    return (
      <label className="block text-[11px] font-bold text-slate-700">
        {label}
        <select
          value={value}
          onChange={(event) => setField(team, field, event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium"
        >
          <option value="">Belum dipetakan</option>
          {selectedAccount && !options.some((option) => option.id === selectedAccount.id) && (
            <option value={selectedAccount.id}>
              {selectedAccount.name} (@{selectedAccount.username || 'tanpa-username'}) — tidak valid
            </option>
          )}
          {options.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} (@{user.username || 'tanpa-username'}) · {user.role}
            </option>
          ))}
        </select>
      </label>
    );
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-[#0066B3]">LEAVE APPROVAL MAPPING</p>
        <h2 className="mt-1 text-sm font-black text-[#092B57]">Pemetaan Reviewer, Team Lead, dan Manager</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Pilih akun secara eksplisit. Hubungan disimpan menggunakan User ID; akun Admin tidak dapat menjadi approver.
          Reviewer dan Team Lead merupakan penugasan approval terpisah dari role akun utama.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
        <h3 className="text-xs font-black text-[#092B57]">Global Team Leader — semua tim</h3>
        <p className="mt-1 text-[10px] text-slate-600">Akun yang dipetakan harus bernama persis M. T. Ibrahim dan berstatus aktif non-Admin.</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <select value={globalLeaderValue} onChange={(event) => setGlobalLeaderValue(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
            <option value="">Belum dipetakan</option>
            {globalLeaderOptions.map((user) => <option key={user.id} value={user.id}>{user.name} (@{user.username || 'tanpa-username'})</option>)}
          </select>
          <button type="button" disabled={pending || !globalLeaderValue} onClick={saveGlobalLeader} className="rounded-lg bg-[#0B3568] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Simpan Global Team Leader</button>
        </div>
        {globalLeaderOptions.length === 0 && <p className="mt-2 text-[10px] font-semibold text-amber-800">Akun M. T. Ibrahim tidak ditemukan pada daftar User Management. Pemetaan belum diubah.</p>}
      </div>

      {unassignedOperatorCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {unassignedOperatorCount} akun operator belum memiliki kode tim roster; pengajuan cuti dari akun tersebut
          tidak dapat dimulai sampai timnya dipetakan.
        </div>
      )}

      {teamCodes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
          Belum ada kode tim pada data operator untuk dikonfigurasi.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {teamCodes.map((team) => {
            const config = configByTeam.get(team);
            const form = forms[team] || { reviewerId: '', teamLeadId: '', managerId: '', leadOperatorId: '' };
            const missing = [
              !globalTeamLeaderId || !globalLeaderOptions.some((user) => user.id === globalTeamLeaderId) ? 'Global Team Lead' : null,
              !leadOperatorOptions.some((user) => user.id === form.leadOperatorId) ? 'Lead Operator' : null,
              !accountIsValid(form.managerId, 'manager', users) ? 'Manager' : null,
            ].filter((label): label is string => Boolean(label));

            return (
              <div key={team} className="rounded-xl border border-slate-200 p-3.5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-[#092B57]">{config?.name || `Tim ${team}`}</h3>
                    <p className="text-[10px] font-mono text-slate-500">Kode tim: {team}</p>
                  </div>
                  {missing.length ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                      <AlertCircle className="h-3 w-3" /> Belum lengkap
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle className="h-3 w-3" /> Lengkap
                    </span>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {renderSelect(team, 'reviewerId', 'Reviewer', approverOptions)}
                  {renderSelect(team, 'teamLeadId', 'Team Lead', approverOptions)}
                  {renderSelect(team, 'managerId', 'Manager (role MANAGER)', managerOptions)}
                  {renderSelect(team, 'leadOperatorId', 'Lead Operator (role LEAD_OPERATOR)', leadOperatorOptions)}
                </div>
                {missing.length > 0 && (
                  <p className="mt-2 text-[10px] font-semibold text-amber-800">
                    Belum valid: {missing.join(', ')}. Pengajuan cuti baru belum dapat diajukan. Pengajuan yang sudah menunggu tahap Team Lead tetap tersimpan; setelah mapping dilengkapi, Team Lead akan menerima notifikasi dan dapat memprosesnya.
                  </p>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save(team)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0B3568] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#092B57] disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> Simpan Pemetaan Tim
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
