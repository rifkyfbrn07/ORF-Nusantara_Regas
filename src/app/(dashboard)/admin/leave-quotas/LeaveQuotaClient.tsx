'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveLeaveQuotaAction } from '@/server/actions/leaveQuotaActions';

type Quota = { id: string; team: string; date: string; maxOperators: number; approvedCount: number; remaining: number };

export default function LeaveQuotaClient({ teams, quotas }: { teams: string[]; quotas: Quota[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [team, setTeam] = useState(teams[0] || '');
  const [date, setDate] = useState('');
  const [maxOperators, setMaxOperators] = useState('');
  const save = () => startTransition(async () => {
    const result = await saveLeaveQuotaAction({ team, date, maxOperators: Number(maxOperators) });
    if (!result.success) { toast.error(result.error || 'Gagal menyimpan kuota.'); return; }
    toast.success('Kuota cuti tersimpan.'); router.refresh();
  });
  return <main className="mx-auto max-w-5xl space-y-5 pb-12">
    <header><p className="text-xs font-bold uppercase tracking-wider text-[#0066B3]">ADMIN · KEBIJAKAN CUTI</p><h1 className="mt-1 text-2xl font-black text-[#092B57]">Kuota Cuti Harian</h1><p className="mt-1 text-sm text-slate-600">Tetapkan kuota per tim dan tanggal. Kuota kosong berarti belum ada batas yang dikonfigurasi.</p></header>
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <label className="text-xs font-semibold text-slate-700">Tim<select value={team} onChange={(e) => setTeam(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">{teams.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-700">Tanggal<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-xs font-semibold text-slate-700">Maksimal operator<input type="number" min="1" step="1" value={maxOperators} onChange={(e) => setMaxOperators(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <button type="button" disabled={pending || !team || !date || Number(maxOperators) < 1} onClick={save} className="rounded-lg bg-[#0B3568] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Menyimpan…' : 'Simpan kuota'}</button>
    </section>
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-3">Tim</th><th className="p-3">Tanggal</th><th className="p-3">Kuota</th><th className="p-3">Disetujui</th><th className="p-3">Sisa</th></tr></thead>
        <tbody>{quotas.length ? quotas.map((quota) => <tr key={quota.id} className="border-t border-slate-100"><td className="p-3 font-semibold">{quota.team}</td><td className="p-3">{quota.date}</td><td className="p-3">{quota.maxOperators}</td><td className="p-3">{quota.approvedCount}</td><td className="p-3">{quota.remaining}</td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Belum ada kuota yang diatur untuk bulan ini.</td></tr>}</tbody>
      </table>
    </section>
  </main>;
}
