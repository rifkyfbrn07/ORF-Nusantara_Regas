/**
 * Storage diagnostic (lokaal equivalent van /api/admin/storage-status).
 * Toont ALLEEN config-status — nooit secrets (token, private key).
 *
 *   npx tsx scripts/drive-diag.ts
 */
import fs from 'fs';
import path from 'path';

function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (key) process.env[key] = value;
  }
}

async function main() {
  loadDotEnv();
  const blob = await import('../src/server/services/vercelBlobService');
  const gd = await import('../src/server/services/googleDriveService');

  console.log('====================================================');
  console.log('STORAGE STATUS — EVIDENCE (server-side only)');
  console.log('====================================================');
  console.log('');
  console.log('  blobStorageConfigured:      ' + (blob.isStorageConfigured() ? 'true  ✓' : 'false ✗'));
  console.log('  googleDriveConfigured:      ' + (gd.isGoogleDriveConfigured() ? 'true  ✓' : 'false ✗') + '   (legacy/historical saja)');
  console.log('  cutiFolderConfigured:       ' + (gd.resolveTargetFolderId('SURAT_CUTI') ? 'true' : 'false'));
  console.log('  programKerjaFolderConfigured: ' + (gd.resolveTargetFolderId('PROGRAM_KERJA') ? 'true' : 'false'));
  console.log('');
  console.log('  BLOB_READ_WRITE_TOKEN       ' + (process.env.BLOB_READ_WRITE_TOKEN ? 'SET ✓' : 'ontbreekt ✗'));
  console.log('  VERCEL_OIDC_TOKEN           ' + (process.env.VERCEL_OIDC_TOKEN ? 'SET ✓' : 'ontbreekt ✗') + '   (alternatief OIDC)');
  console.log('');
  if (!blob.isStorageConfigured()) {
    console.log('  Upload baru zal mislukken tot Blob geconfigureerd is.');
    console.log('  Fix (Vercel):');
    console.log('    Vercel → Project → Storage → Create Blob Store, of');
    console.log('    attach existing Blob store → BLOB_READ_WRITE_TOKEN wordt automatisch geïnjecteerd.');
    console.log('  Lokale dev: zet BLOB_READ_WRITE_TOKEN in .env (server-only).');
  } else {
    console.log('  Blob geconfigureerd — live test: BLOB_LIVE_SMOKE=1 npx tsx scripts/blob-smoke.ts');
  }
  console.log('====================================================');
  process.exit(blob.isStorageConfigured() ? 0 : 1);
}

void main();