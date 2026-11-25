'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changePasswordAction } from '@/server/actions/profileActions';

export default function ChangePasswordForm({ name }: { name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <form className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4" onSubmit={(event) => {
      event.preventDefault(); setError('');
      if (password !== confirmation) { setError('Konfirmasi kata sandi tidak sama.'); return; }
      startTransition(async () => {
        const result = await changePasswordAction({ newPassword: password });
        if (result.success) { router.replace(result.redirectTo || '/'); router.refresh(); }
        else setError(result.error || 'Kata sandi gagal diperbarui.');
      });
    }}>
      <div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Keamanan akun</p><h1 className="mt-1 text-xl font-bold text-slate-900">Buat kata sandi baru</h1><p className="mt-2 text-sm text-slate-600">Halo {name}. Ganti kata sandi awal untuk melanjutkan ke aplikasi.</p></div>
      <label className="block text-sm font-medium text-slate-700">Kata sandi baru<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Ulangi kata sandi<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-[#0066B3] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Menyimpan…' : 'Simpan kata sandi dan lanjutkan'}</button>
    </form>
  </main>;
}
