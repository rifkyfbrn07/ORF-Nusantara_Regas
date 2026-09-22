import { prisma } from '@/lib/db/prisma';
import { NotificationType, Prisma, PrismaClient, Role } from '@prisma/client';

/**
 * Client DB yang digunakan om notificatie te schrijven. Kan de globale
 * PrismaClient zijn OF een transaction-client (Prisma.TransactionClient)
 * zodat notificaties onderdeel zijn van dezelfde atomic database transaction
 * (bijv. bij tukar hari OFF approval / cuti review).
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export const PENDING_CONFIRMATION = 'PENDING';
export const ACCEPTED_CONFIRMATION = 'ACCEPTED';
export const REJECTED_CONFIRMATION = 'REJECTED';
export const PENDING_APPROVAL = 'PENDING';
export const APPROVED_APPROVAL = 'APPROVED';
export const REJECTED_APPROVAL = 'REJECTED';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams, client: DbClient = prisma) {
  return client.notification.create({
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

/** Notify alle actieve users met een van de opgegeven rollen (ADMIN/MANAGER/OPERATOR). */
export async function notifyAllRole(
  roles: Role[],
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  client: DbClient = prisma
) {
  if (roles.length === 0) return;
  // Elke user heeft precies één rol → geen duplicate notifications mogelijk,
  // ook niet als ADMIN én MANAGER samen in `roles` zitten.
  const users = await client.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });
  if (users.length === 0) return;
  return client.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, title, message, link, isRead: false })),
  });
}

export async function notifyAllManagers(type: NotificationType, title: string, message: string, link?: string, client: DbClient = prisma) {
  return notifyAllRole(['MANAGER'], type, title, message, link, client);
}

/** Notify alle managers én admins (bijv. nieuwe cuti/izin pengajuan). */
export async function notifyAllManagersAndAdmins(type: NotificationType, title: string, message: string, link?: string, client: DbClient = prisma) {
  return notifyAllRole(['MANAGER', 'ADMIN'], type, title, message, link, client);
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