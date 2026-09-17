import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Validasi & utilitas evidence — storage-agnostic (tidak bergantung pada
 * Google Drive maupun Vercel Blob). Dipakai oleh seluruh alur upload evidence.
 */

export type EvidenceCategory = 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA';

export const ALLOWED_EVIDENCE_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/** Batas ukuran file evidence — konsisten dengan bodySizeLimit server actions. */
export const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; // 10 MB

export function normalizeMimeType(raw: string): string {
  const mime = raw.trim().toLowerCase();
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

/** Sniff MIME dari magic bytes — jangan percaya MIME client saja. */
export function sniffFileMime(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function sanitizeFileName(name: string): string {
  const base = path.basename((name || '').replace(/\\/g, '/')).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || `file_${new Date().getTime()}`;
}

export function slugify(value: string | null | undefined, fallback = 'dokumen'): string {
  const slug = (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug.slice(0, 80) || fallback;
}

export function extensionForMime(mime: string): string {
  const m = normalizeMimeType(mime);
  if (m === 'application/pdf') return '.pdf';
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  return '';
}

/** Validasi MIME + extension + ukuran + nama + konten (magic bytes). */
export function validateEvidenceFile(
  fileName: string,
  mimeType: string,
  fileSize: number,
  buffer?: Buffer
): string {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized || !ALLOWED_EVIDENCE_MIMES.has(normalized)) {
    throw new Error('Format file tidak didukung. Harap unggah file PDF, JPG/JPEG, PNG, atau WEBP.');
  }
  if (fileSize > MAX_EVIDENCE_SIZE) {
    throw new Error(`Ukuran file terlalu besar. Maksimum ukuran file adalah 10 MB.`);
  }
  const safeName = sanitizeFileName(fileName);
  if (!safeName) throw new Error('Nama file tidak valid.');

  const ext = path.extname(safeName).toLowerCase();
  const mimeExt = extensionForMime(normalized);
  if (ext && mimeExt && ext !== mimeExt && !(mimeExt === '.jpg' && ext === '.jpeg')) {
    throw new Error('Extension file tidak sesuai dengan format file.');
  }

  if (buffer && buffer.length > 0) {
    const sniffed = sniffFileMime(buffer);
    if (sniffed && sniffed !== normalized) {
      throw new Error('Konten file tidak sesuai dengan format yang diunggah.');
    }
  }
  return normalized;
}

export const CATEGORY_STORAGE_PREFIX: Record<EvidenceCategory, string> = {
  SURAT_CUTI: 'cuti-izin',
  LAPORAN: 'laporan',
  SHIFT_EXCHANGE: 'shift-exchange',
  PROGRAM_KERJA: 'program-kerja',
};

/**
 * Path virtual di Vercel Blob:
 *   evidence/cuti-izin/2026/09/username-surat-izin-uuid.pdf
 *   evidence/program-kerja/2026/09/program-name-uuid.jpg
 * Sanitized + unique (uuid8) — tidak akan bentrok / overwrite.
 */
export function buildStoragePath(options: {
  category: EvidenceCategory;
  originalName: string;
  uploaderUsername?: string;
  descriptiveName?: string;
  subCategory?: string;
  mimeType: string;
  date?: Date;
}): { storagePath: string; fileName: string } {
  const original = sanitizeFileName(options.originalName);
  const extFromName = path.extname(original).toLowerCase();
  const mimeExt = extensionForMime(options.mimeType);
  const ext = extFromName && /^\.[a-z0-9]{1,10}$/.test(extFromName) ? extFromName : (mimeExt || '');
  const stem = ext ? original.slice(0, original.length - ext.length) : original;
  const stemSlug = slugify(stem.replace(/[^a-zA-Z0-9._-]/g, ' '), 'dokumen');

  const date = options.date ?? new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const user = slugify(options.uploaderUsername, 'staff');

  let label: string;
  if (options.category === 'SURAT_CUTI') {
    label = `${user}-surat-izin`;
  } else if (options.category === 'PROGRAM_KERJA') {
    label = `${slugify(options.descriptiveName || options.subCategory, 'program')}-bukti`;
  } else if (options.category === 'LAPORAN') {
    label = `${user}-laporan-${slugify(options.subCategory, 'operasional')}`;
  } else {
    label = `${user}-shift-exchange-${slugify(options.subCategory, 'bukti')}`;
  }

  const prefix = CATEGORY_STORAGE_PREFIX[options.category];
  const uniqueId = randomUUID().replace(/-/g, '').slice(0, 12);
  return {
    storagePath: `evidence/${prefix}/${yyyy}/${mm}/${label}-${stemSlug}-${uniqueId}${ext}`,
    fileName: `${stemSlug}${ext}`,
  };
}