'use server';

import { requireAuth, requireRole, type SessionUser } from '@/lib/auth/session';
import type { Role } from '@prisma/client';
import {
  uploadEvidenceToBlob,
  isStorageConfigured,
  buildStorageConfigMessage,
  type BlobEvidenceMetadata,
} from '../services/vercelBlobService';
import { recordAuditLog } from '../services/auditService';
import type { EvidenceCategory } from '../services/evidenceValidation';

const ALLOWED_CATEGORIES = new Set<string>(['SURAT_CUTI', 'LAPORAN', 'SHIFT_EXCHANGE', 'PROGRAM_KERJA']);

/**
 * Role gate per kategori evidence (authorization server-side, bukan sekadar
 * hidden button di frontend):
 * - SURAT_CUTI      → semua user authenticated (operator upload bukti miliknya;
 *                     manager/admin upload atas nama operator).
 * - PROGRAM_KERJA   → MANAGER / ADMIN saja (operator program read-only).
 * - LAPORAN         → MANAGER / ADMIN saja (halaman laporan = area manager).
 * - SHIFT_EXCHANGE  → semua user authenticated (operator mengajukan tukar shift).
 */
const ROLE_GATES: Partial<Record<EvidenceCategory, Role[]>> = {
  PROGRAM_KERJA: ['MANAGER', 'ADMIN'],
  LAPORAN: ['MANAGER', 'ADMIN'],
};

export async function uploadEvidenceFileAction(formData: FormData): Promise<{
  success: boolean;
  file?: BlobEvidenceMetadata;
  error?: string;
}> {
  try {
    const category = (formData.get('folderCategory') as string) || 'SURAT_CUTI';
    if (!ALLOWED_CATEGORIES.has(category)) {
      return { success: false, error: 'Kategori bukti tidak valid.' };
    }
    const folderCategory = category as EvidenceCategory;

    const user: SessionUser = await requireAuth();
    const gate = ROLE_GATES[folderCategory];
    if (gate) {
      // Throw akan tertangkap catch → error "tidak berwenang".
      await requireRole(gate);
    }

    if (!isStorageConfigured()) {
      return { success: false, error: buildStorageConfigMessage() };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'Berkas tidak ditemukan dalam formulir unggahan.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await uploadEvidenceToBlob({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileBuffer,
      folderCategory,
      uploaderUsername: user.username,
      descriptiveName: (formData.get('descriptiveName') as string) || undefined,
      subCategory: (formData.get('subCategory') as string) || user.name || 'Staff',
    });

    // Audit: evidence uploaded (nooit tokens/credentials in metadata).
    await recordAuditLog({
      userId: user.id,
      action: 'EVIDENCE_UPLOADED',
      entity: 'EvidenceFile',
      entityId: result.storagePath,
      metadata: {
        category: folderCategory,
        fileName: result.fileName,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        storageProvider: result.storageProvider,
      },
    });

    return { success: true, file: result };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengunggah berkas bukti.',
    };
  }
}