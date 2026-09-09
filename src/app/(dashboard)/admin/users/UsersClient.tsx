'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Edit2, Filter, HardHat, KeyRound, MoreVertical, Power, Search, Shield, Trash2, Upload, UserCog, UserPlus, UserX, Users, UserCheck } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { createAdminUserAction, deleteAdminUserAction, resetAdminUserPasswordAction, toggleAdminUserStatusAction, updateAdminUserAction } from '@/server/actions/adminUserActions';

type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';

type UserItem = {
  id: string;
  name: string;
  username?: string | null;
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

const EMPTY_FORM: UserForm = {
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

function toForm(user: UserItem): UserForm {
  return {
    name: user.name,
    username: user.username || '',
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
/** Reads an image File and returns a square-cropped JPEG data URL (max 256px). */
async function readAvatar(file: File | undefined): Promise<string> {
  if (!file) return '';
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca berkas foto.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Berkas bukan gambar yang valid.'));
    image.src = dataUrl;
  });

  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  // Square center-crop
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
  return canvas.toDataURL('image/jpeg', 0.85);
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
    return users.filter((u) => {
      const matchQuery = `${u.name} ${u.username || ''} ${u.email || ''} ${u.employeeId} ${u.position}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchActive = !statusFilter || String(u.isActive) === statusFilter;
      return matchQuery && matchRole && matchActive;
    });
  }, [users, query, roleFilter, statusFilter]);
const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setCreating(true);
  };

  const openEdit = (user: UserItem) => {
    setForm(toForm(user));
    setEditingUser(user);
    setCreating(false);
    setMenuId(null);
  };

  const closeForm = () => {
    setCreating(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const submitUser = () => {
    if (!form.name.trim() || form.name.trim().length < 3) return toast.error('Nama lengkap minimal 3 karakter.');
    if (!form.username.trim() || !/^[a-zA-Z0-9._-]{3,30}$/.test(form.username.trim())) {
      return toast.error('Username 3–30 karakter, hanya huruf, angka, titik, garis bawah, atau strip.');
    }
    if (creating) {
      if (form.password.length < 8) return toast.error('Kata sandi minimal 8 karakter.');
      if (form.password !== form.confirmPassword) return toast.error('Konfirmasi kata sandi tidak cocok.');
    }
    startTransition(async () => {
      const res = editingUser
        ? await updateAdminUserAction({
            id: editingUser.id,
            name: form.name.trim(),
            username: form.username.trim(),
            email: form.email.trim() || undefined,
            employeeId: form.employeeId.trim(),
            role: form.role,
            position: form.position.trim(),
            departmentId: form.departmentId || undefined,
            phone: form.phone.trim() || undefined,
            avatarUrl: form.avatarUrl || undefined,
            isActive: form.isActive,
          })
        : await createAdminUserAction({
            name: form.name.trim(),
            username: form.username.trim(),
            email: form.email.trim() || undefined,
            employeeId: form.employeeId.trim(),
            role: form.role === 'ADMIN' ? 'MANAGER' : form.role,
            position: form.position.trim(),
            departmentId: form.departmentId || undefined,
            phone: form.phone.trim() || undefined,
            avatarUrl: form.avatarUrl || undefined,
            isActive: form.isActive,
            password: form.password,
            confirmPassword: form.confirmPassword,
          });

      if (res.success) {
        toast.success(editingUser ? 'Data akun berhasil diperbarui.' : 'Akun pengguna baru berhasil dibuat.');
        setEditingUser(null);
        setCreating(false);
        setForm(EMPTY_FORM);
      } else {
        toast.error(res.error || 'Gagal memproses permintaan.');
      }
    });
  };

  const toggleStatus = (user: UserItem) =>
    startTransition(async () => {
      const result = await toggleAdminUserStatusAction(user.id);
      if (result.success) {
        toast.success(`Akun @${user.username} berhasil ${user.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
      } else {
        toast.error(result.error || 'Gagal mengubah status.');
      }
      setMenuId(null);
    });
const resetPasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetUser || resetPassword.length < 8) return toast.error('Password minimal 8 karakter.');
    startTransition(async () => {
      const result = await resetAdminUserPasswordAction({ id: resetUser.id, password: resetPassword });
      if (result.success) {
        toast.success(`Password @${resetUser.username} berhasil direset.`);
        setResetUser(null);
        setResetPassword('');
      } else {
        toast.error(result.error || 'Gagal mereset password.');
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteUser) return;
    startTransition(async () => {
      const result = await deleteAdminUserAction(deleteUser.id);
      if (result.success) {
        toast.success(`Akun @${deleteUser.username} dinonaktifkan.`);
        setDeleteUser(null);
      } else {
        toast.error(result.error || 'Gagal menghapus akun.');
      }
      setMenuId(null);
    });
  };

  const handleAvatarPick = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return toast.error('Format foto harus JPG, JPEG, PNG, atau WebP.');
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Ukuran foto maksimal 2 MB.');
    }
    startTransition(async () => {
      try {
        const dataUrl = await readAvatar(file);
        setField('avatarUrl', dataUrl);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Gagal memproses foto.');
      }
    });
  };

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
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3568] px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#092B57]"
        >
          <UserPlus className="h-4 w-4" />Tambah Pengguna
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total User" value={users.length} icon={Users} variant="total" />
        <KpiCard label="Admin" value={users.filter((u) => u.role === 'ADMIN').length} icon={Shield} variant="navy" />
        <KpiCard label="Manager" value={users.filter((u) => u.role === 'MANAGER').length} icon={UserCog} variant="blue" />
        <KpiCard label="Operator" value={users.filter((u) => u.role === 'OPERATOR').length} icon={HardHat} variant="blue" />
        <KpiCard label="Aktif" value={users.filter((u) => u.isActive).length} icon={UserCheck} variant="green" />
        <KpiCard label="Nonaktif" value={users.filter((u) => !u.isActive).length} icon={UserX} variant="red" />
      </div>
<div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari username, nama, atau employee ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-[#1769AA] focus:bg-white focus:ring-2 focus:ring-[#1769AA]/10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-xs font-semibold text-slate-700"
              >
                <option value="">Semua Role</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="OPERATOR">OPERATOR</option>
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
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
                <tr key={user.id} className="transition hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={38} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#092B57]">{user.name}</p>
                        <p className="truncate text-[10px] text-slate-500">{user.email || 'Belum ada email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-[#1769AA]">@{user.username}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-slate-700">{user.employeeId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : user.role === 'MANAGER'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-[#0066B3] border-blue-200'
                      }`}
                    >
                      {user.role === 'ADMIN' && <Shield className="h-3 w-3" />}
                      {user.role === 'MANAGER' && <UserCog className="h-3 w-3" />}
                      {user.role === 'OPERATOR' && <HardHat className="h-3 w-3" />}
                      <span>{user.role}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{user.department?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={user.isActive ? 'APPROVED' : 'REJECTED'}
                      label={user.isActive ? 'AKTIF' : 'NONAKTIF'}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-[#0066B3] hover:bg-[#EAF4FC] rounded-lg transition cursor-pointer"
                        title="Edit Data"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetUser(user);
                          setResetPassword('');
                        }}
                        className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                        title="Reset Kata Sandi"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      {user.role !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => setDeleteUser(user)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
</tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Search className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-600">Pengguna tidak ditemukan</p>
            <p className="mt-1 text-xs text-slate-400">Coba username, nama, atau Employee ID yang lain.</p>
          </div>
        )}
        <div className="border-t border-slate-100 px-4 py-3 text-[10px] font-semibold text-slate-400">
          Menampilkan {filteredUsers.length} dari {users.length} akun.
        </div>
      </div>

      {/* Mobile Cards (md hidden) */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((u) => (
          <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#092B57]">{u.name}</p>
                <p className="truncate text-[10px] font-mono text-slate-400">@{u.username} · {u.employeeId}</p>
              </div>
              <StatusBadge
                status={u.isActive ? 'APPROVED' : 'REJECTED'}
                label={u.isActive ? 'AKTIF' : 'NONAKTIF'}
                size="sm"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-full border ${
                u.role === 'ADMIN'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : u.role === 'MANAGER'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-[#0066B3] border-blue-200'
              }`}>{u.role}</span>
              <span className="text-[10px] text-slate-500">{u.department?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">
                {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetUser(u);
                    setResetPassword('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(u)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]"
                >
                  {u.isActive ? 'Nonaktif' : 'Aktif'}
                </button>
                {u.role !== 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => setDeleteUser(u)}
                    className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold text-[11px]"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
<Modal
        open={creating || Boolean(editingUser)}
        onClose={closeForm}
        title={editingUser ? `Edit Pengguna — @${editingUser.username}` : 'Tambah Pengguna'}
        eyebrow="USER ACCESS & IDENTITY"
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              form="user-form"
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[#0B3568] px-4 py-2 text-xs font-bold text-white hover:bg-[#092B57] transition disabled:opacity-50 cursor-pointer"
            >
              {pending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={(e) => { e.preventDefault(); submitUser(); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Nama Lengkap *
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Contoh: Andi Urian"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Username *
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setField('username', e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                placeholder="Contoh: andi01"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Employee ID (NIP) *
              <input
                type="text"
                required
                value={form.employeeId}
                onChange={(e) => setField('employeeId', e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                placeholder="Contoh: FO-OPR-101"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Role *
              <select
                value={form.role}
                onChange={(e) => setField('role', e.target.value as UserRole)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="OPERATOR">OPERATOR (Personil Lapangan)</option>
                <option value="MANAGER">MANAGER (Pengawas Operasional)</option>
                {editingUser && <option value="ADMIN">ADMIN</option>}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Jabatan / Posisi *
              <input
                type="text"
                required
                value={form.position}
                onChange={(e) => setField('position', e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Contoh: Lead Control Room Operator"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Email (opsional)
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="nama@email.com"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              No. Telepon (Opsional)
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="0812-3456-7890"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Department
              <select
                value={form.departmentId}
                onChange={(e) => setField('departmentId', e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="">Tanpa Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#092B57]">
              <Upload className="h-4 w-4 text-[#1769AA]" />Foto Profil
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <UserAvatar name={form.name || 'User'} avatarUrl={form.avatarUrl || null} size={56} />
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleAvatarPick(e.target.files?.[0])}
                  className="w-full text-xs"
                />
                <p className="mt-1 text-[10px] text-slate-400">JPG/JPEG/PNG/WebP, maksimal 2 MB. Avatar 1:1 circular.</p>
              </div>
              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setField('avatarUrl', '')}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Hapus foto
                </button>
              )}
            </div>
          </div>

          {creating && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">
                Password *
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="Minimal 8 karakter"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Konfirmasi Password *
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="Ulangi password"
                />
              </label>
            </div>
          )}

          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3">
            <span>
              <span className="block text-xs font-bold">Status Akun</span>
              <span className="text-[10px] text-slate-400">Nonaktif tidak dapat login.</span>
            </span>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
              className="h-4 w-4 accent-[#0B3568]"
            />
          </label>
        </form>
      </Modal>
<Modal
        open={Boolean(resetUser)}
        onClose={() => setResetUser(null)}
        title="Reset Password"
        eyebrow="SECURITY"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResetUser(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              form="reset-password-form"
              type="submit"
              disabled={pending || resetPassword.length < 8}
              className="rounded-xl bg-[#0B3568] px-4 py-2 text-xs font-bold text-white hover:bg-[#092B57] transition disabled:opacity-50 cursor-pointer"
            >
              Reset Password
            </button>
          </div>
        }
      >
        <form id="reset-password-form" onSubmit={resetPasswordSubmit} className="space-y-3">
          <p className="text-xs text-slate-500">
            Password baru untuk <strong>@{resetUser?.username}</strong> (minimal 8 karakter).
          </p>
          <label className="text-xs font-semibold text-slate-700">
            Password Baru
            <input
              autoFocus
              required
              minLength={8}
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="Masukkan password baru"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteUser)}
        onClose={() => setDeleteUser(null)}
        title="Konfirmasi Hapus Akun"
        eyebrow="DANGER ZONE"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteUser(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={pending}
              className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
            >
              {pending ? 'Menghapus...' : 'Ya, Hapus Akun'}
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Akun <strong className="text-[#0F315A]">{deleteUser?.name}</strong> (@{deleteUser?.username}) akan
            dinonaktifkan dan hak aksesnya dicabut. Riwayat operasional dan audit log tetap dipertahankan.
          </p>
        </div>
      </Modal>
    </div>
  );
}