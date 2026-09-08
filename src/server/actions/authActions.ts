'use server';

import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth/session';
import { loginSchema, LoginInput } from '@/lib/validation';
import { recordAuditLog } from '../services/auditService';
import { revalidatePath } from 'next/cache';

export async function loginAction(formData: LoginInput) {
  const parse = loginSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message || 'Input tidak valid' };
  }

  const { username, password } = parse.data;
  const idTrimmed = username.trim();

  // Login HANYA menggunakan username (email & nama bukan credential).
  let user = await prisma.user.findUnique({
    where: { username: idTrimmed },
    include: { department: true },
  });

  if (!user) {
    const candidates = await prisma.user.findMany({
      where: { username: { equals: idTrimmed, mode: 'insensitive' } },
      include: { department: true },
      take: 2,
    });
    user = candidates.find((c) => c.isActive) || candidates[0] || null;
  }

  if (!user || !user.isActive) {
    return { success: false, error: 'Username atau kata sandi salah, atau akun nonaktif.' };
  }

  // Verify bcrypt password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, error: 'Username atau kata sandi salah.' };
  }

  // Create session
  await setSessionCookie({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    employeeId: user.employeeId,
    role: user.role,
    position: user.position,
    departmentId: user.departmentId,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
  });

  // Record audit log
  await recordAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    metadata: { role: user.role, username: user.username },
  });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    redirectTo: user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'MANAGER' ? '/manager/dashboard' : '/operator/dashboard',
  };
}

export async function logoutAction() {
  const user = await getSession();
  if (user) {
    await recordAuditLog({
      userId: user.id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: user.id,
    });
  }

  await clearSessionCookie();
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function getCurrentUserAction() {
  return getSession();
}
