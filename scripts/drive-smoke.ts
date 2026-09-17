/**
 * Smoke test — Google Drive evidence upload (CUTI/IZIN & PROGRAM KERJA).
 * Logic tests draaien zonder credentials; live uploads alleen met
 * DRIVE_LIVE_SMOKE=1 en Google credentials in .env (test-files worden verwijderd).
 * Matrix: A–D folder routing, E unauthorized, F validatie, G geen vals record, H leesbaar.
 */

import {
  buildDriveFileName,
  deleteDriveFile,
  getStoredFileContent,
  resolveTargetFolderId,
  sanitizeFileName,
  sniffFileMime,
  uploadFileToStorage,
  validateProofFile,
} from '../src/server/services/googleDriveService';

const CUTI_FOLDER = '1gbu8zKweK9Y5VdMOQZdYqlAen0jaxKsW';
const PROG_FOLDER = '1i2ZZQKBwlQupSFKKB3oM4LP4QXcJ6HaU';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function expectError(name: string, fn: () => unknown, match?: string) {
  try {
    fn();
    check(name, false, 'no error thrown');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    check(name, !match || msg.toLowerCase().includes(match.toLowerCase()), msg);
  }
}

function makePdf(title = 'SMOKE TEST'): Buffer {
  const body = `BT /F1 12 Tf 50 100 Td (${title}) Tj ET`;
  return Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF`
  );
}

function makePng(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('IHDR-smoke-test-payload'),
  ]);
}

function makeJpeg(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from('smoke-test-jpeg-payload'),
  ]);
}

function hasGoogleCreds(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN
  ) || Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
}
async function liveTests() {
  console.log('\n[5] Live upload Google Drive (A–E, H)');
  if (process.env.DRIVE_LIVE_SMOKE !== '1' || !hasGoogleCreds()) {
    console.log('  ⚠ Skipped — zet DRIVE_LIVE_SMOKE=1 + Google credentials in .env');
    return;
  }

  const cases: { name: string; category: 'SURAT_CUTI' | 'PROGRAM_KERJA'; fileName: string; mime: string; buffer: Buffer }[] = [
    { name: 'A: Surat Cuti PDF', category: 'SURAT_CUTI', fileName: 'surat-cuti.pdf', mime: 'application/pdf', buffer: makePdf('SURAT CUTI') },
    { name: 'B: Surat Izin JPG', category: 'SURAT_CUTI', fileName: 'surat-izin.jpg', mime: 'image/jpeg', buffer: makeJpeg() },
    { name: 'C: Program Kerja PDF', category: 'PROGRAM_KERJA', fileName: 'bukti-program.pdf', mime: 'application/pdf', buffer: makePdf('BUKTI PROGRAM') },
    { name: 'D: Program Kerja PNG', category: 'PROGRAM_KERJA', fileName: 'bukti-program.png', mime: 'image/png', buffer: makePng() },
  ];

  for (const c of cases) {
    try {
      const meta = await uploadFileToStorage({
        fileName: c.fileName,
        mimeType: c.mime,
        fileBuffer: c.buffer,
        folderCategory: c.category,
        uploaderUsername: 'smoketest',
        departmentName: 'QA',
        subCategory: 'SMOKE',
        descriptiveName: 'smoke-test',
      });
      check(`${c.name} → upload ok + Drive storage`, Boolean(meta.fileId) && meta.isDriveStorage, meta.folderPath);

      try {
        const res = await getStoredFileContent(meta.fileId);
        check(`H: ${c.name} → file kan teruggedownload worden`, res.status === 200);
      } catch (err) {
        check(`H: ${c.name} → file kan teruggedownload worden`, false, err instanceof Error ? err.message : '');
      }

      const deleted = await deleteDriveFile(meta.fileId);
      if (!deleted) console.warn(`    ⚠ cleanup delete failed — verwijder handmatig: ${meta.fileId}`);
    } catch (err) {
      check(`${c.name} → upload`, false, err instanceof Error ? err.message : String(err));
    }
  }

  // E: onbekend/verboden fileId → FILE_NOT_FOUND (route geeft 404)
  expectError('E: onbekend/verboden fileId → FILE_NOT_FOUND', async () => {
    await getStoredFileContent('nonexistent-file-id');
  }, 'file_not_found');
}

async function main() {
  console.log('====================================================');
  console.log('SMOKE TEST — GOOGLE DRIVE EVIDENCE UPLOAD');
  console.log('====================================================');

  console.log('\n[1] Folder routing server-side (A–D)');
  check('A: SURAT_CUTI → folder Cuti/Izin', resolveTargetFolderId('SURAT_CUTI') === CUTI_FOLDER, String(resolveTargetFolderId('SURAT_CUTI')));
  check('D: PROGRAM_KERJA → folder Program Kerja', resolveTargetFolderId('PROGRAM_KERJA') === PROG_FOLDER, String(resolveTargetFolderId('PROGRAM_KERJA')));
  check('LAPORAN blijft dynamisch (geen fixed folder)', resolveTargetFolderId('LAPORAN') === null);
  check('SHIFT_EXCHANGE blijft dynamisch (geen fixed folder)', resolveTargetFolderId('SHIFT_EXCHANGE') === null);

  console.log('\n[2] Nama file Drive (makkelijk traceerbaar)');
  const cutiName = buildDriveFileName({
    category: 'SURAT_CUTI',
    originalName: 'scan.pdf',
    uploaderUsername: 'jdoe',
    mimeType: 'application/pdf',
    date: new Date('2026-09-17T12:00:00+07:00'),
  });
  check('A: CUTI name pattern', cutiName === '2026-09-17_jdoe_surat-cuti.scan.pdf', cutiName);

  const progName = buildDriveFileName({
    category: 'PROGRAM_KERJA',
    originalName: 'bukti.jpg',
    uploaderUsername: 'jdoe',
    descriptiveName: 'Rapat Koordinasi',
    mimeType: 'image/jpeg',
    date: new Date('2026-09-17T12:00:00+07:00'),
  });
  check('C: PROGRAM name pattern', progName === '2026-09-17_jdoe_rapat-koordinasi-bukti.bukti.jpg', progName);

  check('sanitize: traversal weg', !sanitizeFileName('../etc/passwd').includes('/') && !sanitizeFileName('../etc/passwd').includes('..'));
  check('sanitize: illegal chars vervangen', sanitizeFileName('a b<c>d:e?.jpg') === 'a_b_c_d_e_.jpg', sanitizeFileName('a b<c>d:e?.jpg'));

  console.log('\n[3] Validatie server-side MIME (F)');
  check('sniff PDF', sniffFileMime(makePdf()) === 'application/pdf');
  check('sniff JPEG', sniffFileMime(makeJpeg()) === 'image/jpeg');
  check('sniff PNG', sniffFileMime(makePng()) === 'image/png');
  expectError('F: MIME niet-allowlist → geweigerd', () => validateProofFile('x.exe', 'application/x-msdownload', 1000, makePdf()));
  expectError('F: mismatch content → geweigerd', () => validateProofFile('x.pdf', 'application/pdf', 100, makeJpeg()));
  expectError('F: oversize (>10MB) → geweigerd', () => validateProofFile('x.pdf', 'application/pdf', 11 * 1024 * 1024, makePdf()));
  expectError('F: nama leeg → geweigerd', () => validateProofFile('', 'application/pdf', 100, makePdf()));
  try {
    validateProofFile('scan.pdf', 'application/pdf', 100, makePdf());
    check('valid PDF → ok', true);
  } catch (err) {
    check('valid PDF → ok', false, err instanceof Error ? err.message : '');
  }

  console.log('\n[4] Foutafhandeling (G)');
  expectError('G: validatie fail → throw vóór metadata', () => validateProofFile('bug.gif', 'image/gif', 10, Buffer.from('GIF89a')));

  await liveTests();

  console.log('\n====================================================');
  console.log(`RESULTAAT: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

void main();