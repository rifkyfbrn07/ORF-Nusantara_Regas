import { promises as fs } from 'fs';
import path from 'path';

export type UploadFileCategory = 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA';

export interface UploadFileOptions {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderCategory: UploadFileCategory;
  departmentName?: string;
  subCategory?: string; // e.g., Employee Name or Jenis Laporan
  year?: number | string;
  /** Username dari session yang authenticated — dipakai untuk nama file di Drive. Never from client. */
  uploaderUsername?: string;
  /** Deskripsi tambahan untuk nama file (eg. nama program kerja). */
  descriptiveName?: string;
}

// ============================================================================
// Folder Google Drive tujuan — HARUS ditentukan server-side.
// Client tidak pernah dapat mengirim folderId; folder dipilih berdasarkan
// kategori evidence (upload action hanya pass kategori allowlist).
// ============================================================================

const FIXED_FOLDER_CUTI_IZIN = process.env.GOOGLE_DRIVE_FOLDER_CUTI_IZIN || '1gbu8zKweK9Y5VdMOQZdYqlAen0jaxKsW';
const FIXED_FOLDER_PROGRAM_KERJA = process.env.GOOGLE_DRIVE_FOLDER_PROGRAM_KERJA || '1i2ZZQKBwlQupSFKKB3oM4LP4QXcJ6HaU';

/**
 * Menentukan folder Google Drive tujuan untuk kategori evidence.
 * CUTI/IZIN + PROGRAM KERJA → folder fixed (folder sudah tersedia — jangan buat folder baru).
 * LAPORAN/SHIFT_EXCHANGE → null (struktur direktori dinamik existing tetap dipakai).
 */
export function resolveTargetFolderId(category: UploadFileCategory): string | null {
  if (category === 'SURAT_CUTI') return FIXED_FOLDER_CUTI_IZIN;
  if (category === 'PROGRAM_KERJA') return FIXED_FOLDER_PROGRAM_KERJA;
  return null;
}

export interface DriveFileMetadata {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  webViewLink: string;
  webContentLink?: string;
  folderPath: string;
  uploadedAt: Date;
  isDriveStorage: boolean;
}

export async function getStoredFileContent(fileId: string): Promise<Response> {
  const accessToken = await getGoogleDriveAccessToken();
  if (!accessToken) {
    throw new Error('Penyimpanan Google Drive belum dikonfigurasi.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (response.status === 404) throw new Error('FILE_NOT_FOUND');
  if (response.status === 401 || response.status === 403) throw new Error('FILE_ACCESS_DENIED');
  if (!response.ok || !response.body) throw new Error('FILE_RETRIEVAL_FAILED');
  return response;
}

// MIME Types allowed
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Normalize MIME type deklarasi (eg. image/jpg → image/jpeg). */
export function normalizeMimeType(raw: string): string {
  const mime = raw.trim().toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  return mime;
}

/**
 * Sniff MIME type dari magic bytes file — validasi server-side.
 * Jangan percaya MIME type dari client saja.
 */
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

/** Maps MIME → extension canonical (untuk nama file mudah dilacak). */
export function extensionForMime(mime: string): string {
  const m = normalizeMimeType(mime);
  if (m === 'application/pdf') return '.pdf';
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  return '';
}

/**
 * Sanitizes a filename to prevent directory traversal and illegal characters
 */
export function sanitizeFileName(name: string): string {
  const base = path.basename((name || '').replace(/\\/g, '/')).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || `file_${new Date().getTime()}`;
}

/** Keep only [a-z0-9-] untuk slug (nama program, username...). */
export function slugify(value: string | null | undefined, fallback = 'dokumen'): string {
  const slug = (value || '')
    .toLowerCase()
    .normalize('NFKD')
    // eslint-disable-next-line no-control-regex
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug.slice(0, 80) || fallback;
}

/**
 * Build nama file yang mudah dilacak di Google Drive, sanitized:
 *   CUTI/IZIN      → 2026-09-17_username_surat-cuti.pdf
 *   PROGRAM KERJA  → 2026-09-17_username_program-name_bukti.jpg
 *   LAPORAN        → 2026-09-17_username_laporan-bulanan.pdf
 *   SHIFT_EXCHANGE → 2026-09-17_username_penukaran-shift-...jpg
 */
export function buildDriveFileName(options: {
  category: UploadFileCategory;
  originalName: string;
  uploaderUsername?: string;
  subCategory?: string;
  descriptiveName?: string;
  mimeType?: string;
  date?: Date;
}): string {
  const original = sanitizeFileName(options.originalName);
  const extFromName = path.extname(original).toLowerCase();
  const safeExt = extFromName && /^\.[a-z0-9]{1,10}$/.test(extFromName) ? extFromName : '';
  const ext = safeExt || extensionForMime(options.mimeType || '');

  const date = options.date ?? new Date();
  const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const user = slugify(options.uploaderUsername, 'staff');

  let tag: string;
  if (options.category === 'SURAT_CUTI') {
    tag = 'surat-cuti';
  } else if (options.category === 'PROGRAM_KERJA') {
    tag = `${slugify(options.descriptiveName || options.subCategory, 'program')}-bukti`;
  } else if (options.category === 'LAPORAN') {
    tag = `laporan-${slugify(options.subCategory, 'operasional')}`;
  } else {
    tag = `penukaran-shift-${slugify(options.subCategory, 'bukti')}`;
  }

  const stem = ext ? original.slice(0, original.length - ext.length) : original;
  const stemSlug = slugify(stem.replace(/[^a-zA-Z0-9._-]/g, ' '), 'dokumen');
  return `${ymd}_${user}_${tag}.${stemSlug}${ext}`;
}

/**
 * Validates uploaded file — MIME type, ukuran, nama, dan konten (magic bytes).
 * Validasi dilakukan ulang di server (client MIME type tidak dipercaya).
 */
export function validateProofFile(
  fileName: string,
  mimeType: string,
  fileSize: number,
  buffer?: Buffer
): void {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized || !ALLOWED_MIME_TYPES.has(normalized)) {
    throw new Error('Format file tidak didukung. Harap unggah file PDF, PNG, WEBP, atau JPG/JPEG.');
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error('Ukuran file terlalu besar. Maksimum ukuran file adalah 10 MB.');
  }
  if (!fileName || fileName.trim().length === 0) {
    throw new Error('Nama file tidak valid.');
  }
  if (buffer && buffer.length > 0) {
    const sniffed = sniffFileMime(buffer);
    // sniff === null berarti konten tidak diketahui (file kosong sudah dihikan oleh size > 0 check);
    // tetap valid jika deklarasi koresponden dengan extension magic.
    if (sniffed && sniffed !== normalized) {
      throw new Error('Konten file tidak koresponden dengan format yang diunggah. File mungkin rusak atau memiliki extension salah.');
    }
  }
}

/**
 * Get Google Drive Access Token using Service Account JWT or OAuth2 Refresh Token
 */
async function getGoogleDriveAccessToken(): Promise<string | null> {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // 1. OAuth2 Refresh Token flow
  if (clientId && clientSecret && refreshToken) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
    } catch (err) {
      console.warn('[GoogleDriveService] Failed to obtain token via refresh_token:', err);
    }
  }

  // 2. Service Account JWT flow
  if (serviceAccountEmail && privateKey) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: 'RS256', typ: 'JWT' };
      const claimSet = {
        iss: serviceAccountEmail,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      };

      // Base64Url encode
      const base64Url = (obj: object) =>
        Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');

      const unsignedToken = `${base64Url(header)}.${base64Url(claimSet)}`;

      // Sign with crypto
      const crypto = await import('crypto');
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(unsignedToken);
      sign.end();
      const signature = sign
        .sign(privateKey)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const jwt = `${unsignedToken}.${signature}`;

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.access_token;
      }
    } catch (err) {
      console.warn('[GoogleDriveService] Failed to obtain token via Service Account:', err);
    }
  }

  return null;
}

// In-memory cache for folder IDs to prevent redundant folder creation on Google Drive
const folderIdCache = new Map<string, string>();

/**
 * Finds or creates a folder on Google Drive
 */
async function getOrCreateDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const cacheKey = `${parentFolderId || 'root'}:${folderName}`;
  if (folderIdCache.has(cacheKey)) {
    return folderIdCache.get(cacheKey)!;
  }

  const query = [
    `mimeType = 'application/vnd.google-apps.folder'`,
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    `trashed = false`,
    parentFolderId ? `'${parentFolderId}' in parents` : `'root' in parents`,
  ].join(' and ');

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const id = data.files[0].id;
      folderIdCache.set(cacheKey, id);
      return id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Gagal membuat folder di Google Drive: ${folderName}`);
  }

  const created = await createRes.json();
  folderIdCache.set(cacheKey, created.id);
  return created.id;
}

/**
 * Uploads a file buffer to Google Drive or local storage fallback.
 * SURAT_CUTI / PROGRAM_KERJA → upload langsung ke folder fixed (server-side, folder sudah ditentukan).
 * LAPORAN / SHIFT_EXCHANGE → struktur direktori dinamik existing.
 */
export async function uploadFileToStorage(options: UploadFileOptions): Promise<DriveFileMetadata> {
  const fileSize = options.fileBuffer.length;
  const normalizedMime = normalizeMimeType(options.mimeType);
  validateProofFile(options.fileName, normalizedMime, fileSize, options.fileBuffer);

  const year = options.year || new Date().getFullYear();
  const department = options.departmentName?.trim() || 'General';
  const subCat = options.subCategory?.trim() || 'Uncategorized';
  const fixedFolderId = resolveTargetFolderId(options.folderCategory);

  const folderPath = fixedFolderId
    ? (options.folderCategory === 'SURAT_CUTI' ? 'CUTI_IZIN' : 'PROGRAM_KERJA')
    : `Distribusi Gas & ORF/${categoryLabel(options.folderCategory)}/${year}/${department}/${subCat}`;

  // Nama file mudah dilacak + sanitized (unique name diperoleh sebelum upload — jangan overwrite).
  const storedFileName = buildDriveFileName({
    category: options.folderCategory,
    originalName: options.fileName,
    uploaderUsername: options.uploaderUsername,
    subCategory: options.subCategory,
    descriptiveName: options.descriptiveName,
    mimeType: normalizedMime,
  });

  // Try Google Drive
  const accessToken = await getGoogleDriveAccessToken();
  if (accessToken) {
    try {
      let targetFolderId: string;
      if (fixedFolderId) {
        // Folder tujuan sudah ditentukan — jangan membuat folder baru di Drive.
        targetFolderId = fixedFolderId;
      } else {
        const rootEnvFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const rootFolderId = await getOrCreateDriveFolder(accessToken, 'Distribusi Gas & ORF', rootEnvFolder);
        const catFolderId = await getOrCreateDriveFolder(accessToken, categoryLabel(options.folderCategory), rootFolderId);
        const yearFolderId = await getOrCreateDriveFolder(accessToken, String(year), catFolderId);
        const deptFolderId = await getOrCreateDriveFolder(accessToken, department, yearFolderId);
        targetFolderId = await getOrCreateDriveFolder(accessToken, subCat, deptFolderId);
      }

      const uniqueName = await ensureUniqueFileName(accessToken, targetFolderId, storedFileName);
      const uploaded = await uploadMultipart(accessToken, targetFolderId, uniqueName, normalizedMime, options.fileBuffer);
      if (uploaded) {
        return {
          fileId: uploaded.id,
          fileName: uniqueName,
          mimeType: normalizedMime,
          fileSize,
          webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
          webContentLink: uploaded.webContentLink,
          folderPath: `${folderPath}/${uniqueName}`,
          uploadedAt: new Date(),
          isDriveStorage: true,
        };
      }
    } catch (driveErr) {
      console.warn('[GoogleDriveService] Upload to Google Drive API failed, falling back to local storage:', driveErr);
    }
  }

  // A filesystem is not durable on Vercel. Keep the fallback strictly local for development.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Google Drive belum dikonfigurasi. Unggahan bukti memerlukan penyimpanan persisten.');
  }

  // Local development fallback only.
  const localCategoryDir = fixedFolderId
    ? (options.folderCategory === 'SURAT_CUTI' ? 'cuti-izin' : 'program-kerja')
    : categoryLabel(options.folderCategory).toLowerCase().replace(/\s+/g, '-');
  const localRelativeDir = path.join('uploads', localCategoryDir, String(year));
  const localAbsDir = path.join(process.cwd(), 'public', localRelativeDir);
  await fs.mkdir(localAbsDir, { recursive: true });

  const localStoreName = await ensureUniqueLocalFileName(localAbsDir, storedFileName);
  const localFilePath = path.join(localAbsDir, localStoreName);
  await fs.writeFile(localFilePath, options.fileBuffer);

  const localUrl = `/${localRelativeDir.replace(/\\/g, '/')}/${localStoreName}`;
  const mockFileId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    fileId: mockFileId,
    fileName: localStoreName,
    mimeType: normalizedMime,
    fileSize,
    webViewLink: localUrl,
    webContentLink: localUrl,
    folderPath: `${folderPath}/${localStoreName}`,
    uploadedAt: new Date(),
    isDriveStorage: false,
  };
}

function categoryLabel(category: UploadFileCategory): string {
  return category === 'SURAT_CUTI'
    ? 'Surat Cuti'
    : category === 'LAPORAN'
      ? 'Laporan'
      : category === 'PROGRAM_KERJA'
        ? 'Program Kerja'
        : 'Penukaran Shift';
}

/**
 * Upload multipart ke folder Google Drive target.
 * Google Drive API always creates a NEW file — tidak pernah overwrite file existing.
 */
async function uploadMultipart(
  accessToken: string,
  folderId: string,
  storedFileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<{ id: string; name: string; webViewLink?: string; webContentLink?: string } | null> {
  const boundary = `-------314159265358979323846-${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = { name: storedFileName, mimeType, parents: [folderId] };

  const multipartRequestBody = Buffer.concat([
    Buffer.from(`${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`),
    Buffer.from(`${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
    Buffer.from(fileBuffer.toString('base64')),
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(
      `Google Drive menolak upload (status ${uploadRes.status}). Verifikasi service account memiliki akses WRITE ke folder tujuan: ${body.slice(0, 300)}`
    );
  }
  const driveData = await uploadRes.json();
  return {
    id: driveData.id as string,
    name: driveData.name as string,
    webViewLink: driveData.webViewLink as string | undefined,
    webContentLink: driveData.webContentLink as string | undefined,
  };
}
/**
 * Liste nama file dalam folder (untuk detect collision name).
 */
async function listFileNamesInFolder(accessToken: string, folderId: string): Promise<Set<string>> {
  const pageSize = 1000;
  let pageToken: string | null = null;
  const names = new Set<string>();
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const base = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(name)&pageSize=${pageSize}`;
    const url: string = pageToken ? `${base}&pageToken=${encodeURIComponent(pageToken)}` : base;
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) break;
    const data: { files?: { name?: string }[]; nextPageToken?: string } = await res.json();
    for (const f of data.files ?? []) names.add(f.name as string);
    pageToken = data.nextPageToken ? data.nextPageToken : null;
  } while (pageToken);
  return names;
}

/**
 * Garante nama file unik di folder Drive — jangan overwrite file existing.
 * Jika nama sudah ada → append -2, -3, ... sehingga file lama tetap tersimpan.
 */
async function ensureUniqueFileName(accessToken: string, folderId: string, desiredName: string): Promise<string> {
  const names = await listFileNamesInFolder(accessToken, folderId);
  if (!names.has(desiredName)) return desiredName;
  const dot = desiredName.lastIndexOf('.');
  const stem = dot > 0 ? desiredName.slice(0, dot) : desiredName;
  const ext = dot > 0 ? desiredName.slice(dot) : '';
  let counter = 2;
  while (names.has(`${stem}-${counter}${ext}`)) counter += 1;
  return `${stem}-${counter}${ext}`;
}

/** Local fallback uniquename (development only). */
async function ensureUniqueLocalFileName(dir: string, desiredName: string): Promise<string> {
  const exists = async (name: string) => {
    try {
      await fs.access(path.join(dir, name));
      return true;
    } catch {
      return false;
    }
  };
  if (!(await exists(desiredName))) return desiredName;
  const dot = desiredName.lastIndexOf('.');
  const stem = dot > 0 ? desiredName.slice(0, dot) : desiredName;
  const ext = dot > 0 ? desiredName.slice(dot) : '';
  let counter = 2;
  while (await exists(`${stem}-${counter}${ext}`)) counter += 1;
  return `${stem}-${counter}${ext}`;
}

/**
 * Delete file dari Google Drive (cleanup smoke test). Returns false jika tidak ada credential.
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const accessToken = await getGoogleDriveAccessToken();
  if (!accessToken) return false;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.ok || res.status === 404;
}
