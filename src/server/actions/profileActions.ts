'use server';

import { requireAuth, requirePasswordChangeAuth, setSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { profileUpdateSchema, ProfileUpdateInput } from '@/lib/validation';
import { recordAuditLog } from '../services/auditService';
import { revalidatePath } from 'next/cache';

export async function changePasswordAction(input: { currentPassword?: string; newPassword: string }) {
  try {
    const user = await requirePasswordChangeAuth();
    if (input.newPassword.length < 8) return { success: false, error: 'Kata sandi baru minimal 8 karakter.' };
    if (input.currentPassword === input.newPassword) return { success: false, error: 'Kata sandi baru harus berbeda.' };
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new Error('Pengguna tidak ditemukan.');
    if (!dbUser.mustChangePassword) {
      if (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, dbUser.passwordHash))) {
        return { success: false, error: 'Kata sandi saat ini tidak sesuai.' };
      }
    }
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
    await setSessionCookie({ ...user, mustChangePassword: false });
    await recordAuditLog({ userId: user.id, action: 'CHANGE_PASSWORD', entity: 'User', entityId: user.id });
    revalidatePath('/', 'layout');
    return { success: true, redirectTo: updated.role === 'ADMIN' ? '/admin/dashboard' : updated.role === 'MANAGER' ? '/manager/dashboard' : '/operator/dashboard' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengganti kata sandi.' };
  }
}

export async function updateProfileAction(input: ProfileUpdateInput) {
  try {
    const user = await requireAuth();
    const parse = profileUpdateSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) throw new Error('Pengguna tidak ditemukan.');

    const data: {
      name: string;
      phone: string | null;
      avatarUrl: string | null;
      passwordHash?: string;
      mustChangePassword?: boolean;
    } = {
      name: parse.data.name,
      phone: parse.data.phone || null,
      // '' explicitly clears the photo; otherwise keep existing when not provided
      avatarUrl:
        parse.data.avatarUrl === '' ? null : parse.data.avatarUrl || dbUser.avatarUrl,
    };

    // Password change verification
    if (parse.data.newPassword && parse.data.newPassword.length >= 6) {
      if (!parse.data.currentPassword && !dbUser.mustChangePassword) {
        return { success: false, error: 'Kata sandi saat ini wajib diisi untuk mengubah kata sandi baru.' };
      }

      const isValid = !parse.data.currentPassword || await bcrypt.compare(parse.data.currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Kata sandi saat ini tidak sesuai.' };
      }

      data.passwordHash = await bcrypt.hash(parse.data.newPassword, 10);
      data.mustChangePassword = false;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    // Update active session cookie
    await setSessionCookie({
      id: updated.id,
      name: updated.name,
      username: updated.username,
      email: updated.email || null,
      employeeId: updated.employeeId,
      role: updated.role,
      position: updated.position,
      departmentId: updated.departmentId,
      avatarUrl: updated.avatarUrl,
      isActive: updated.isActive,
      mustChangePassword: updated.mustChangePassword,
    });

    // Record Audit Log
    await recordAuditLog({
      userId: user.id,
      action: 'UPDATE_PROFILE',
      entity: 'User',
      entityId: user.id,
      metadata: { name: updated.name, phone: updated.phone },
    });

    revalidatePath('/profile');
    revalidatePath('/', 'layout');

    return { success: true, user: updated };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui profil.' };
  }
}
