'use server';

import { requireAuth, setSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { profileUpdateSchema, ProfileUpdateInput } from '@/lib/validation';
import { recordAuditLog } from '../services/auditService';
import { revalidatePath } from 'next/cache';

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
    } = {
      name: parse.data.name,
      phone: parse.data.phone || null,
      // '' explicitly clears the photo; otherwise keep existing when not provided
      avatarUrl:
        parse.data.avatarUrl === '' ? null : parse.data.avatarUrl || dbUser.avatarUrl,
    };

    // Password change verification
    if (parse.data.newPassword && parse.data.newPassword.length >= 6) {
      if (!parse.data.currentPassword) {
        return { success: false, error: 'Kata sandi saat ini wajib diisi untuk mengubah kata sandi baru.' };
      }

      const isValid = await bcrypt.compare(parse.data.currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Kata sandi saat ini tidak sesuai.' };
      }

      data.passwordHash = await bcrypt.hash(parse.data.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    // Update active session cookie
    await setSessionCookie({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      employeeId: updated.employeeId,
      role: updated.role,
      position: updated.position,
      departmentId: updated.departmentId,
      avatarUrl: updated.avatarUrl,
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
