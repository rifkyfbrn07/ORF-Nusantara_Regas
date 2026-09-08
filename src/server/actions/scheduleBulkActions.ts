'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import {
  bulkCreateSchedules,
  validateImportRows,
  confirmImportRows,
  type ImportRowInput,
} from '../services/bulkScheduleService';
import { sendPersonalNotifications } from '../services/notificationService';

const ROLES = ['MANAGER', 'ADMIN'] as const;

function revalidateSchedules() {
  revalidatePath('/manager/schedules');
  revalidatePath('/manager/jadwal-operator');
  revalidatePath('/manager/dashboard');
  revalidatePath('/manager/workforce');
  revalidatePath('/operator/schedule');
  revalidatePath('/operator/jadwal-saya');
  revalidatePath('/admin/dashboard');
}

export interface BulkAddActionInput {
  operatorIds: string[];
  startDate: string;
  endDate: string;
  locationId: string;
  mode: 'SINGLE_SHIFT' | 'PATTERN';
  shiftId?: string;
  patternKey?: 'REGULAR' | 'FIELD';
  patternOffset?: number;
  weekdays?: number[];
  notes?: string;
}

export async function bulkAddSchedulesAction(input: BulkAddActionInput) {
  try {
    const user = await requireRole([...ROLES]);
    if (!Array.isArray(input.operatorIds) || input.operatorIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu operator.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate || '')) {
      return { success: false as const, error: 'Rentang tanggal tidak valid.' };
    }
    if (input.startDate > input.endDate) {
      return { success: false as const, error: 'Tanggal mulai melebihi tanggal selesai.' };
    }
    if (input.mode === 'SINGLE_SHIFT' && !input.shiftId) {
      return { success: false as const, error: 'Shift wajib dipilih.' };
    }
    if (input.mode === 'PATTERN' && !input.patternKey) {
      return { success: false as const, error: 'Work pattern wajib dipilih.' };
    }
    const result = await bulkCreateSchedules({ ...input, creatorId: user.id });
    revalidateSchedules();
    return { success: true as const, result };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal membuat jadwal massal.' };
  }
}

export async function validateImportAction(rows: ImportRowInput[]) {
  try {
    await requireRole([...ROLES]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false as const, error: 'Tidak ada baris untuk divalidasi.' };
    }
    if (rows.length > 2000) {
      return { success: false as const, error: 'Maksimal 2000 baris per import.' };
    }
    const results = await validateImportRows(rows);
    return { success: true as const, results };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memvalidasi.' };
  }
}

export async function confirmImportAction(rows: ImportRowInput[]) {
  try {
    const user = await requireRole([...ROLES]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false as const, error: 'Tidak ada baris untuk diimport.' };
    }
    if (rows.length > 2000) {
      return { success: false as const, error: 'Maksimal 2000 baris per import.' };
    }
    const result = await confirmImportRows(rows, user.id);
    revalidateSchedules();
    return { success: true as const, ...result };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal mengimport jadwal.' };
  }
}

// ============================================================================
// PERSONAL NOTIFICATION (ADMIN/MANAGER → user tertentu)
// ============================================================================

export interface SendNotificationInput {
  recipientIds: string[]; // 1..n user, atau ['ALL_OPERATORS']
  title: string;
  message: string;
  link?: string;
}

export async function sendPersonalNotificationAction(input: SendNotificationInput) {
  try {
    const sender = await requireRole([...ROLES]);
    if (!input.title || input.title.trim().length < 3) {
      return { success: false as const, error: 'Judul minimal 3 karakter.' };
    }
    if (!input.message || input.message.trim().length < 5) {
      return { success: false as const, error: 'Pesan minimal 5 karakter.' };
    }
    if (!Array.isArray(input.recipientIds) || input.recipientIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu penerima.' };
    }

    const result = await sendPersonalNotifications({
      senderId: sender.id,
      senderRole: sender.role as 'ADMIN' | 'MANAGER',
      recipientIds: input.recipientIds,
      title: input.title.trim(),
      message: input.message.trim(),
      link: input.link,
    });
    revalidatePath('/manager/notifications');
    revalidatePath('/notifications');
    return { success: true as const, sent: result.sent };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal mengirim notifikasi.' };
  }
}
