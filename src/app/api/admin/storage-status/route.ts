import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { isGoogleDriveConfigured, resolveTargetFolderId } from '@/server/services/googleDriveService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/storage-status — server-side diagnostic (ADMIN only).
 * Retourneert alleen booleans/config status. NOOIT geheimen:
 * geen private key, client secret, access token of refresh token.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json({
    googleDriveConfigured: isGoogleDriveConfigured(),
    cutiFolderConfigured: Boolean(resolveTargetFolderId('SURAT_CUTI')),
    programKerjaFolderConfigured: Boolean(resolveTargetFolderId('PROGRAM_KERJA')),
  });
}