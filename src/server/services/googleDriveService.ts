import { promises as fs } from 'fs';
import path from 'path';

export interface UploadFileOptions {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderCategory: 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA';
  departmentName?: string;
  subCategory?: string; // e.g., Employee Name or Jenis Laporan
  year?: number | string;
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

// MIME Types allowed
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Sanitizes a filename to prevent directory traversal and illegal characters
 */
export function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || `file_${Date.now()}`;
}

/**
 * Validates uploaded file MIME type and size
 */
export function validateProofFile(fileName: string, mimeType: string, fileSize: number): void {
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new Error('Format file tidak didukung. Harap unggah file PDF, PNG, atau JPG/JPEG.');
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error('Ukuran file terlalu besar. Maksimum ukuran file adalah 10 MB.');
  }
  if (!fileName || fileName.trim().length === 0) {
    throw new Error('Nama file tidak valid.');
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
 * Uploads a file buffer to Google Drive or local storage fallback
 */
export async function uploadFileToStorage(options: UploadFileOptions): Promise<DriveFileMetadata> {
  const sanitizedName = sanitizeFileName(options.fileName);
  const fileSize = options.fileBuffer.length;
  validateProofFile(sanitizedName, options.mimeType, fileSize);

  const year = options.year || new Date().getFullYear().toString();
  const department = options.departmentName?.trim() || 'General';
  const subCat = options.subCategory?.trim() || 'Uncategorized';
  const categoryFolder = options.folderCategory === 'SURAT_CUTI'
    ? 'Surat Cuti'
    : options.folderCategory === 'LAPORAN'
      ? 'Laporan'
      : options.folderCategory === 'PROGRAM_KERJA'
        ? 'Program Kerja'
        : 'Penukaran Shift';

  const folderPath = `Distribusi Gas & ORF/${categoryFolder}/${year}/${department}/${subCat}`;
  const timestamp = Date.now();
  const storedFileName = `${timestamp}_${sanitizedName}`;

  // Try Google Drive
  const accessToken = await getGoogleDriveAccessToken();
  if (accessToken) {
    try {
      const rootEnvFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const rootFolderId = await getOrCreateDriveFolder(accessToken, 'Distribusi Gas & ORF', rootEnvFolder);
      const catFolderId = await getOrCreateDriveFolder(accessToken, categoryFolder, rootFolderId);
      const yearFolderId = await getOrCreateDriveFolder(accessToken, String(year), catFolderId);
      const deptFolderId = await getOrCreateDriveFolder(accessToken, department, yearFolderId);
      const targetFolderId = await getOrCreateDriveFolder(accessToken, subCat, deptFolderId);

      // Upload file multipart
      const boundary = `-------314159265358979323846`;
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: storedFileName,
        mimeType: options.mimeType,
        parents: [targetFolderId],
      };

      const multipartRequestBody = Buffer.concat([
        Buffer.from(
          `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
            metadata
          )}`
        ),
        Buffer.from(
          `${delimiter}Content-Type: ${options.mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`
        ),
        Buffer.from(options.fileBuffer.toString('base64')),
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

      if (uploadRes.ok) {
        const driveData = await uploadRes.json();
        return {
          fileId: driveData.id,
          fileName: sanitizedName,
          mimeType: options.mimeType,
          fileSize,
          webViewLink:
            driveData.webViewLink || `https://drive.google.com/file/d/${driveData.id}/view`,
          webContentLink: driveData.webContentLink,
          folderPath,
          uploadedAt: new Date(),
          isDriveStorage: true,
        };
      }
    } catch (driveErr) {
      console.warn('[GoogleDriveService] Upload to Google Drive API failed, falling back to local storage:', driveErr);
    }
  }

  // Local Storage Fallback (Offline / Development)
  const localRelativeDir = path.join('uploads', categoryFolder.toLowerCase().replace(/\s+/g, '-'), String(year));
  const localAbsDir = path.join(process.cwd(), 'public', localRelativeDir);
  await fs.mkdir(localAbsDir, { recursive: true });

  const localFilePath = path.join(localAbsDir, storedFileName);
  await fs.writeFile(localFilePath, options.fileBuffer);

  const localUrl = `/${localRelativeDir.replace(/\\/g, '/')}/${storedFileName}`;
  const mockFileId = `local_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    fileId: mockFileId,
    fileName: sanitizedName,
    mimeType: options.mimeType,
    fileSize,
    webViewLink: localUrl,
    webContentLink: localUrl,
    folderPath,
    uploadedAt: new Date(),
    isDriveStorage: false,
  };
}
