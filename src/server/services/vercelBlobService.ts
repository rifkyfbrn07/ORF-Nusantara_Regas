import { put, get, del, type GetBlobResult } from '@vercel/blob';
import {
  type EvidenceCategory,
  CATEGORY_STORAGE_PREFIX,
  buildStoragePath,
  validateEvidenceFile,
} from './evidenceValidation';

export const EVIDENCE_STORAGE_PROVIDER = 'vercel_blob';

/**
 * True ketika Vercel Blob terkonfigurasi:
 * - BLOB_READ_WRITE_TOKEN (diinject otomatis oleh Vercel saat Blob Store di-attach), atau
 * - VERCEL_OIDC_TOKEN + BLOB_STORE_ID (OIDC auth).
 * Token TIDAK pernah dikirim ke browser.
 */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN);
}

export interface BlobEvidenceMetadata {
  storageProvider: 'vercel_blob';
  storagePath: string;
  storageUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  isDriveStorage: boolean;
}

export interface EvidenceUploadOptions {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderCategory: EvidenceCategory;
  uploaderUsername?: string;
  descriptiveName?: string;
  subCategory?: string;
}

/**
 * Upload evidence ke Vercel Blob (PRIVATE). Dipanggil server-side saja.
 * - access: 'private' → file tidak publik; hanya bisa dibaca dengan token.
 * - pathname unik (uuid) → tidak pernah overwrite file lama.
 */
export async function uploadEvidenceToBlob(options: EvidenceUploadOptions): Promise<BlobEvidenceMetadata> {
  if (!isStorageConfigured()) {
    throw new Error('Storage evidence belum dikonfigurasi di server.');
  }
  if (!CATEGORY_STORAGE_PREFIX[options.folderCategory]) {
    throw new Error('Kategori bukti tidak valid.');
  }

  const normalizedMime = validateEvidenceFile(
    options.fileName,
    options.mimeType,
    options.fileBuffer.length,
    options.fileBuffer
  );

  const { storagePath, fileName } = buildStoragePath({
    category: options.folderCategory,
    originalName: options.fileName,
    uploaderUsername: options.uploaderUsername,
    descriptiveName: options.descriptiveName,
    subCategory: options.subCategory,
    mimeType: normalizedMime,
  });

  const blob = await put(storagePath, options.fileBuffer, {
    access: 'private',
    contentType: normalizedMime,
    addRandomSuffix: false,
  });

  return {
    storageProvider: EVIDENCE_STORAGE_PROVIDER as 'vercel_blob',
    storagePath: blob.pathname,
    storageUrl: blob.url,
    fileName,
    mimeType: normalizedMime,
    fileSize: options.fileBuffer.length,
    uploadedAt: new Date(),
    isDriveStorage: false,
  };
}

/** Ambil stream blob private berdasarkan pathname. */
export async function getEvidenceStream(pathname: string): Promise<GetBlobResult> {
  if (!isStorageConfigured()) {
    throw new Error('Storage evidence belum dikonfigurasi di server.');
  }
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    throw new Error('FILE_NOT_FOUND');
  }
  return result;
}

/** Hapus blob (rollback / cleanup). */
export async function deleteEvidenceBlob(pathnameOrUrl: string): Promise<void> {
  await del(pathnameOrUrl);
}

/**
 * Rollback safety-net: jika metadata-write di DB gagal SETELAH upload blob
 * sukses → hapus blob tersebut, KECUALI sudah dirujuk record lain (edit-flow).
 * Tidak meninggalkan "evidence record palsu".
 */
export async function rollbackBlobIfUnreferenced(storagePath: string): Promise<{ deleted: boolean; referenced: boolean }> {
  const { prisma } = await import('@/lib/db/prisma');
  const [leave, exchange, program, progressLog, report] = await Promise.all([
    prisma.leaveRequest.count({ where: { storagePath } }),
    prisma.shiftExchange.count({ where: { storagePath } }),
    prisma.programKerja.count({ where: { storagePath } }),
    prisma.programKerjaProgressLog.count({ where: { storagePath } }),
    prisma.operationalReport.count({ where: { storagePath } }),
  ]);
  const referenced = leave + exchange + program + progressLog + report > 0;
  if (referenced) return { deleted: false, referenced: true };
  try {
    await deleteEvidenceBlob(storagePath);
    return { deleted: true, referenced: false };
  } catch {
    return { deleted: false, referenced: false };
  }
}