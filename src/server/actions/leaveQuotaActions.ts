'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from '@/server/services/auditService';
import { requireAuth as requireSession } from '@/lib/auth/session';
import { getLeaveQuotaAvailability } from '@/server/services/leaveQuotaService';

export async function saveLeaveQuotaAction(input: { team: string; date: string; maxOperators: number }) {
  try {
    const admin = await requireAdmin();
    const team = input.team.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,20}$/.test(team)) return { success: false, error: 'Tim tidak valid.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isInteger(input.maxOperators) || input.maxOperators < 1) {
      return { success: false, error: 'Tanggal atau kuota maksimal tidak valid.' };
    }
    const hasTeam = await prisma.user.count({ where: { team, role: 'OPERATOR' } });
    if (!hasTeam) return { success: false, error: 'Tim tidak ditemukan pada akun operator.' };
    const saved = await prisma.leaveQuota.upsert({
      where: { team_date: { team, date: input.date } },
      create: { team, date: input.date, maxOperators: input.maxOperators },
      update: { maxOperators: input.maxOperators },
    });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_SET_LEAVE_QUOTA', entity: 'LeaveQuota', entityId: saved.id, metadata: { team, date: input.date, maxOperators: input.maxOperators } });
    revalidatePath('/admin/leave-quotas'); revalidatePath('/operator/requests');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menyimpan kuota cuti.' };
  }
}

export async function getMyLeaveQuotaAvailabilityAction(startDate: string, endDate: string) {
  try {
    const user = await requireSession();
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { team: true } });
    if (!dbUser?.team) return { success: false, error: 'Tim akun belum dipetakan.', days: [] };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) return { success: false, error: 'Rentang tanggal tidak valid.', days: [] };
    const days = await getLeaveQuotaAvailability(dbUser.team, startDate, endDate);
    return { success: true, days };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Gagal memeriksa kuota.', days: [] }; }
}
