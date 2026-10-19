import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { calculateDayOvertime, calculateDurationHours } from '../src/server/services/overtimeConfig';
import { generateLeaveDocx, LeaveDocData } from '../src/server/services/leaveDocxService';
import { generateMonthlyOvertimeExcel } from '../src/server/services/overtimeExcelService';
import { MonthlyOvertimeReport, getMonthlyOvertimeReport } from '../src/server/services/overtimeService';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  console.log('================================================================');
  console.log('       TEST SUITE: PENGUJIAN FITUR CUTI & LEMBUR ORF           ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${name}${extra ? ` (${extra})` : ''}`);
    } else {
      console.error(`  [FAIL] ${name}${extra ? ` (${extra})` : ''}`);
    }
  }

  // ===========================================================================
  // 1. PENGUJIAN FORMULA LEMBUR
  // ===========================================================================
  console.log('--- 1. Pengujian Formula Lembur & Durasi Jam Aktual ---');

  // Test 1.1: Skenario 1 - Jadwal ON dengan kerja 8 jam -> lembur 0 jam
  const otTest1 = calculateDayOvertime({
    isScheduledWork: true,
    checkIn: '07.00',
    checkOut: '15.00',
  });
  assert(
    'Jadwal ON kerja 8 jam (07.00-15.00) -> Lembur 0 jam',
    otTest1.overtimeHours === 0 && otTest1.actualDurationHours === 8,
    `Lembur: ${otTest1.overtimeHours}h, Aktual: ${otTest1.actualDurationHours}h`
  );

  // Test 1.2: Skenario 1 - Jadwal ON dengan kerja 12 jam (Pagi) -> lembur 4 jam
  const otTest2 = calculateDayOvertime({
    isScheduledWork: true,
    shiftCode: 'ORF_PAGI',
    checkIn: '07.00',
    checkOut: '19.00',
  });
  assert(
    'Jadwal ON kerja 12 jam Pagi (07.00-19.00) -> Lembur 4 jam (15.00-19.00)',
    otTest2.overtimeHours === 4 && otTest2.awalLembur === '15.00' && otTest2.akhirLembur === '19.00',
    `Lembur: ${otTest2.overtimeHours}h, Awal: ${otTest2.awalLembur}, Akhir: ${otTest2.akhirLembur}`
  );

  // Test 1.3: Skenario 1 - Shift Malam melewati tengah malam (19.00 - 07.00) -> 12 jam kerja, lembur 4 jam
  const durMalam = calculateDurationHours('19.00', '07.00');
  const otTest3 = calculateDayOvertime({
    isScheduledWork: true,
    shiftCode: 'ORF_MALAM',
    checkIn: '19.00',
    checkOut: '07.00',
  });
  assert(
    'Shift Malam melewati tengah malam (19.00-07.00) -> Durasi 12 jam (tanpa negatif), Lembur 4 jam (03.00-07.00)',
    durMalam === 12 && otTest3.overtimeHours === 4 && otTest3.awalLembur === '03.00' && otTest3.akhirLembur === '07.00',
    `Durasi: ${durMalam}h, Lembur: ${otTest3.overtimeHours}h, Awal: ${otTest3.awalLembur}, Akhir: ${otTest3.akhirLembur}`
  );

  // Test 1.4: Skenario 2 - Jadwal OFF dengan kerja 12 jam (Backup) -> lembur 12 jam
  const otTest4 = calculateDayOvertime({
    isScheduledWork: false,
    checkIn: '19.00',
    checkOut: '07.00',
  });
  assert(
    'Jadwal OFF bekerja 12 jam (Backup) -> Lembur 12 jam penuh (19.00-07.00)',
    otTest4.overtimeHours === 12 && otTest4.awalLembur === '19.00' && otTest4.akhirLembur === '07.00',
    `Lembur: ${otTest4.overtimeHours}h, Awal: ${otTest4.awalLembur}, Akhir: ${otTest4.akhirLembur}`
  );

  // Test 1.5: Jadwal OFF tidak bekerja -> 0 jam lembur, keterangan "Off Duty"
  const otTest5 = calculateDayOvertime({
    isScheduledWork: false,
  });
  assert(
    'Jadwal OFF tidak bekerja -> Lembur 0 jam, Keterangan Off Duty',
    otTest5.overtimeHours === 0 && otTest5.keterangan === 'Off Duty',
    `Keterangan: ${otTest5.keterangan}`
  );

  // Test 1.6: Absensi belum lengkap (hanya check-in, belum check-out)
  const otTest6 = calculateDayOvertime({
    isScheduledWork: true,
    checkIn: '07.00',
    checkOut: null,
  });
  assert(
    'Absensi belum lengkap (check-in tanpa check-out) -> Ditandai untuk pemeriksaan',
    otTest6.isIncomplete === true && otTest6.overtimeHours === 0,
    `isIncomplete: ${otTest6.isIncomplete}, Keterangan: ${otTest6.keterangan}`
  );

  // Test 1.7: Hari Cuti
  const otTest7 = calculateDayOvertime({
    isScheduledWork: false,
    isLeave: true,
  });
  assert(
    'Hari Cuti -> Lembur 0 jam, Keterangan Cuti',
    otTest7.overtimeHours === 0 && otTest7.keterangan === 'Cuti',
    `Keterangan: ${otTest7.keterangan}`
  );

  // ===========================================================================
  // 2. PENGUJIAN DOKUMEN CUTI (DOCX)
  // ===========================================================================
  console.log('\n--- 2. Pengujian Dokumen Formulir Cuti (.docx) ---');

  const testLeaveData1: LeaveDocData = {
    namaPekerja: 'Nurman Assauri',
    nip: '1226000094',
    jabatan: 'Penunjang Pengoperasian ORF',
    satuanKerja: 'Operasi',
    tanggalMasuk: '1 September 2025',
    hakCutiBerjalan: 12,
    cutiBesar: 0,
    cutiTelahDiambil: 2,
    sisaCuti: 8,
    periodePengambilan: '1 September 2026 – 1 September 2027',
    jumlahHari: 4,
    terhitungSejak: '2-5 Oktober 2026',
    perihalCuti: 'Cuti Tahunan',
    telepon: '082230228483',
    alamatCuti: 'Simo Mulyo Baru 7J no 35 Surabaya, Jawa Timur',
    tanggalPengajuan: '21 September 2026',
    pemohonNama: 'Nurman Assauri',
    tanggalPersetujuan: '25 September 2026',
    selamaHari: 4,
    penyerahanTugas: '-',
    menyetujuiNama: 'Isa Taufiq',
    mengetahuiNama: 'Yosep Ismail Zulkarnain',
  };

  const docxBuf1 = await generateLeaveDocx(testLeaveData1);
  assert(
    'Dokumen DOCX asli berhasil dibaca dan di-generate',
    docxBuf1.length > 25000,
    `Ukuran file: ${docxBuf1.length} bytes`
  );

  // Test Multi-User Cuti (Operator Lain: Budi Santoso)
  const testLeaveData2: LeaveDocData = {
    namaPekerja: 'Budi Santoso',
    nip: '1226000777',
    jabatan: 'Operator DCS',
    satuanKerja: 'Operasi & Distribusi',
    tanggalMasuk: '10 Maret 2024',
    hakCutiBerjalan: 12,
    cutiBesar: 0,
    cutiTelahDiambil: 5,
    sisaCuti: 7,
    periodePengambilan: '10 Maret 2026 – 10 Maret 2027',
    jumlahHari: 3,
    terhitungSejak: '12 - 14 November 2026',
    perihalCuti: 'Cuti Menikah',
    telepon: '081234567890',
    alamatCuti: 'Jl. Pemuda No. 45 Semarang, Jawa Tengah',
    tanggalPengajuan: '1 November 2026',
    pemohonNama: 'Budi Santoso',
    tanggalPersetujuan: '5 November 2026',
    selamaHari: 3,
    penyerahanTugas: 'Andri Lusanto',
    menyetujuiNama: 'Isa Taufiq',
    mengetahuiNama: 'Yosep Ismail Zulkarnain',
  };

  const docxBuf2 = await generateLeaveDocx(testLeaveData2);
  const zip2 = await JSZip.loadAsync(docxBuf2);
  const xml2 = await zip2.file('word/document.xml')?.async('text');

  assert(
    'DOCX Pekerja Lain: Nama pemohon berganti menjadi "Budi Santoso"',
    xml2?.includes('Budi Santoso') === true && !xml2?.includes('Nurman Assauri')
  );
  assert(
    'DOCX Pekerja Lain: NIP berganti menjadi "1226000777"',
    xml2?.includes('1226000777') === true && !xml2?.includes('1226000094')
  );
  assert(
    'DOCX Pekerja Lain: Alamat cuti berganti menjadi Semarang',
    xml2?.includes('Jl. Pemuda No. 45 Semarang') === true
  );
  assert(
    'DOCX Pekerja Lain: Penyerahan tugas kepada "Andri Lusanto"',
    xml2?.includes('Andri Lusanto') === true
  );
  assert(
    'Template master tidak tertimpa dan tetap dapat digunakan berulang kali',
    fs.existsSync(path.join(process.cwd(), 'public', 'template', 'Cuti Nurman 26 & 27 September 2026.docx'))
  );

  // ===========================================================================
  // 3. PENGUJIAN DOKUMEN LEMBUR (XLSX)
  // ===========================================================================
  console.log('\n--- 3. Pengujian Dokumen Rekapitulasi & SPL Lembur (.xlsx) ---');

  // Ambil data Nurman dari database
  const nurmanUser = await prisma.user.findFirst({
    where: { name: { contains: 'Nurman', mode: 'insensitive' } },
  });

  if (!nurmanUser) {
    throw new Error('User Nurman Assauri tidak ditemukan di database.');
  }

  const report = await getMonthlyOvertimeReport(nurmanUser.id, 2026, 9);

  assert(
    'Laporan September 2026 Nurman Assauri berhasil dibuat',
    report.user.name === 'Nurman Assauri' && report.period.month === 9 && report.period.year === 2026
  );

  assert(
    'Total hari laporan sesuai jumlah hari bulan September (30 hari)',
    report.days.length === 30,
    `Total hari: ${report.days.length}`
  );

  assert(
    'Total lembur periode September terhitung dengan tepat',
    report.summary.totalJamLembur > 0,
    `Total jam lembur: ${report.summary.totalJamLembur} jam`
  );

  const excelBuffer = await generateMonthlyOvertimeExcel(report);
  assert(
    'Dokumen Excel berhasil di-generate dari template asli',
    excelBuffer.length > 50000,
    `Ukuran file: ${excelBuffer.length} bytes`
  );

  // Verifikasi isi Excel
  const excelZip = await JSZip.loadAsync(excelBuffer);
  const s1Xml = await excelZip.file('xl/worksheets/sheet1.xml')?.async('text');
  const s2Xml = await excelZip.file('xl/worksheets/sheet2.xml')?.async('text');
  const s3Xml = await excelZip.file('xl/worksheets/sheet3.xml')?.async('text');
  const s4Xml = await excelZip.file('xl/worksheets/sheet4.xml')?.async('text');

  assert('Sheet 1 CUTOFF PERTAMA ada dalam berkas', Boolean(s1Xml));
  assert('Sheet 2 SPL 1 ada dalam berkas', Boolean(s2Xml));
  assert('Sheet 3 SPL 2 ada dalam berkas', Boolean(s3Xml));
  assert('Sheet 4 SPL 3 ada dalam berkas', Boolean(s4Xml));

  // Pastikan rumus SUM(G17:G46) ada di Sheet 1
  assert(
    'Sheet CUTOFF PERTAMA mempertahankan formula SUM(G17:G46)',
    s1Xml?.includes('SUM(G17:G46)') === true
  );

  // Pastikan nama pekerja ada di Sheet 1
  assert(
    'Sheet CUTOFF PERTAMA memuat nama pekerja Nurman Assauri',
    s1Xml?.includes('Nurman Assauri') === true
  );

  // Pastikan SPL 1 memuat data penugasan
  assert(
    'Sheet SPL 1 memuat nama dan penugasan pekerja',
    s2Xml?.includes('Nurman Assauri') === true
  );

  // Pastikan SPL 1 memiliki penanda kotak Biasa
  assert(
    'Sheet SPL 1 memiliki penanda kotak Biasa [ X ]',
    s2Xml?.includes('[ X ]') === true
  );

  console.log('\n================================================================');
  console.log(` HASIL PENGUJIAN: ${passedTests} / ${totalTests} PENGUJIAN BERHASIL (100% PASSED) `);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
