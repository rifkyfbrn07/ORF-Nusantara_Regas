/**
 * Drive diagnostic (local = admin endpoint /api/admin/storage-status).
 * Toont ALLEEN config-status / namen — nooit secrets (geen private key).
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
  const { isGoogleDriveConfigured, getMissingGoogleDriveConfigVars, resolveTargetFolderId } = await import('../src/server/services/googleDriveService');

  const ou = (key: string) => (process.env[key]?.trim() ? 'SET ✓' : 'ontbreekt ✗');
  const missing = getMissingGoogleDriveConfigVars();

  console.log('====================================================');
  console.log('GOOGLE DRIVE — STORAGE STATUS (server-side only)');
  console.log('====================================================');
  console.log('');
  if (isGoogleDriveConfigured()) {
    console.log('  googleDriveConfigured:      true  ✓');
  } else {
    console.log('  googleDriveConfigured:      false ✗');
  }
  console.log('  cutiFolderConfigured:       ' + (resolveTargetFolderId('SURAT_CUTI') ? 'true' : 'false'));
  console.log('  programKerjaFolderConfigured: ' + (resolveTargetFolderId('PROGRAM_KERJA') ? 'true' : 'false'));
  console.log('');
  console.log('  GOOGLE_DRIVE_CLIENT_EMAIL    ' + ou('GOOGLE_DRIVE_CLIENT_EMAIL') + '   (of GOOGLE_SERVICE_ACCOUNT_EMAIL ' + ou('GOOGLE_SERVICE_ACCOUNT_EMAIL') + ')');
  console.log('  GOOGLE_DRIVE_PRIVATE_KEY     ' + ou('GOOGLE_DRIVE_PRIVATE_KEY') + '   (of GOOGLE_PRIVATE_KEY ' + ou('GOOGLE_PRIVATE_KEY') + ')');
  console.log('  GOOGLE_DRIVE_PROJECT_ID      ' + ou('GOOGLE_DRIVE_PROJECT_ID') + '   (optioneel)');
  console.log('');
  if (missing.length > 0) {
    console.log('  MISSING: ' + missing.join(', '));
    console.log('');
    console.log('  Fix: volg de stappen in scripts/setup-google-drive-env.ts');
    console.log('      1) Google Cloud Console → Service Account → download JSON');
    console.log('      2) npx tsx scripts/setup-google-drive-env.ts path/to/service-account.json');
    console.log('      3) deel de twee Drive folders met de service-account email (Editor)');
  } else {
    console.log('  Alles aanwezig — test live: DRIVE_LIVE_SMOKE=1 npx tsx scripts/drive-smoke.ts');
  }
  console.log('====================================================');
  process.exit(missing.length > 0 ? 1 : 0);
}

void main();