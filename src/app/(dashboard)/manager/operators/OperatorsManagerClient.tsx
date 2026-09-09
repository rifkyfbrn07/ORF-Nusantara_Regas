'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Search, Power, Eye, CheckCircle, AlertCircle, X, Phone, Mail } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { createOperatorAction, updateOperatorAction, toggleOperatorStatusAction } from '@/server/actions/operatorActions';
import { useRouter } from 'next/navigation';

export interface OperatorManagerRecord {
  id: string;
  name: string;
  email: string | null;
  employeeId: string;
  position?: string | null;
  departmentId?: string | null;
  phone?: string | null;
  isActive: boolean;
  department?: {
    id: string;
    name: string;
  } | null;
  todayStatus?: {
    status: string;
    statusLabel: string;
  } | null;
}

export interface DepartmentItem {
  id: string;
  name: string;
}

interface OperatorsManagerClientProps {
  initialOperators: OperatorManagerRecord[];
  departments: DepartmentItem[];
}

export function OperatorsManagerClient({
  initialOperators,
  departments,
}: OperatorsManagerClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorManagerRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    employeeId: '',
    password: '',
    position: '',
    departmentId: departments[0]?.id || '',
    phone: '',
    isActive: true,
  });

  const filteredOperators = initialOperators.filter((op) => {
    const matchDept = departmentFilter === 'ALL' || op.departmentId === departmentFilter;
    const matchSearch =
      search === '' ||
      op.name.toLowerCase().includes(search.toLowerCase()) ||
      op.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      (op.position && op.position.toLowerCase().includes(search.toLowerCase()));

    return matchDept && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingOperator(null);
    setFormData({
      id: '',
      name: '',
      email: '',
      employeeId: '',
      password: 'Operator123!',
      position: 'Field Operator',
      departmentId: departments[0]?.id || '',
      phone: '+62 ',
      isActive: true,
    });
    setError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (op: OperatorManagerRecord) => {
    setEditingOperator(op);
    setFormData({
      id: op.id,
      name: op.name,
      email: op.email || '',
      employeeId: op.employeeId,
      password: '',
      position: op.position || '',
      departmentId: op.departmentId || '',
      phone: op.phone || '',
      isActive: op.isActive,
    });
    setError(null);
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingOperator) {
        const res = await updateOperatorAction({
          id: formData.id,
          name: formData.name,
          position: formData.position,
          departmentId: formData.departmentId || undefined,
          phone: formData.phone || undefined,
          isActive: formData.isActive,
          newPassword: formData.password || undefined,
        });
        if (!res.success) throw new Error(res.error);
        setSuccess('Data operator berhasil diperbarui!');
      } else {
        const res = await createOperatorAction({
          name: formData.name,
          email: formData.email,
          employeeId: formData.employeeId,
          password: formData.password,
          position: formData.position,
          departmentId: formData.departmentId || undefined,
          phone: formData.phone || undefined,
          role: 'OPERATOR',
        });
        if (!res.success) throw new Error(res.error);
        setSuccess('Operator baru berhasil ditambahkan ke sistem!');
      }

      setShowAddModal(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data operator');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (op: OperatorManagerRecord) => {
    if (!confirm(`Ubah status aktif operator ${op.name}?`)) return;
    setLoading(true);
    const res = await toggleOperatorStatusAction(op.id);
    setLoading(false);
    if (res.success) {
      setSuccess(`Status operator ${op.name} berhasil diubah.`);
      router.refresh();
    } else {
      alert(res.error || 'Gagal mengubah status');
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DCE5EF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs font-semibold text-[#132238] bg-[#F3F6FA] border border-[#CBD7E6] px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition"
          >
            <option value="ALL">Semua Departemen</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIP, atau jabatan..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F3F6FA] border border-[#CBD7E6] rounded-xl text-[#132238] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition"
            />
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-[#123E7A] hover:bg-[#092B57] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4 text-[#F58220]" />
          <span>+ Tambah Operator Baru</span>
        </button>
      </div>

      {/* Operators Table */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#132238] min-w-[850px]">
            <thead className="bg-[#EDF4FB] text-[11px] uppercase font-bold text-[#3F5570] border-b border-[#DCE5EF]">
              <tr>
                <th className="px-5 py-3.5">OPERATOR</th>
                <th className="px-5 py-3.5">DEPARTEMEN</th>
                <th className="px-5 py-3.5">KONTAK</th>
                <th className="px-5 py-3.5 text-center">STATUS HARI INI</th>
                <th className="px-5 py-3.5 text-center">AKUN</th>
                <th className="px-5 py-3.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium">
              {filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[#5F718A]">
                    Tidak ada data operator yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOperators.map((op) => (
                  <tr key={op.id} className="hover:bg-[#F8FBFE] transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={op.name} size={36} />
                        <div>
                          <Link
                            href={`/manager/operators/${op.id}`}
                            className="font-bold text-[#092B57] hover:text-[#1769AA] transition"
                          >
                            {op.name}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-[#5F718A] font-mono">
                            <span className="font-bold text-[#092B57]">{op.employeeId}</span>
                            <span>•</span>
                            <span className="font-sans text-[#5F718A]">{op.position}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-[#132238]">
                        {op.department?.name || 'Operations'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#132238]">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{op.email || '—'}</span>
                      </div>
                      {op.phone && (
                        <div className="flex items-center gap-1.5 text-[#5F718A] mt-0.5 font-mono">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{op.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge
                        status={op.todayStatus?.status || 'OFF'}
                        label={op.todayStatus?.statusLabel || 'OFF'}
                        size="sm"
                      />
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          op.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${op.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {op.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/manager/operators/${op.id}`}
                          title="Lihat Profil Lengkap"
                          className="p-1.5 rounded-lg bg-[#EDF4FB] hover:bg-[#123E7A] hover:text-white text-[#123E7A] transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(op)}
                          title="Ubah Data"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#5F718A] transition cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(op)}
                          title={op.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            op.isActive ? 'bg-slate-100 hover:bg-red-50 text-[#5F718A] hover:text-red-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Operator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="anim-fade-up bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DCE5EF] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-extrabold text-base text-[#092B57]">
                {editingOperator ? 'Ubah Data Operator' : 'Tambah Operator Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#5F718A] hover:text-[#092B57]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#132238] block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Andi Pratama"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD7E6] rounded-xl text-[#132238] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#132238] block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingOperator}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="operator@regas.pertamina.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD7E6] rounded-xl text-[#132238] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#132238] block mb-1">NIP (Employee ID)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingOperator}
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="FO-OPR-101"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD7E6] rounded-xl text-[#132238] focus:outline-none font-mono disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#132238] block mb-1">Posisi / Jabatan</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Control Room Operator"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD7E6] rounded-xl text-[#132238] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#132238] block mb-1">Departemen</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD7E6] rounded-xl text-[#132238] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#132238] block mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62 812-9876-1001"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD7E6] rounded-xl text-[#132238] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#132238] block mb-1">
                  {editingOperator ? 'Reset Kata Sandi Baru (Opsional)' : 'Kata Sandi Awal'}
                </label>
                <input
                  type="password"
                  required={!editingOperator}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingOperator ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD7E6] rounded-xl text-[#132238] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#5F718A] hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold bg-[#123E7A] hover:bg-[#092B57] text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
