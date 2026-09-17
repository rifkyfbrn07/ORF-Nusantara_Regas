/**
 * Smoke test — Vercel Blob evidence storage.
 * Logic tests (A–H) run zonder token. Live tests alleen met BLOB_LIVE_SMOKE=1
 * + BLOB_READ_WRITE_TOKEN in env (test-files worden na verificatie verwijderd).
 */
import {
  buildStoragePath,
  validateEvidenceFile,
  CATEGORY_STORAGE_PREFIX,
} from '../src/server/services/evidenceValidation';
import {
  isStorageConfigured,
  uploadEvidenceToBlob,
  getEvidenceStream,
  deleteEvidenceBlob,
} from '../src/server/services/vercelBlobService';

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

function makePdf(): Buffer {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`);
}
function makePng(): Buffer {
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('IHDR-payload')]);
}
function makeJpeg(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('jpeg-payload')]);
}

async function main() {
  console.log('====================================================');
  console.log('SMOKE TEST — VERCEL BLOB EVIDENCE');
  console.log('====================================================');

  console.log('\n[1] Config (server-side)');
  check('isStorageConfigured() boolean', typeof isStorageConfigured() === 'boolean');
  check('prefix CUTI = cuti-izin', CATEGORY_STORAGE_PREFIX.SURAT_CUTI === 'cuti-izin');
  check('prefix PROGRAM = program-kerja', CATEGORY_STORAGE_PREFIX.PROGRAM_KERJA === 'program-kerja');

  console.log('\n[2] Path storage (A–D)');
  const cuti = buildStoragePath({ category: 'SURAT_CUTI', originalName: 'surat-izin.pdf', uploaderUsername: 'jdoe', mimeType: 'application/pdf', date: new Date('2026-09-17T12:00:00+07:00') });
  check('A: path CUTI → evidence/cuti-izin/2026/09/...uuid.pdf', /^evidence\/cuti-izin\/2026\/09\/jdoe-surat-izin-.+-[0-9a-f]{12}\.pdf$/.test(cuti.storagePath), cuti.storagePath);
  check('A: fileName asli terjaga', cuti.fileName === 'surat-izin.pdf', cuti.fileName);

  const prog = buildStoragePath({ category: 'PROGRAM_KERJA', originalName: 'bukti.jpg', uploaderUsername: 'jdoe', descriptiveName: 'Rapat Koordinasi', mimeType: 'image/jpeg', date: new Date('2026-09-17T12:00:00+07:00') });
  check('D: path PROGRAM → evidence/program-kerja/2026/09/...bukti-uuid.jpg', /^evidence\/program-kerja\/2026\/09\/rapat-koordinasi-bukti-.+-[0-9a-f]{12}\.jpg$/.test(prog.storagePath), prog.storagePath);

  console.log('\n[3] Validatie (H)');
  expectError('H: MIME niet-allowlist → rejected', () => validateEvidenceFile('x.exe', 'application/x-msdownload', 100, makePdf()));
  expectError('H: mismatch content → rejected', () => validateEvidenceFile('x.pdf', 'application/pdf', 100, makeJpeg()));
  expectError('H: oversize (>10MB) → rejected', () => validateEvidenceFile('x.pdf', 'application/pdf', 11 * 1024 * 1024, makePdf()));
  expectError('H: extension mismatch → rejected', () => validateEvidenceFile('x.png', 'application/pdf', 100, makePdf()));
  try {
    validateEvidenceFile('scan.pdf', 'application/pdf', 100, makePdf());
    check('valid PDF → ok', true);
  } catch (err) {
    check('valid PDF → ok', false, err instanceof Error ? err.message : '');
  }
console.log('\n[4] Live upload/get/delete (A–E)');
  if (process.env.BLOB_LIVE_SMOKE !== '1' || !isStorageConfigured()) {
    console.log('  ⚠ Skipped — zet BLOB_LIVE_SMOKE=1 + BLOB_READ_WRITE_TOKEN');
  } else {
    const cases = [
      { name: 'A: Surat Izin PDF', category: 'SURAT_CUTI' as const, fileName: 'surat-izin.pdf', mime: 'application/pdf', buf: makePdf() },
      { name: 'B: Surat Cuti JPG', category: 'SURAT_CUTI' as const, fileName: 'surat-cuti.jpg', mime: 'image/jpeg', buf: makeJpeg() },
      { name: 'C: Program PDF', category: 'PROGRAM_KERJA' as const, fileName: 'bukti.pdf', mime: 'application/pdf', buf: makePdf() },
      { name: 'D: Program PNG', category: 'PROGRAM_KERJA' as const, fileName: 'bukti.png', mime: 'image/png', buf: makePng() },
    ];
    for (const c of cases) {
      try {
        const meta = await uploadEvidenceToBlob({ fileName: c.fileName, mimeType: c.mime, fileBuffer: c.buf, folderCategory: c.category, uploaderUsername: 'smoketest', descriptiveName: 'smoke' });
        check(`${c.name} → storageProvider=vercel_blob`, meta.storageProvider === 'vercel_blob');
        const prefix = c.category === 'SURAT_CUTI' ? 'cuti-izin' : 'program-kerja';
        check(`${c.name} → path ${prefix}`, meta.storagePath.startsWith(`evidence/${prefix}/`), meta.storagePath);
        try {
          const s = await getEvidenceStream(meta.storagePath);
          check(`E: ${c.name} → file opens (stream)`, s.statusCode === 200 && Boolean(s.stream));
        } catch (err) {
          check(`E: ${c.name} → file opens`, false, err instanceof Error ? err.message : '');
        }
        await deleteEvidenceBlob(meta.storagePath);
      } catch (err) {
        check(`${c.name} → upload`, false, err instanceof Error ? err.message : String(err));
      }
    }
    try {
      await getEvidenceStream('evidence/cuti-izin/1999/01/does-not-exist.pdf');
      check('E: onbekend path → not found', false);
    } catch (err) {
      check('E: onbekend path → not found', err instanceof Error && err.message === 'FILE_NOT_FOUND', err instanceof Error ? err.message : '');
    }
  }

  console.log('\n====================================================');
  console.log(`RESULTAAT: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

void main();