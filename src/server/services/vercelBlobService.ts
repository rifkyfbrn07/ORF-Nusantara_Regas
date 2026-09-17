import { put, get, del, type GetBlobResult } from '@vercel/blob';
import {
  type EvidenceCategory,
  CATEGORY_STORAGE_PREFIX,
  buildStoragePath,
  validateEvidenceFile,
} from './evidenceValidation';

export const EVIDENCE_STORAGE_PROVIDER = 'vercel_blob';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value ? value.trim() : undefined;
}

/**
 * True wanneer Vercel Blob is geconfigureerd:
 * - BLOB_READ_WRITE_TOKEN (wordt door Vercel automatisch geinjecteerd via
 *   Project → Storage → Blob Store, voor Production/Preview/Development), of
 * - VERCEL_OIDC_TOKEN + BLOB_STORE_ID (OIDC auth).
 * Token wordt NOOIT naar de browser gestuurd.
 */
export function isStorageConfigured(): boolean {
  return Boolean(readEnv('BLOB_READ_WRITE_TOKEN') || (readEnv('VERCEL_OIDC_TOKEN') && readEnv('BLOB_STORE_ID')));
}

/**
 * Retourneert NAMEN van ontbrekende env vars (nooit waarden/token).
 */
export function getMissingBlobConfigVars(): string[] {
  if (isStorageConfigured()) return [];
  const missing: string[] = [];
  if (!readEnv('BLOB_READ_WRITE_TOKEN')) {
    missing.push('BLOB_READ_WRITE_TOKEN (Vercel → Project → Storage → Blob Store)');
  }
  if (!readEnv('VERCEL_OIDC_TOKEN')) missing.push('VERCEL_OIDC_TOKEN');
  if (!readEnv('BLOB_STORE_ID')) missing.push('BLOB_STORE_ID');
  return missing;
}

/** Foutmelding - zegt WELKE Blob env var mist, zonder token te tonen. */
export function buildStorageConfigMessage(): string {
  const missing = getMissingBlobConfigVars();
  const detail = missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '';
  return `Storage evidence belum dikonfigurasi di server.${detail}`;
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
    throw new Error(buildStorageConfigMessage());
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
    throw new Error(buildStorageConfigMessage());
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