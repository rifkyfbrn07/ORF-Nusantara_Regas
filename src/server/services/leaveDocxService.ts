import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export interface LeaveDocData {
  namaPekerja: string;
  nip: string;
  jabatan: string;
  satuanKerja: string;
  tanggalMasuk: string;
  hakCutiBerjalan: number;
  cutiBesar: number;
  cutiTelahDiambil: number;
  sisaCuti: number;
  periodePengambilan: string;
  jumlahHari: number;
  terhitungSejak: string;
  perihalCuti: string;
  telepon: string;
  alamatCuti: string;
  tanggalPengajuan: string;
  pemohonNama: string;
  tanggalPersetujuan?: string | null;
  selamaHari: number;
  penyerahanTugas: string;
  menyetujuiNama?: string;
  mengetahuiNama?: string;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Replaces the runs inside a <w:p> element while preserving its <w:pPr> and <w:rPr>.
 */
function replaceParagraphText(pXml: string, newText: string): string {
  // Extract <w:pPr>...</w:pPr> if present
  const pPrMatch = pXml.match(/<w:pPr[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';

  // Extract <w:rPr> from inside pPr or from the first <w:r>
  let rPr = '';
  const rPrInPPr = pPr.match(/<w:rPr[\s\S]*?<\/w:rPr>/);
  if (rPrInPPr) {
    rPr = rPrInPPr[0];
  } else {
    const rPrInR = pXml.match(/<w:rPr[\s\S]*?<\/w:rPr>/);
    if (rPrInR) rPr = rPrInR[0];
  }

  // Extract the open tag <w:p ...>
  const openTagMatch = pXml.match(/^<w:p(\s[^>]*)?>/);
  const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';

  return `${openTag}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r></w:p>`;
}

export async function generateLeaveDocx(data: LeaveDocData): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'template', 'Cuti Nurman 26 & 27 September 2026.docx');
  const templateBuffer = fs.readFileSync(templatePath);

  const zip = await JSZip.loadAsync(templateBuffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('File word/document.xml tidak ditemukan dalam template DOCX.');
  }

  let xml = await docXmlFile.async('text');

  // Split into paragraphs <w:p ...>...</w:p>
  // We can match every <w:p ...>...</w:p> block
  const pRegex = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  
  xml = xml.replace(pRegex, (pXml) => {
    // Strip XML tags to get raw text of paragraph
    const rawText = pXml.replace(/<[^>]+>/g, '').trim();

    // 1. Nama Pekerja
    if (rawText === 'Nurman Assauri') {
      return replaceParagraphText(pXml, data.namaPekerja);
    }
    // 2. NIP
    if (rawText === '1226000094') {
      return replaceParagraphText(pXml, data.nip);
    }
    // 3. Jabatan
    if (rawText === 'Penunjang Pengoperasian ORF') {
      return replaceParagraphText(pXml, data.jabatan);
    }
    // 4. Satuan Kerja
    if (rawText === 'Operasi') {
      return replaceParagraphText(pXml, data.satuanKerja);
    }
    // 5. Tanggal Masuk Kerja
    if (rawText.replace(/\s+/g, ' ') === '1 September 2025') {
      return replaceParagraphText(pXml, data.tanggalMasuk);
    }
    // 6. Hak Hari Cuti Periode Berjalan
    if (rawText.includes('hari') && rawText.includes('12')) {
      return replaceParagraphText(pXml, `${data.hakCutiBerjalan}   hari`);
    }
    // Cuti Besar
    if (rawText.includes('hari') && rawText.includes('0')) {
      return replaceParagraphText(pXml, `${data.cutiBesar}   hari`);
    }
    // Cuti yang Telah Diambil
    if (rawText.includes('hari') && rawText.includes('2') && !rawText.includes('(')) {
      return replaceParagraphText(pXml, `${data.cutiTelahDiambil}   hari`);
    }
    // Sisa Hak Hari Cuti
    if (rawText.includes('hari') && rawText.includes('8')) {
      return replaceParagraphText(pXml, `${data.sisaCuti}   hari`);
    }
    // 7. Periode Pengambilan
    if (rawText.includes('September 2026') && rawText.includes('September 2027')) {
      return replaceParagraphText(pXml, data.periodePengambilan);
    }
    // 8. Sebanyak (*)
    if (rawText.includes('(4)') && rawText.toLowerCase().includes('hari') && !rawText.includes('Selama')) {
      return replaceParagraphText(pXml, `(${data.jumlahHari}) hari`);
    }
    // 9. Terhitung sejak (*)
    if (rawText.includes('2-5 Oktober 2026')) {
      return replaceParagraphText(pXml, data.terhitungSejak);
    }
    // 10. Perihal Cuti (*)
    if (rawText === 'Cuti Tahunan') {
      return replaceParagraphText(pXml, data.perihalCuti);
    }
    // 11. No. Telepon (*)
    if (rawText === '082230228483') {
      return replaceParagraphText(pXml, data.telepon);
    }
    // 12. Alamat Cuti (*)
    if (rawText.includes('Simo Mulyo Baru')) {
      return replaceParagraphText(pXml, data.alamatCuti);
    }
    // Tanggal pengajuan: Jakarta, 21 September 2026
    if (rawText.startsWith('Jakarta, 21 September 2026') || rawText.startsWith('Jakarta,')) {
      return replaceParagraphText(pXml, `Jakarta, ${data.tanggalPengajuan}`);
    }
    // Pemohon signature: (Nurman Assauri)
    if (rawText === '(Nurman Assauri)') {
      return replaceParagraphText(pXml, `(${data.pemohonNama})`);
    }
    // LEMBAR PERSETUJUAN CUTI OLEH ATASAN
    // 1. Tanggal Persetujuan Cuti (*)
    if (rawText.includes('25 September 2026')) {
      return replaceParagraphText(pXml, `(${data.tanggalPersetujuan || '-'})`);
    }
    // 2. Selama (*)
    if (rawText === '(4) Hari') {
      return replaceParagraphText(pXml, `(${data.selamaHari}) Hari`);
    }
    // 3. Penyerahan tugas kepada
    if (rawText === '-') {
      return replaceParagraphText(pXml, data.penyerahanTugas || '-');
    }
    // Menyetujui (Project Manager)
    if (rawText === '(Isa Taufiq)' && data.menyetujuiNama) {
      return replaceParagraphText(pXml, `(${data.menyetujuiNama})`);
    }
    // Mengetahui (Atasan Langsung)
    if (rawText.includes('Yosep Ismail Zulkarnain') && data.mengetahuiNama) {
      return replaceParagraphText(pXml, `(${data.mengetahuiNama})`);
    }

    return pXml;
  });

  zip.file('word/document.xml', xml);
  const outBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return outBuffer;
}
