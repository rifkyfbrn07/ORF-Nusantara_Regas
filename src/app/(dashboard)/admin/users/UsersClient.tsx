'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Edit2, Filter, HardHat, KeyRound, MoreVertical, Power, Search, Shield, Trash2, Upload, UserCheck, UserCog, UserPlus, UserX, Users } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { createAdminUserAction, deleteAdminUserAction, resetAdminUserPasswordAction, toggleAdminUserStatusAction, updateAdminUserAction } from '@/server/actions/adminUserActions';

type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';
type CreateUserRole = 'MANAGER' | 'OPERATOR';

type UserItem = {
  id: string;
  name: string;
<<<<<<< HEAD
  username: string;
=======
  username?: string | null;
>>>>>>> f728c28 (coba)
  email: string | null;
  employeeId: string;
  role: UserRole;
  position: string;
  phone: string | null;
  departmentId: string | null;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: Date | string;
  department: { name: string } | null;
};

type Department = { id: string; name: string };

type UserForm = {
  name: string;
  username: string;
  email: string;
  employeeId: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  position: string;
  departmentId: string;
  phone: string;
  avatarUrl: string;
  isActive: boolean;
};

<<<<<<< HEAD
const EMPTY_FORM: UserForm = { name: '', username: '', email: '', employeeId: '', password: '', confirmPassword: '', role: 'OPERATOR', position: '', departmentId: '', phone: '', avatarUrl: '', isActive: true };
=======
const blankUser = {
  name: '',
  email: '',
  employeeId: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: 'OPERATOR' as const,
  position: '',
  departmentId: '',
  phone: '',
  avatarUrl: '',
  isActive: true,
};
>>>>>>> f728c28 (coba)

function toForm(user: UserItem): UserForm {
  return { name: user.name, username: user.username, email: user.email || '', employeeId: user.employeeId, password: '', confirmPassword: '', role: user.role, position: user.position, departmentId: user.departmentId || '', phone: user.phone || '', avatarUrl: user.avatarUrl || '', isActive: user.isActive };
}

export default function UsersClient({ users, departments }: { users: UserItem[]; departments: Department[] }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
<<<<<<< HEAD
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      const haystack = `${user.username} ${user.name} ${user.employeeId} ${user.email || ''} ${user.position}`.toLowerCase();
      return (!q || haystack.includes(q)) && (!roleFilter || user.role === roleFilter) && (!statusFilter || String(user.isActive) === statusFilter);
=======
    return users.filter((u) => {
      const matchQuery = `${u.name} ${u.username || ''} ${u.email || ''} ${u.employeeId} ${u.position}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchActive = !activeFilter || String(u.isActive) === activeFilter;
      return matchQuery && matchRole && matchActive;
>>>>>>> f728c28 (coba)
    });
  }, [users, query, roleFilter, statusFilter]);

  const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const openCreate = () => { setForm(EMPTY_FORM); setEditingUser(null); setCreating(true); };
  const openEdit = (user: UserItem) => { setForm(toForm(user)); setEditingUser(user); setCreating(false); setMenuId(null); };
  const closeForm = () => { setCreating(false); setEditingUser(null); setForm(EMPTY_FORM); };

<<<<<<< HEAD
  const readAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Foto harus JPG, JPEG, PNG, atau WebP.');
    if (file.size > 2 * 1024 * 1024) return toast.error('Ukuran foto maksimal 2 MB.');
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setField('avatarUrl', reader.result); };
    reader.readAsDataURL(file);
  };

  const submitUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!form.name.trim() || !username || !form.employeeId.trim() || !form.position.trim()) return toast.error('Nama, username, Employee ID, dan posisi wajib diisi.');
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) return toast.error('Username harus 3–30 karakter dan hanya berisi huruf, angka, titik, garis bawah, atau strip.');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return toast.error('Format email tidak valid.');
    if (creating && form.password.length < 8) return toast.error('Password minimal 8 karakter.');
    if (creating && form.password !== form.confirmPassword) return toast.error('Konfirmasi password tidak sama.');

    startTransition(async () => {
      const role: UserRole = form.role;
      const result = editingUser
        ? await updateAdminUserAction({ id: editingUser.id, name: form.name.trim(), username, email: form.email.trim(), employeeId: form.employeeId.trim(), role, position: form.position.trim(), departmentId: form.departmentId || undefined, phone: form.phone.trim() || undefined, avatarUrl: form.avatarUrl || undefined, isActive: form.isActive })
        : await createAdminUserAction({ name: form.name.trim(), username, email: form.email.trim(), employeeId: form.employeeId.trim(), role: (role === 'ADMIN' ? 'OPERATOR' : role) as CreateUserRole, position: form.position.trim(), departmentId: form.departmentId || undefined, phone: form.phone.trim() || undefined, avatarUrl: form.avatarUrl || undefined, isActive: form.isActive, password: form.password, confirmPassword: form.confirmPassword });
      if (result.success) { toast.success(editingUser ? 'Data akun berhasil diperbarui.' : 'Akun pengguna berhasil dibuat.'); closeForm(); }
      else toast.error(result.error || 'Gagal memproses akun.');
=======
    const inputData = {
      name: String(formObj.name || ''),
      username: String(formObj.username || ''),
      email: String(formObj.email || ''),
      employeeId: String(formObj.employeeId || ''),
      role: (formObj.role || 'OPERATOR') as 'ADMIN' | 'MANAGER' | 'OPERATOR',
      position: String(formObj.position || ''),
      departmentId: String(formObj.departmentId || ''),
      phone: String(formObj.phone || ''),
      avatarUrl: String(formObj.avatarUrl || ''),
      isActive: formObj.isActive === 'on',
      password: String(formObj.password || ''),
      confirmPassword: String(formObj.confirmPassword || ''),
    };

    startTransition(async () => {
      const res = editingUser
        ? await updateAdminUserAction({
            id: editingUser.id,
            name: inputData.name,
            username: inputData.username || editingUser.username || '',
            email: inputData.email || undefined,
            employeeId: inputData.employeeId,
            role: inputData.role,
            position: inputData.position,
            departmentId: inputData.departmentId || undefined,
            phone: inputData.phone || undefined,
            avatarUrl: inputData.avatarUrl || undefined,
            isActive: inputData.isActive,
          })
        : await createAdminUserAction({
            name: inputData.name,
            username: inputData.username,
            email: inputData.email || undefined,
            employeeId: inputData.employeeId,
            role: inputData.role === 'ADMIN' ? 'MANAGER' : inputData.role,
            position: inputData.position,
            departmentId: inputData.departmentId || undefined,
            phone: inputData.phone || undefined,
            avatarUrl: inputData.avatarUrl || undefined,
            isActive: inputData.isActive,
            password: inputData.password,
            confirmPassword: inputData.confirmPassword,
          });

      if (res.success) {
        toast.success(editingUser ? 'Data akun berhasil diperbarui' : 'Akun pengguna baru berhasil dibuat');
        setEditingUser(null);
        setIsCreating(false);
      } else {
        toast.error(res.error || 'Gagal memproses permintaan');
      }
>>>>>>> f728c28 (coba)
    });
  };

  const toggleStatus = (user: UserItem) => startTransition(async () => {
    const result = await toggleAdminUserStatusAction(user.id);
    if (result.success) toast.success(`Akun @${user.username} berhasil ${user.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`); else toast.error(result.error || 'Gagal mengubah status.');
    setMenuId(null);
  });

  const resetPasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetUser || resetPassword.length < 8) return toast.error('Password minimal 8 karakter.');
    startTransition(async () => {
      const result = await resetAdminUserPasswordAction({ id: resetUser.id, password: resetPassword });
      if (result.success) { toast.success(`Password @${resetUser.username} berhasil direset.`); setResetUser(null); setResetPassword(''); } else toast.error(result.error || 'Gagal mereset password.');
    });
  };

  const confirmDelete = () => {
    if (!deleteUser) return;
    startTransition(async () => {
      const result = await deleteAdminUserAction(deleteUser.id);
      if (result.success) { toast.success(`Akun @${deleteUser.username} dinonaktifkan.`); setDeleteUser(null); } else toast.error(result.error || 'Gagal menghapus akun.');
      setMenuId(null);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 md:flex-row md:items-center md:justify-between">
        <div><div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#0066B3]"><Users className="h-3.5 w-3.5" /> USER MANAGEMENT</div><h1 className="text-xl font-black tracking-tight text-[#092B57] sm:text-2xl">Kelola Pengguna</h1><p className="mt-1 text-xs text-slate-500">Kelola username login, role, profil, status, dan akses personel.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3568] px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#092B57]"><UserPlus className="h-4 w-4" />Tambah Pengguna</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total User" value={users.length} icon={Users} variant="total" />
        <KpiCard label="Admin" value={users.filter((u) => u.role === 'ADMIN').length} icon={Shield} variant="navy" />
        <KpiCard label="Manager" value={users.filter((u) => u.role === 'MANAGER').length} icon={UserCog} variant="blue" />
        <KpiCard label="Operator" value={users.filter((u) => u.role === 'OPERATOR').length} icon={HardHat} variant="blue" />
        <KpiCard label="Aktif" value={users.filter((u) => u.isActive).length} icon={UserCheck} variant="green" />
        <KpiCard label="Nonaktif" value={users.filter((u) => !u.isActive).length} icon={UserX} variant="red" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4"><div className="flex flex-col gap-2 md:flex-row"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari username, nama, atau employee ID..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-[#1769AA] focus:bg-white focus:ring-2 focus:ring-[#1769AA]/10" /></div><div className="flex gap-2"><div className="relative"><Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-xs font-semibold text-slate-700"><option value="">Semua Role</option><option value="ADMIN">ADMIN</option><option value="MANAGER">MANAGER</option><option value="OPERATOR">OPERATOR</option></select></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700"><option value="">Semua Status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div></div></div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"><div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left"><thead className="bg-[#F8FAFC] text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Pengguna</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Employee ID</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
        {filteredUsers.map((user) => <tr key={user.id} className="transition hover:bg-slate-50/80"><td className="px-4 py-3"><div className="flex items-center gap-3"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={38} /><div className="min-w-0"><p className="truncate text-xs font-bold text-[#092B57]">{user.name}</p><p className="truncate text-[10px] text-slate-500">{user.email || 'Email belum diisi'}</p></div></div></td><td className="px-4 py-3"><span className="font-mono text-xs font-bold text-[#1769AA]">@{user.username}</span></td><td className="px-4 py-3"><span className="font-mono text-xs font-bold text-slate-700">{user.employeeId}</span></td><td className="px-4 py-3"><StatusBadge status={user.role} label={user.role} size="sm" /></td><td className="px-4 py-3 text-xs text-slate-600">{user.department?.name || '—'}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${user.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />{user.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 text-right"><div className="relative inline-flex"><button type="button" onClick={() => setMenuId(menuId === user.id ? null : user.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Aksi ${user.name}`}><MoreVertical className="h-4 w-4" /></button>{menuId === user.id && <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl"><button type="button" onClick={() => openEdit(user)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50"><Edit2 className="h-3.5 w-3.5" />Edit Pengguna</button><button type="button" onClick={() => { setResetUser(user); setResetPassword(''); setMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50"><KeyRound className="h-3.5 w-3.5" />Reset Password</button>{user.role !== 'ADMIN' && <button type="button" onClick={() => toggleStatus(user)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50"><Power className="h-3.5 w-3.5" />{user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>}{user.role !== 'ADMIN' && <button type="button" onClick={() => { setDeleteUser(user); setMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Hapus Akun</button>}</div>}</div></td></tr>)}
      </tbody></table></div>{filteredUsers.length === 0 && <div className="px-4 py-12 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">Pengguna tidak ditemukan</p><p className="mt-1 text-xs text-slate-400">Coba username, nama, atau Employee ID yang lain.</p></div>}<div className="border-t border-slate-100 px-4 py-3 text-[10px] font-semibold text-slate-400">Menampilkan {filteredUsers.length} dari {users.length} akun.</div></div>

      <Modal open={creating || Boolean(editingUser)} onClose={closeForm} title={editingUser ? `Edit Pengguna — @${editingUser.username}` : 'Tambah Pengguna'} eyebrow="USER ACCESS & IDENTITY" size="xl" footer={<div className="flex justify-end gap-2"><button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Batal</button><button form="user-form" type="submit" disabled={pending} className="rounded-xl bg-[#0B3568] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{pending ? 'Menyimpan...' : 'Simpan'}</button></div>}>
        <form id="user-form" onSubmit={submitUser} className="space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">Nama Lengkap *<input required value={form.name} onChange={(e) => setField('name', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-700">Username *<input required minLength={3} maxLength={30} value={form.username} onChange={(e) => setField('username', e.target.value.toLowerCase())} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm" placeholder="andi01" /></label>
          <label className="text-xs font-semibold text-slate-700">Employee ID *<input required value={form.employeeId} onChange={(e) => setField('employeeId', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm" /></label>
          <label className="text-xs font-semibold text-slate-700">Role *<select value={form.role} disabled={editingUser?.role === 'ADMIN'} onChange={(e) => setField('role', e.target.value as UserRole)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-100"><option value="OPERATOR">OPERATOR</option><option value="MANAGER">MANAGER</option>{editingUser?.role === 'ADMIN' && <option value="ADMIN">ADMIN</option>}</select></label>
          <label className="text-xs font-semibold text-slate-700">Posisi *<input required value={form.position} onChange={(e) => setField('position', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-700">Department<select value={form.departmentId} onChange={(e) => setField('departmentId', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Tanpa Department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700">Phone<input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-700">Email (opsional)<input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#092B57]"><Upload className="h-4 w-4 text-[#1769AA]" />Foto Profil</div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><UserAvatar name={form.name || 'User'} avatarUrl={form.avatarUrl || null} size={56} /><div className="flex-1"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => readAvatar(e.target.files?.[0])} className="w-full text-xs" /><p className="mt-1 text-[10px] text-slate-400">JPG/JPEG/PNG/WebP, maksimal 2 MB.</p></div>{form.avatarUrl && <button type="button" onClick={() => setField('avatarUrl', '')} className="text-xs font-bold text-red-600">Hapus foto</button>}</div></div>
        {creating && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Password *<input required minLength={8} type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-semibold text-slate-700">Konfirmasi Password *<input required minLength={8} type="password" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label></div>}
        <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"><span><span className="block text-xs font-bold">Status Akun</span><span className="text-[10px] text-slate-400">Nonaktif tidak dapat login.</span></span><input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="h-4 w-4 accent-[#0B3568]" /></label></form>
      </Modal>

      <Modal open={Boolean(resetUser)} onClose={() => setResetUser(null)} title="Reset Password" eyebrow="SECURITY" size="sm" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setResetUser(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Batal</button><button form="reset-password-form" type="submit" disabled={pending} className="rounded-xl bg-[#0B3568] px-4 py-2 text-xs font-bold text-white">Reset Password</button></div>}><form id="reset-password-form" onSubmit={resetPasswordSubmit} className="space-y-3"><p className="text-xs text-slate-500">Password baru untuk <strong>@{resetUser?.username}</strong>.</p><label className="text-xs font-semibold">Password Baru<input autoFocus required minLength={8} type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label></form></Modal>

<<<<<<< HEAD
      <Modal open={Boolean(deleteUser)} onClose={() => setDeleteUser(null)} title="Hapus Akun" eyebrow="DANGER ZONE" size="sm" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteUser(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Batal</button><button type="button" onClick={confirmDelete} disabled={pending} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white">Nonaktifkan Akun</button></div>}><div className="rounded-xl border border-red-200 bg-red-50 p-3"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><p className="text-xs leading-relaxed text-red-800">Akun <strong>@{deleteUser?.username}</strong> akan dinonaktifkan. Data historis tetap aman dan akun tidak dapat login.</p></div></div></Modal>
=======
          <select
            className="px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-semibold"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Semua Role</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="OPERATOR">OPERATOR</option>
          </select>

          <select
            className="px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-semibold"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* 4. Users Table (Desktop Table + Mobile Card List) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#EDF4FB] text-[#64748B]">
                <th className="py-3.5 px-5 font-bold">PENGGUNA</th>
                <th className="py-3.5 px-3 font-bold">EMPLOYEE ID</th>
                <th className="py-3.5 px-3 font-bold">ROLE</th>
                <th className="py-3.5 px-3 font-bold">JABATAN</th>
                <th className="py-3.5 px-3 font-bold">DEPARTEMEN</th>
                <th className="py-3.5 px-3 font-bold">STATUS</th>
                <th className="py-3.5 px-3 font-bold">TERDAFTAR</th>
                <th className="py-3.5 px-5 font-bold text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Tidak ada akun pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FBFE] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={32} className="ring-1 ring-slate-200" />
                        <div>
                          <p className="font-bold text-[#0F315A] leading-tight">{u.name}</p>
                          <p className="text-[11px] text-[#64748B]">@{u.username || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-600 text-[11px]">
                      {u.employeeId}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-full border ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : u.role === 'MANAGER'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-[#0066B3] border-blue-200'
                        }`}
                      >
                        {u.role === 'ADMIN' && <Shield className="h-3 w-3" />}
                        {u.role === 'MANAGER' && <UserCog className="h-3 w-3" />}
                        {u.role === 'OPERATOR' && <HardHat className="h-3 w-3" />}
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#0F172A] font-semibold">{u.position}</td>
                    <td className="py-3.5 px-3 text-[#64748B]">
                      {u.department?.name || '—'}
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge
                        status={u.isActive ? 'APPROVED' : 'REJECTED'}
                        label={u.isActive ? 'AKTIF' : 'NONAKTIF'}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-3 text-[#64748B] font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="relative inline-block text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreating(false);
                              setEditingUser(u);
                            }}
                            className="p-1.5 text-[#0066B3] hover:bg-[#EAF4FC] rounded-lg transition cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewResetPassword('');
                            }}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === u.id ? null : u.id)}
                            className="p-1.5 text-[#64748B] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Aksi Lainnya"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Dropdown Menu */}
                        {activeMenuId === u.id && (
                          <div className="anim-dropdown absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer"
                            >
                              <Power className="h-3.5 w-3.5 text-[#64748B]" />
                              <span>{u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}</span>
                            </button>
                            {u.role !== 'ADMIN' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTargetUser(u);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border-t border-slate-100 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                <span>Hapus Akun</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (< 768px: Strict Zero Horizontal Scroll) */}
        <div className="md:hidden divide-y divide-slate-100 p-3 space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Tidak ada akun pengguna yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={32} />
                    <div>
                      <p className="font-bold text-xs text-[#0F315A]">{u.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{u.employeeId} · {u.role}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={u.isActive ? 'APPROVED' : 'REJECTED'}
                    label={u.isActive ? 'AKTIF' : 'NONAKTIF'}
                    size="sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Jabatan:</span>
                    <span className="font-bold text-[#0F172A]">{u.position}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Departemen:</span>
                    <span className="font-bold text-slate-700">{u.department?.name || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                  <span className="text-[10.5px] text-slate-400">{u.email}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setEditingUser(u);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetTargetUser(u);
                        setNewResetPassword('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px]"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]"
                    >
                      {u.isActive ? 'Nonaktif' : 'Aktif'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Standardized Modal: Edit User (Sticky Header, Scrollable Body, Sticky Footer) */}
      {(isCreating || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 anim-fade">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[calc(100vh-32px)] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-black text-[#0F315A]">
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setIsCreating(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <form id="user-edit-form" onSubmit={handleFormSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={currentFormValues.name}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-medium"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    defaultValue={currentFormValues.username || ''}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-mono font-bold"
                    placeholder="Contoh: budi.santoso01"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Employee ID (NIP)
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    required
                    defaultValue={currentFormValues.employeeId}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-mono font-bold"
                    placeholder="Contoh: FO-OPR-101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Email <span className="text-[10px] text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={currentFormValues.email || ''}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-medium"
                    placeholder="nama@email.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    No. Telepon (Opsional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={currentFormValues.phone || ''}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
                    placeholder="0812-3456-7890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Role Sistem
                  </label>
                  <select
                    name="role"
                    defaultValue={currentFormValues.role}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-bold"
                  >
                    <option value="OPERATOR">OPERATOR (Personil Lapangan)</option>
                    <option value="MANAGER">MANAGER (Pengawas Operasional)</option>
                    <option value="ADMIN">ADMIN (Administrator Sistem)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Jabatan / Posisi
                  </label>
                  <input
                    type="text"
                    name="position"
                    required
                    defaultValue={currentFormValues.position}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-medium"
                    placeholder="Contoh: Lead Control Room Operator"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Departemen
                </label>
                <select
                  name="departmentId"
                  defaultValue={currentFormValues.departmentId || ''}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-medium"
                >
                  <option value="">— Tidak Ditetapkan —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  URL Foto Profil (Opsional)
                </label>
                <input
                  type="url"
                  name="avatarUrl"
                  defaultValue={currentFormValues.avatarUrl || ''}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              {!editingUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-[#0F172A] block mb-1">
                      Kata Sandi (Min. 8 Karakter)
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A] block mb-1">
                      Konfirmasi Kata Sandi
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-[#F8FAFC] shrink-0">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0F172A]">
                <input
                  type="checkbox"
                  name="isActive"
                  form="user-edit-form"
                  defaultChecked={currentFormValues.isActive}
                  className="h-4 w-4 rounded border-slate-300 text-[#0066B3] focus:ring-[#0066B3]"
                />
                <span>Akun Aktif</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setIsCreating(false);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="user-edit-form"
                  disabled={pending}
                  className="px-4 py-2 rounded-xl bg-[#0066B3] hover:bg-[#005596] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {pending ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Standardized Modal: Reset Password */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 anim-fade">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4.5 w-4.5 text-[#0066B3]" />
                <h3 className="font-extrabold text-sm text-[#0F315A]">Reset Kata Sandi</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetTargetUser(null);
                  setNewResetPassword('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="reset-password-form" onSubmit={handleResetPasswordSubmit} className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Atur kata sandi baru untuk <strong className="text-[#0F315A]">{resetTargetUser.name}</strong> ({resetTargetUser.employeeId}).
              </p>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Kata Sandi Baru (Minimal 8 karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
                />
              </div>
            </form>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-[#F8FAFC] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setResetTargetUser(null);
                  setNewResetPassword('');
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="reset-password-form"
                disabled={pending || !newResetPassword}
                className="rounded-xl bg-[#0066B3] hover:bg-[#005596] text-white text-xs font-bold px-4 py-2 transition cursor-pointer"
              >
                {pending ? 'Mereset...' : 'Simpan Sandi Baru'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Standardized Modal: Delete User Confirmation */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 anim-fade">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-sm w-full flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
                <h3 className="font-extrabold text-sm text-red-700">Konfirmasi Hapus Akun</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Akun <strong className="text-[#0F315A]">{deleteTargetUser.name}</strong> akan dinonaktifkan dan dicabut hak aksesnya. Riwayat operasional dan audit log tetap dipertahankan.
              </p>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-[#F8FAFC] shrink-0">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={pending}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 transition cursor-pointer"
              >
                {pending ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
>>>>>>> f728c28 (coba)
    </div>
  );
}
