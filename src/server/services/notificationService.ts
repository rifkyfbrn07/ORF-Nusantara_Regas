import { prisma } from '@/lib/db/prisma';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      isRead: false,
    },
  });
}

export async function notifyAllManagers(type: NotificationType, title: string, message: string, link?: string) {
  const managers = await prisma.user.findMany({
    where: { role: 'MANAGER', isActive: true },
    select: { id: true },
  });

  if (managers.length === 0) return;

  return prisma.notification.createMany({
    data: managers.map((m) => ({
      userId: m.id,
      type,
      title,
      message,
      link,
      isRead: false,
    })),
  });
}

export async function getUserNotifications(userId: string, limit = 20) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { notifications, unreadCount };
}

export async function markNotificationAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

// ============================================================================
// PERSONAL NOTIFICATION — kirim pemberitahuan ke user tertentu / semua operator
// Otorisasi dilakukan di action layer; scope recipient dibatasi per role sender:
// - ADMIN   -> siapa saja (termasuk MANAGER & ADMIN lain)
// - MANAGER -> hanya OPERATOR
// ============================================================================

export interface SendPersonalParams {
  senderId: string;
  senderRole: 'ADMIN' | 'MANAGER';
  recipientIds: string[]; // bisa berisi sentinel 'ALL_OPERATORS'
  title: string;
  message: string;
  link?: string;
}

export async function sendPersonalNotifications(params: SendPersonalParams) {
  const { senderRole, recipientIds, title, message, link } = params;

  let targetIds: string[];
  if (recipientIds.includes('ALL_OPERATORS')) {
    const operators = await prisma.user.findMany({
      where: { role: 'OPERATOR', isActive: true },
      select: { id: true },
    });
    targetIds = operators.map((o) => o.id);
  } else {
    const users = await prisma.user.findMany({
      where: { id: { in: recipientIds }, isActive: true },
      select: { id: true, role: true },
    });
    const allowed = senderRole === 'ADMIN' ? users : users.filter((u) => u.role === 'OPERATOR');
    targetIds = allowed.map((u) => u.id);
  }

  if (targetIds.length === 0) {
    throw new Error('Tidak ada penerima valid (manager hanya dapat mengirim ke operator).');
  }

  await prisma.notification.createMany({
    data: targetIds.map((userId) => ({
      userId,
      type: 'SYSTEM' as const,
      title,
      message,
      link: link || '/notifications',
      isRead: false,
    })),
  });

  return { sent: targetIds.length };
}

/** Statistik notifikasi untuk dashboard admin */
export async function getNotificationStats() {
  const [unread, total, announcements] = await Promise.all([
    prisma.notification.count({ where: { isRead: false } }),
    prisma.notification.count(),
    prisma.announcement.count({ where: { isActive: true } }),
  ]);
  return { unread, total, announcements };
}

/** Daftar notifikasi terbaru seluruh sistem (khusus ADMIN) */
export async function getAllNotifications(limit = 50) {
  return prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, username: true, role: true } },
    },
  });
}
