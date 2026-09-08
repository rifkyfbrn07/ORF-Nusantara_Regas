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
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  createAdminUserAction,
  deleteAdminUserAction,
  resetAdminUserPasswordAction,
  toggleAdminUserStatusAction,
  updateAdminUserAction,
} from '@/server/actions/adminUserActions';

type UserItem = {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
  position: string;
  phone: string | null;
  departmentId: string | null;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: Date | string;
  department: { name: string } | null;
};

type Department = {
  id: string;
  name: string;
};

const blankUser = {
  name: '',
  email: '',
  employeeId: '',
  password: '',
  confirmPassword: '',
  role: 'OPERATOR' as const,
  position: '',
  departmentId: '',
  phone: '',
  avatarUrl: '',
  isActive: true,
};

export default function UsersClient({
  users,
  departments,
}: {
  users: UserItem[];
  departments: Department[];
}) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Metrics for KPI
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const operatorCount = users.filter((u) => u.role === 'OPERATOR').length;
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchQuery = `${u.name} ${u.email} ${u.employeeId} ${u.position}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchActive = !activeFilter || String(u.isActive) === activeFilter;
      return matchQuery && matchRole && matchActive;
    });
  }, [users, query, roleFilter, activeFilter]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formObj = Object.fromEntries(formData.entries());

    const inputData = {
      name: String(formObj.name || ''),
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
            email: inputData.email,
            employeeId: inputData.employeeId,
            role: inputData.role,
            position: inputData.position,
            departmentId: inputData.departmentId || undefined,
            phone: inputData.phone || undefined,
            avatarUrl: inputData.avatarUrl || undefined,
            isActive: inputData.isActive,
          })
        : await createAdminUserAction(inputData);

      if (res.success) {
        toast.success(editingUser ? 'Data akun berhasil diperbarui' : 'Akun pengguna baru berhasil dibuat');
        setEditingUser(null);
        setIsCreating(false);
      } else {
        toast.error(res.error || 'Gagal memproses permintaan');
      }
    });
  };

  const handleToggleStatus = (u: UserItem) => {
    startTransition(async () => {
      const res = await toggleAdminUserStatusAction(u.id);
      if (res.success) {
        toast.success(`Akun ${u.name} telah ${u.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      } else {
        toast.error(res.error || 'Gagal mengubah status akun');
      }
      setActiveMenuId(null);
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newResetPassword) return;

    if (newResetPassword.length < 8) {
      toast.error('Kata sandi minimal 8 karakter');
      return;
    }

    startTransition(async () => {
      const res = await resetAdminUserPasswordAction({
        id: resetTargetUser.id,
        password: newResetPassword,
      });

      if (res.success) {
        toast.success(`Kata sandi akun ${resetTargetUser.name} berhasil direset`);
        setResetTargetUser(null);
        setNewResetPassword('');
      } else {
        toast.error(res.error || 'Gagal mereset kata sandi');
      }
      setActiveMenuId(null);
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetUser) return;

    startTransition(async () => {
      const res = await deleteAdminUserAction(deleteTargetUser.id);
      if (res.success) {
        toast.success(`Akun ${deleteTargetUser.name} berhasil dinonaktifkan/dihapus`);
        setDeleteTargetUser(null);
      } else {
        toast.error(res.error || 'Gagal menghapus akun');
      }
      setActiveMenuId(null);
    });
  };

  const currentFormValues = editingUser ?? blankUser;

  return (
    <div className="space-y-4 sm:space-y-5 dashboard-enter max-w-[1400px] mx-auto w-full">
      {/* 1. Header: Manajemen Pengguna */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#0066B3] bg-[#EAF4FC] px-2.5 py-0.5 rounded-md">
              USER ACCESS & IDENTITY
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] font-semibold text-[#64748B]">
              Total: {users.length} Akun Terdaftar
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F315A] tracking-tight mt-1">
            Manajemen Pengguna
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5 max-w-2xl">
            Kelola akun, hak akses, dan status pengguna platform Distribusi Gas & ORF.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <Link
            href="/admin/users/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0066B3] hover:bg-[#005596] px-4 py-2.5 text-xs font-bold text-white transition shadow-xs cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Tambah Pengguna</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI Cards Grid (6 Metric Cards ~96px) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <KpiCard
          label="TOTAL PENGGUNA"
          value={totalCount}
          iconName="users"
          variant="total"
          subtext="Semua Akun"
          index={0}
        />
        <KpiCard
          label="ADMIN"
          value={adminCount}
          iconName="shield"
          variant="blue"
          subtext="Administrator"
          index={1}
        />
        <KpiCard
          label="MANAGER"
          value={managerCount}
          iconName="userCog"
          variant="terlambat"
          subtext="Pengawas Shift"
          index={2}
        />
        <KpiCard
          label="OPERATOR"
          value={operatorCount}
          iconName="hardHat"
          variant="hadir"
          subtext="Personil Lapangan"
          index={3}
        />
        <KpiCard
          label="AKTIF"
          value={activeCount}
          iconName="userCheck"
          variant="hadir"
          percent={`${totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}%`}
          subtext="Akun Aktif"
          index={4}
        />
        <KpiCard
          label="NONAKTIF"
          value={inactiveCount}
          iconName="userX"
          variant={inactiveCount > 0 ? 'belumAbsen' : 'gray'}
          subtext="Akun Nonaktif"
          index={5}
        />
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3] transition"
            placeholder="Cari nama, email, NIP, jabatan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-semibold pl-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

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
                          <p className="text-[11px] text-[#64748B]">{u.email}</p>
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
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={currentFormValues.email}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-medium"
                    placeholder="operator@fieldops.local"
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
    </div>
  );
}
