/**
 * Google Drive service-account setup helper.
 *
 * Zet GOOGLE_DRIVE_CLIENT_EMAIL / GOOGLE_DRIVE_PRIVATE_KEY /
 * GOOGLE_DRIVE_PROJECT_ID in .env op basis van een service-account JSON
 * dat je download uit Google Cloud Console.
 *
 * Gebruik:
 *   npx tsx scripts/setup-google-drive-env.ts ./pad/naar/service-account.json
 *   (standaard: ./google-service-account.json)
 *
 * Veiligheid:
 *   - Schrijft ALLEEN naar .env (gitignored). Nooit naar broncode.
 *   - Print NOOIT de private key / e-mail / project id.
 *   - Verwijder de JSON na gebruik (of bewaar het BUI'TEN de repo).
 *
 * Vercel (production): zet dezelfde waarden handmatig in
 *   Vercel → Project → Settings → Environment Variables
 *   (NIET als NEXT_PUBLIC_* — server-only!).
 *   De private key mag escaped newlines bevatten (\n) — dat normaliseert
 *   de service zelf.
 */

import fs from 'fs';
import path from 'path';

interface ServiceAccountJson {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
}

function printHelp(): void {
  console.log('');
  console.log('HOE MAAK JE EEN GOOGLE SERVICE-ACCOUNT JSON:');
  console.log('  1. Ga naar Google Cloud Console → APIs & Services → Credentials');
  console.log('  2. "Create Credentials" → "Service Account"');
  console.log('  3. Maak een service account (bv. "orf-googledrive") en geef het de rol Editor');
  console.log('  4. Open de service account → "Keys" → "Add Key" → "Create New Key" → JSON → Download');
  console.log('  5. Run:  npx tsx scripts/setup-google-drive-env.ts <pad-naar-json>');
  console.log('  6. Deel de 2 Drive folders met de service-account email (permissie Editor / WRITE):');
  console.log('       - Cuti/Izin/Sakit     → 1gbu8zKweK9Y5VdMOQZdYqlAen0jaxKsW');
  console.log('       - Program Kerja       → 1i2ZZQKBwlQupSFKKB3oM4LP4QXcJ6HaU');
  console.log('  7. Controleer:  npx tsx scripts/drive-diag.ts');
  console.log('  8. Live test:   DRIVE_LIVE_SMOKE=1 npx tsx scripts/drive-smoke.ts');
}

function loadDotEnv(): Record<string, string> | null {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return null;
  const out: Record<string, string> = {};
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (key) out[key] = value;
  }
  return out;
}

async function main() {
  const jsonPath = process.argv[2] || path.join(process.cwd(), 'google-service-account.json');
  const absJsonPath = path.resolve(jsonPath);

  if (!fs.existsSync(absJsonPath)) {
    console.error(`✗ Bestand niet gevonden: ${jsonPath}`);
    printHelp();
    process.exit(1);
  }

  let sa: ServiceAccountJson;
  try {
    sa = JSON.parse(fs.readFileSync(absJsonPath, 'utf8')) as ServiceAccountJson;
  } catch (err) {
    console.error('✗ Ongeldige JSON: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }

  if (sa.type !== 'service_account' || !sa.client_email || !sa.private_key) {
    console.error('✗ Dit is geen geldige service-account JSON (client_email/private_key ontbreken).');
    printHelp();
    process.exit(1);
  }

  // Private key → één regel met escaped \n (compatibel met .env + Vercel).
  const oneLineKey = sa.private_key.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');

  // Update .env (behoud bestaande regels).
  const envPath = path.join(process.cwd(), '.env');
  const existing = loadDotEnv() ?? {};
  existing.GOOGLE_DRIVE_CLIENT_EMAIL = sa.client_email;
  existing.GOOGLE_DRIVE_PRIVATE_KEY = oneLineKey;
  existing.GOOGLE_DRIVE_PROJECT_ID = sa.project_id ?? existing.GOOGLE_DRIVE_PROJECT_ID ?? '';

  const keys = ['GOOGLE_DRIVE_CLIENT_EMAIL', 'GOOGLE_DRIVE_PRIVATE_KEY', 'GOOGLE_DRIVE_PROJECT_ID'];
  const linesToWrite = keys.map((k) => `${k}="${(existing[k] || '').replace(/"/g, '\\"')}"`);
  const header = '# ===== AUTO-GENERATED door setup-google-drive-env.ts — NOOIT committen =====';

  let nextContent = '';
  if (fs.existsSync(envPath)) {
    const original = fs.readFileSync(envPath, 'utf8');
    // Verwijder eventuele eerdere auto-generated blokken en de 3 keys.
    const cleaned = original
      .split(/\r?\n/)
      .filter((l) => !l.startsWith('# ===== AUTO-GENERATED door setup-google-drive-env.ts') && !keys.some((k) => l.trim().startsWith(k + '=')))
      .join('\n')
      .trim();
    nextContent = cleaned.length > 0 ? `${cleaned}\n\n${header}\n${linesToWrite.join('\n')}\n` : `${header}\n${linesToWrite.join('\n')}\n`;
  } else {
    nextContent = `${header}\n${linesToWrite.join('\n')}\n`;
  }
  fs.writeFileSync(envPath, nextContent, 'utf8');

  console.log('✓ .env geüpdatet met:');
  console.log('  - GOOGLE_DRIVE_CLIENT_EMAIL');
  console.log('  - GOOGLE_DRIVE_PRIVATE_KEY');
  console.log('  - GOOGLE_DRIVE_PROJECT_ID');
  console.log('');
  console.log('⚠ .env staat in .gitignore — de waarden worden dus NIET gecommit. Goed zo.');
  console.log('⚠ Verwijder daarna de JSON: ' + jsonPath + '  (of bewaar het buiten de repo)');
  console.log('');
  console.log('Vercel (production): Vercel → Project → Settings → Environment Variables →');
  console.log('  zet dezelfde 3 variabelen (server-only, NIET als NEXT_PUBLIC_)');
  console.log('');
  console.log('Vervolg:');
  console.log('  1. Deel de Drive folders met ' + sa.client_email + ' (Editor/WRITE):');
  console.log('       Cuti/Izin/Sakit → 1gbu8zKweK9Y5VdMOQZdYqlAen0jaxKsW');
  console.log('       Program Kerja   → 1i2ZZQKBwlQupSFKKB3oM4LP4QXcJ6HaU');
  console.log('  2. Controleer: npx tsx scripts/drive-diag.ts');
  console.log('  3. Live test:  DRIVE_LIVE_SMOKE=1 npx tsx scripts/drive-smoke.ts');
}

void main();