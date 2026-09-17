import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { isStorageConfigured } from '@/server/services/vercelBlobService';
import { isGoogleDriveConfigured, resolveTargetFolderId } from '@/server/services/googleDriveService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/storage-status — server-side diagnostic (ADMIN only).
 * Retourneert alleen booleans/config status. NOOIT geheimen.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json({
    // Vercel Blob adalah persistent storage utama untuk evidence baru.
    blobStorageConfigured: isStorageConfigured(),
    googleDriveConfigured: isGoogleDriveConfigured(), // legacy / historical records
    cutiFolderConfigured: Boolean(resolveTargetFolderId('SURAT_CUTI')),
    programKerjaFolderConfigured: Boolean(resolveTargetFolderId('PROGRAM_KERJA')),
  });
}