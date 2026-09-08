'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Search,
  UserPlus,
  Edit2,
  Power,
  KeyRound,
  Trash2,
  MoreVertical,
  X,
  AlertTriangle,
  HardHat,
  Shield,
  UserCog,
  Filter,
  Users,
  UserCheck,
  UserX,
  Lock,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Hash,
  Upload,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Modal } from '@/components/ui/Modal';
import {
  createAdminUserAction,
  deleteAdminUserAction,
  resetAdminUserPasswordAction,
  toggleAdminUserStatusAction,
  updateAdminUserAction,
} from '@/server/actions/adminUserActions';

type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';
type CreateUserRole = 'MANAGER' | 'OPERATOR';

type UserItem = {
  id: string;
  name: string;
  username: string;
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

const emptyForm: UserForm = {
  name: '',
  username: '',
  email: '',
  employeeId: '',
  password: '',
  confirmPassword: '',
  role: 'OPERATOR',
  position: '',
  departmentId: '',
  phone: '',
  avatarUrl: '',
  isActive: true,
};

function userToForm(user: UserItem): UserForm {
  return {
    name: user.name,
    username: user.username,
    email: user.email || '',
    employeeId: user.employeeId,
    password: '',
    confirmPassword: '',
    role: user.role,
    position: user.position,
    departmentId: user.departmentId || '',
    phone: user.phone || '',
    avatarUrl: user.avatarUrl || '',
    isActive: user.isActive,
  };
}

export default function UsersClient({ users, departments }: { users: UserItem[]; departments: Department[] }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const haystack = [user.username, user.name, user.email || '', user.employeeId, user.position]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalized || haystack.includes(normalized);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !activeFilter || String(user.isActive) === activeFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, query, roleFilter, activeFilter]);

  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const operatorCount = users.filter((u) => u.role === 'OPERATOR').length;
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = totalCount - activeCount;

  const openCreate = () => {
    setForm(emptyForm);
    setEditingUser(null);
    setIsCreating(true);
  };

  const openEdit = (user: UserItem) => {
    setForm(userToForm(user));
    setEditingUser(user);
    setIsCreating(false);
    setActiveMenuId(null);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const updateForm = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleAvatarFile = (file: File | undefined) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Foto harus JPG, JPEG, PNG, atau WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateForm('avatarUrl', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!form.name.trim() || !username || !form.employeeId.trim() || !form.position.trim()) {
      toast.error('Nama, username, Employee ID, dan posisi wajib diisi.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
      toast.error('Username harus 3–30 karakter dan hanya boleh huruf, angka, titik, garis bawah, atau strip.');
      return;
    }
    if (isCreating && form.password.length < 8) {
      toast.error('Kata sandi minimal 8 karakter.');
      return;
    }
    if (isCreating && form.password !== form.confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak sama.');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Format email tidak valid.');
      return;
    }

    startTransition(async () => {
      const role: UserRole = form.role === 'ADMIN' ? 'ADMIN' : form.role;
      const result = editingUser
        ? await updateAdminUserAction({
            id: editingUser.id,
            name: form.name.trim(),
            username,
            email: form.email.trim(),
            employeeId: form.employeeId.trim(),
            role,
            position: form.position.trim(),
            departmentId: form.departmentId || undefined,
            phone: form.phone.trim() || undefined,
            avatarUrl: form.avatarUrl || undefined,
            isActive: form.isActive,
          })
        : await createAdminUserAction({
            name: form.name.trim(),
            username,
            email: form.email.trim(),
            employeeId: form.employeeId.trim(),
            role: (role === 'ADMIN' ? 'OPERATOR' : role) as CreateUserRole,
            position: form.position.trim(),
            departmentId: form.departmentId || undefined,
            phone: form.phone.trim() || undefined,
            avatarUrl: form.avatarUrl || undefined,
            isActive: form.isActive,
            password: form.password,
            confirmPassword: form.confirmPassword,
          });

      if (result.success) {
        toast.success(editingUser ? 'Data akun berhasil diperbarui.' : 'Akun pengguna berhasil dibuat.');
        closeForm();
      } else {
        toast.error(result.error || 'Gagal memproses akun.');
      }
    });
  };

  const handleToggleStatus = (user: UserItem) => {
    startTransition(async () => {
      const result = await toggleAdminUserStatusAction(user.id);
      if (result.success) toast.success(`Akun @${user.username} berhasil ${user.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
      else toast.error(result.error || 'Gagal mengubah status akun.');
      setActiveMenuId(null);
    });
  };

  const handleResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetTargetUser) return;
    if (newResetPassword.length < 8) {
      toast.error('Kata sandi minimal 8 karakter.');
      return;
    }
    startTransition(async () => {
      const result = await resetAdminUserPasswordAction({ id: resetTargetUser.id, password: newResetPassword });
      if (result.success) {
        toast.success(`Password @${resetTargetUser.username} berhasil direset.`);
        setResetTargetUser(null);
        setNewResetPassword('');
      } else toast.error(result.error || 'Gagal mereset password.');
    });
  };

  const handleDelete = () => {
    if (!deleteTargetUser) return;
    startTransition(async () => {
      const result = await deleteAdminUserAction(deleteTargetUser.id);
      if (result.success) {
        toast.success(`Akun @${deleteTargetUser.username} dinonaktifkan.`);
        setDeleteTargetUser(null);
      } else toast.error(result.error || 'Gagal menghapus akun.');
      setActiveMenuId(null);
    });
  };

  const formTitle = editingUser ? `Edit Pengguna — @${editingUser.username}` : 'Tambah Pengguna';

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#0066B3]">
            <Users className="h-3.5 w-3.5" /> USER MANAGEMENT
          </div>
          <h1 className="text-xl font-black tracking-tight text-[#092B57] sm:text-2xl">Kelola Pengguna</h1>
          <p className="mt-1 text-xs text-slate-500">Kelola username login, role, profil, status, dan akses personel.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3568] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#092B57]" type="button">
          <UserPlus className="h-4 w-4" /> Tambah Pengguna
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard title="Total User" value={totalCount} icon={Users} />
        <KpiCard title="Admin" value={adminCount} icon={Shield} />
        <KpiCard title="Manager" value={managerCount} icon={UserCog} />
        <KpiCard title="Operator" value={operatorCount} icon={HardHat} />
        <KpiCard title="Aktif" value={activeCount} icon={UserCheck} />
        <KpiCard title="Nonaktif" value={inactiveCount} icon={UserX} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari username, nama, atau employee ID..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-[#1769AA] focus:bg-white focus:ring-2 focus:ring-[#1769AA]/10" />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 md:w-40 md:flex-none">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-xs font-semibold text-slate-700 outline-none">
                <option value="">Semua Role</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="OPERATOR">OPERATOR</option>
              </select>
            </div>
            <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none md:w-36 md:flex-none">
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left">
            <thead className="bg-[#F8FAFC] text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition duration-150 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={38} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#092B57]">{user.name}</p>
                        <p className="truncate text-[10px] text-slate-500">{user.email || 'Email belum diisi'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-[#1769AA]">@{user.username}</span></td>
                  <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-slate-700">{user.employeeId}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={user.role} label={user.role} size="sm" /></td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-600">{user.department?.name || '—'}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${user.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />{user.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-flex">
                      <button type="button" onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#092B57]" aria-label={`Aksi untuk ${user.name}`}>
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {activeMenuId === user.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
                          <button type="button" onClick={() => openEdit(user)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Edit2 className="h-3.5 w-3.5" /> Edit Pengguna</button>
                          <button type="button" onClick={() => { setResetTargetUser(user); setNewResetPassword(''); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><KeyRound className="h-3.5 w-3.5" /> Reset Password</button>
                          {user.role !== 'ADMIN' && <button type="button" onClick={() => handleToggleStatus(user)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Power className="h-3.5 w-3.5" /> {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>}
                          {user.role !== 'ADMIN' && <button type="button" onClick={() => { setDeleteTargetUser(user); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Hapus Akun</button>}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && <div className="px-4 py-12 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">Pengguna tidak ditemukan</p><p className="mt-1 text-xs text-slate-400">Coba username, nama, atau Employee ID yang lain.</p></div>}
        <div className="border-t border-slate-100 px-4 py-3 text-[10px] font-semibold text-slate-400">Menampilkan {filteredUsers.length} dari {users.length} akun.</div>
      </div>

      <Modal open={isCreating || Boolean(editingUser)} onClose={closeForm} title={formTitle} eyebrow="USER ACCESS & IDENTITY" size="xl" footer={<div className="flex items-center justify-end gap-2"><button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button><button form="user-form" type="submit" disabled={pending} className="rounded-xl bg-[#0B3568] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#092B57] disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Menyimpan...' : 'Simpan'}</button></div>}>
        <form id="user-form" onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Nama Lengkap *<input required value={form.name} onChange={(e) => updateForm('name', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]" /></label>
            <label className="text-xs font-semibold text-slate-700">Username *<input required minLength={3} maxLength={30} value={form.username} onChange={(e) => updateForm('username', e.target.value.toLowerCase())} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#1769AA]" placeholder="contoh: andi01" /></label>
            <label className="text-xs font-semibold text-slate-700">Employee ID *<input required value={form.employeeId} onChange={(e) => updateForm('employeeId', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#1769AA]" /></label>
            <label className="text-xs font-semibold text-slate-700">Role *<select value={form.role} onChange={(e) => updateForm('role', e.target.value as UserRole)} disabled={editingUser?.role === 'ADMIN'} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA] disabled:bg-slate-100"><option value="OPERATOR">OPERATOR</option><option value="MANAGER">MANAGER</option>{editingUser?.role === 'ADMIN' && <option value="ADMIN">ADMIN</option>}</select></label>
            <label className="text-xs font-semibold text-slate-700">Posisi<input value={form.position} onChange={(e) => updateForm('position', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]" /></label>
            <label className="text-xs font-semibold text-slate-700">Department<select value={form.departmentId} onChange={(e) => updateForm('departmentId', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]"><option value="">Tanpa Department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-700">Phone<input type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]" /></label>
            <label className="text-xs font-semibold text-slate-700">Email (opsional)<input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]" placeholder="boleh dikosongkan" /></label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#092B57]"><Upload className="h-4 w-4 text-[#1769AA]" /> Foto Profil</div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <UserAvatar name={form.name || 'User'} avatarUrl={form.avatarUrl || null} size={56} />
              <div className="flex-1"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleAvatarFile(e.target.files?.[0])} className="w-full text-xs" /><p className="mt-1 text-[10px] text-slate-400">JPG, JPEG, PNG, WebP · maksimal 2 MB · rasio 1:1 disarankan.</p></div>
              {form.avatarUrl && <button type="button" onClick={() => updateForm('avatarUrl', '')} className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Hapus foto</button>}
            </div>
          </div>

          {isCreating && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Password *<input required type="password" minLength={8} value={form.password} onChange={(e) => updateForm('password', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]" /></label><label className="text-xs font-semibold text-slate-700">Konfirmasi Password *<input required type="password" minLength={8} value={form.confirmPassword} onChange={(e) => updateForm('confirmPassword', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]" /></label></div>}

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 py-3"><span><span className="block text-xs font-bold text-slate-700">Status Akun</span><span className="text-[10px] text-slate-400">Akun nonaktif tidak dapat login.</span></span><input type="checkbox" checked={form.isActive} onChange={(e) => updateForm('isActive', e.target.checked)} className="h-4 w-4 accent-[#0B3568]" /></label>
        </form>
      </Modal>

      <Modal open={Boolean(resetTargetUser)} onClose={() => setResetTargetUser(null)} title="Reset Password" eyebrow="SECURITY" size="sm" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setResetTargetUser(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Batal</button><button form="reset-password-form" type="submit" disabled={pending} className="rounded-xl bg-[#0B3568] px-4 py-2 text-xs font-bold text-white">Reset Password</button></div>}>
        <form id="reset-password-form" onSubmit={handleResetPassword} className="space-y-3"><p className="text-xs text-slate-500">Password baru untuk <span className="font-bold text-[#1769AA]">@{resetTargetUser?.username}</span>.</p><label className="text-xs font-semibold text-slate-700">Password Baru<input autoFocus required minLength={8} type="password" value={newResetPassword} onChange={(e) => setNewResetPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1769AA]" /></label></form>
      </Modal>

      <Modal open={Boolean(deleteTargetUser)} onClose={() => setDeleteTargetUser(null)} title="Hapus Akun" eyebrow="DANGER ZONE" size="sm" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteTargetUser(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Batal</button><button type="button" onClick={handleDelete} disabled={pending} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white">Nonaktifkan Akun</button></div>}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><p className="text-xs leading-relaxed text-red-800">Akun <strong>@{deleteTargetUser?.username}</strong> akan dinonaktifkan agar data schedule, attendance, notification, dan audit tetap aman. Akun tidak dapat login setelah dinonaktifkan.</p></div></div>
      </Modal>
    </div>
  );
}
