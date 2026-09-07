'use server';

import { requireAuth } from '@/lib/auth/session';
import { markNotificationAsRead, markAllNotificationsAsRead, getUserNotifications } from '../services/notificationService';
import { revalidatePath } from 'next/cache';

export async function markNotificationReadAction(notificationId: string) {
  try {
    const user = await requireAuth();
    await markNotificationAsRead(notificationId, user.id);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menandai notifikasi dibaca.' };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await requireAuth();
    await markAllNotificationsAsRead(user.id);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menandai semua notifikasi dibaca.' };
  }
}

export async function getHeaderNotificationsAction() {
  try {
    const user = await requireAuth();
    return await getUserNotifications(user.id, 10);
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}
