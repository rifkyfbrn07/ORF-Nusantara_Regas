import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { scanEvidenceStorage, runEvidenceCleanup } from '@/server/services/evidenceCleanupService';

export const dynamic = 'force-dynamic';

/**
 * ADMIN ONLY — Storage Cleanup voor evidence (Vercel Blob private).
 * GET    → scan (report alleen; niets verwijderen)
 * DELETE → cleanup orphan files (confirmatie door client/UI)
 * Retourneert nooit tokens/secrets.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  try {
    const scan = await scanEvidenceStorage();
    return NextResponse.json({ ok: true, scan });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Scan gagal.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  let admin: { id: string } | null = null;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const confirm = request.nextUrl.searchParams.get('confirm');
  if (confirm !== '1') {
    return NextResponse.json({ ok: false, error: 'Confirmatie vereist (?confirm=1).' }, { status: 400 });
  }
  try {
    const result = await runEvidenceCleanup(admin.id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cleanup gagal.' }, { status: 400 });
  }
}