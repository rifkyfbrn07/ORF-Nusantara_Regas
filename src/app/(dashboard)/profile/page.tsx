import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { ProfileClient } from './ProfileClient';

export default async function ProfilePage() {
  const sessionUser = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { department: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Pengaturan Akun & Keamanan
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Profil Pengguna
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Informasi identitas personil operasional, penugasan departemen, dan pembaruan kata sandi akun
        </p>
      </div>

      <ProfileClient user={user} />
    </div>
  );
}
