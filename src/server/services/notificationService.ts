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
