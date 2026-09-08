'use server';

import { revalidatePath } from 'next/cache';
import { NotificationType } from '@prisma/client';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { announcementSchema, AnnouncementInput } from '@/lib/validation';
import { recordAuditLog } from '@/server/services/auditService';
import { createNotification } from '@/server/services/notificationService';

/**
 * Creates an announcement (MANAGER only) and fans out notifications to the
 * relevant operators based on the chosen target (ALL / SHIFT / OPERATOR).
 */
export async function createAnnouncementAction(input: AnnouncementInput) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    const parse = announcementSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message };
    }

    const { title, message, targetType, targetId, startAt } = parse.data;

    // Validate target references + derive notification recipients
    let recipients: string[] = [];

    if (targetType === 'ALL') {
      const operators = await prisma.user.findMany({
        where: { role: 'OPERATOR', isActive: true },
        select: { id: true },
      });
      recipients = operators.map((o) => o.id);
    } else if (targetType === 'SHIFT') {
      if (!targetId) return { success: false, error: 'Target shift wajib dipilih.' };
      const shift = await prisma.shift.findUnique({ where: { id: targetId } });
      if (!shift) return { success: false, error: 'Shift target tidak ditemukan.' };

      const schedules = await prisma.schedule.findMany({
        where: { shiftId: targetId, date: startAt, status: 'WORK' },
        select: { userId: true },
      });
      recipients = [...new Set(schedules.map((s) => s.userId))];
    } else {
      if (!targetId) return { success: false, error: 'Operator target wajib dipilih.' };
      const operator = await prisma.user.findUnique({ where: { id: targetId } });
      if (!operator || operator.role !== 'OPERATOR') {
        return { success: false, error: 'Operator target tidak valid.' };
      }
      recipients = [operator.id];
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        priority: parse.data.priority,
        targetType,
        targetId: targetType === 'ALL' ? null : targetId,
        startAt: new Date(`${startAt}T00:00:00+07:00`),
        endAt: parse.data.endAt ? new Date(`${parse.data.endAt}T23:59:59+07:00`) : null,
        createdById: manager.id,
        isActive: true,
      },
    });

    // Notify targeted operators (ANNOUNCEMENT type)
    for (const userId of recipients) {
      await createNotification({
        userId,
        type: NotificationType.ANNOUNCEMENT,
        title: `Pengumuman${parse.data.priority === 'URGENT' ? ' URGENT' : ''}: ${title}`,
        message,
        link: '/notifications',
      });
    }

    await recordAuditLog({
      userId: manager.id,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: announcement.id,
      metadata: { title, priority: parse.data.priority, targetType, targetId, recipients: recipients.length },
    });

    revalidatePath('/manager/announcements');
    revalidatePath('/manager/dashboard');
    revalidatePath('/operator/dashboard');
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal membuat pengumuman.',
    };
  }
}

/** Soft-deactivates an announcement (MANAGER only) */
export async function deactivateAnnouncementAction(announcementId: string) {
  try {
    const manager = await requireRole(['MANAGER', 'ADMIN']);
    const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing) return { success: false, error: 'Pengumuman tidak ditemukan.' };

    await prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: false },
    });

    await recordAuditLog({
      userId: manager.id,
      action: 'DEACTIVATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: announcementId,
      metadata: { title: existing.title },
    });

    revalidatePath('/manager/announcements');
    revalidatePath('/manager/dashboard');
    revalidatePath('/operator/dashboard');
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menonaktifkan pengumuman.',
    };
  }
}
