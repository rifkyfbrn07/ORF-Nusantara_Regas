import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { MonthlyOvertimeReport } from './overtimeService';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function updateCellInlineStr(rowXml: string, col: string, rowIdx: number, text: string, styleId?: string): string {
  const cellRef = `${col}${rowIdx}`;
  const cellRegex = new RegExp(`<c\\s+r="${cellRef}"[^>]*>[\\s\\S]*?<\\/c>|<c\\s+r="${cellRef}"[^>]*\\/>`);
  
  const existingMatch = rowXml.match(cellRegex);
  const sAttr = styleId ? ` s="${styleId}"` : existingMatch ? (existingMatch[0].match(/s="(\d+)"/) ? ` s="${existingMatch[0].match(/s="(\d+)"/)![1]}"` : '') : '';
  
  const newCell = `<c r="${cellRef}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;

  if (existingMatch) {
    return rowXml.replace(cellRegex, newCell);
  } else {
    return rowXml.replace('</row>', `${newCell}</row>`);
  }
}

function updateCellNumber(rowXml: string, col: string, rowIdx: number, val: number, styleId?: string): string {
  const cellRef = `${col}${rowIdx}`;
  const cellRegex = new RegExp(`<c\\s+r="${cellRef}"[^>]*>[\\s\\S]*?<\\/c>|<c\\s+r="${cellRef}"[^>]*\\/>`);
  
  const existingMatch = rowXml.match(cellRegex);
  const sAttr = styleId ? ` s="${styleId}"` : existingMatch ? (existingMatch[0].match(/s="(\d+)"/) ? ` s="${existingMatch[0].match(/s="(\d+)"/)![1]}"` : '') : '';
  
  const newCell = `<c r="${cellRef}"${sAttr}><v>${val}</v></c>`;

  if (existingMatch) {
    return rowXml.replace(cellRegex, newCell);
  } else {
    return rowXml.replace('</row>', `${newCell}</row>`);
  }
}

/**
 * Generates official Excel document populated from the master template.
 * Master template: public/template/Form Lembur September - Nurman Assauri.xlsx
 * Retains 100% of master design, layout, merged cells, formulas, page setup, and drawings.
 */
export async function generateMonthlyOvertimeExcel(report: MonthlyOvertimeReport): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'template', 'Form Lembur September - Nurman Assauri.xlsx');
  const templateBuffer = fs.readFileSync(templatePath);

  const zip = await JSZip.loadAsync(templateBuffer);

  // =========================================================================
  // 1. Process Sheet 1: CUTOFF PERTAMA (Rekapitulasi Absensi dan Lembur)
  // =========================================================================
  const sheet1File = zip.file('xl/worksheets/sheet1.xml');
  if (!sheet1File) {
    throw new Error('xl/worksheets/sheet1.xml tidak ditemukan di template.');
  }
  let sheet1Xml = await sheet1File.async('text');

  // B6: Periode Bulan
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="6"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => updateCellInlineStr(rowXml, 'B', 6, `PERIODE BULAN : ${report.period.periodeBulanText}         `)
  );

  // C8: NAMA
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="8"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => updateCellInlineStr(rowXml, 'C', 8, `: ${report.user.name}`)
  );

  // C9: NIP Internal
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="9"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => updateCellInlineStr(rowXml, 'C', 9, `: ${report.user.nipInternal}`)
  );

  // C10: NIP (employeeId)
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="10"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => updateCellInlineStr(rowXml, 'C', 10, `: ${report.user.employeeId}`)
  );

  // C11: LOKASI
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="11"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => updateCellInlineStr(rowXml, 'C', 11, `: ${report.user.location}`)
  );

  // C12: JABATAN
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="12"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => updateCellInlineStr(rowXml, 'C', 12, `: ${report.user.position}`)
  );

  // Days: Rows 17 to 46 (Days 1 to 30)
  for (let d = 1; d <= 30; d++) {
    const rowIdx = 16 + d;
    const dayData = report.days.find((r) => r.dayNumber === d);

    sheet1Xml = sheet1Xml.replace(
      new RegExp(`<row\\s+r="${rowIdx}"[^>]*>[\\s\\S]*?<\\/row>`),
      (rowXml) => {
        let r = rowXml;
        if (!dayData) {
          r = updateCellInlineStr(r, 'C', rowIdx, '');
          r = updateCellInlineStr(r, 'D', rowIdx, '');
          r = updateCellInlineStr(r, 'E', rowIdx, '');
          r = updateCellInlineStr(r, 'F', rowIdx, '');
          r = updateCellInlineStr(r, 'G', rowIdx, '');
          r = updateCellInlineStr(r, 'H', rowIdx, '');
          r = updateCellInlineStr(r, 'I', rowIdx, '');
          return r;
        }

        // Jam Kerja Masuk & Pulang
        r = updateCellInlineStr(r, 'C', rowIdx, dayData.checkIn || '');
        r = updateCellInlineStr(r, 'D', rowIdx, dayData.checkOut || '');

        // Jam Lembur Awal & Akhir
        r = updateCellInlineStr(r, 'E', rowIdx, dayData.awalLembur || '');
        r = updateCellInlineStr(r, 'F', rowIdx, dayData.akhirLembur || '');

        // Total Jam Lembur
        if (dayData.totalJamLembur > 0) {
          r = updateCellNumber(r, 'G', rowIdx, dayData.totalJamLembur);
        } else {
          r = updateCellInlineStr(r, 'G', rowIdx, '');
        }

        // Keterangan Lembur
        r = updateCellInlineStr(r, 'H', rowIdx, dayData.keterangan || '');

        // Pemberi Tugas
        r = updateCellInlineStr(r, 'I', rowIdx, dayData.pemberiTugas || '');

        return r;
      }
    );
  }

  // Row 47: Formula Total SUM(G17:G46)
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="47"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => {
      const cellRegex = /<c\s+r="G47"[^>]*>[\s\S]*?<\/c>/;
      const sMatch = rowXml.match(/<c\s+r="G47"[^>]*s="(\d+)"/);
      const sAttr = sMatch ? ` s="${sMatch[1]}"` : '';
      const newCell = `<c r="G47"${sAttr}><f>SUM(G17:G46)</f><v>${report.summary.totalJamLembur}</v></c>`;
      return rowXml.replace(cellRegex, newCell);
    }
  );

  // Signatures: Rows 55 & 56
  // Row 55: C55 (Staff Permata), E55 (Manager NR), I55 (Pekerja)
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="55"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => {
      let r = rowXml;
      r = updateCellInlineStr(r, 'C', 55, report.signatories.diketahuiNama);
      r = updateCellInlineStr(r, 'E', 55, report.signatories.disetujuiNama);
      r = updateCellInlineStr(r, 'I', 55, report.user.name);
      return r;
    }
  );

  // Row 56: C56 (Jabatan Permata), E56 (Jabatan Manager NR), I56 (Jabatan Pekerja)
  sheet1Xml = sheet1Xml.replace(
    /<row\s+r="56"[^>]*>[\s\S]*?<\/row>/,
    (rowXml) => {
      let r = rowXml;
      r = updateCellInlineStr(r, 'C', 56, report.signatories.diketahuiJabatan);
      r = updateCellInlineStr(r, 'E', 56, report.signatories.disetujuiJabatan);
      r = updateCellInlineStr(r, 'I', 56, report.user.position);
      return r;
    }
  );

  zip.file('xl/worksheets/sheet1.xml', sheet1Xml);

  // =========================================================================
  // 2. Process SPL Sheets: SPL 1 (sheet2), SPL 2 (sheet3), SPL 3 (sheet4)
  // =========================================================================
  const splSheets = [
    { file: 'xl/worksheets/sheet2.xml', name: 'SPL 1' },
    { file: 'xl/worksheets/sheet3.xml', name: 'SPL 2' },
    { file: 'xl/worksheets/sheet4.xml', name: 'SPL 3' },
  ];

  for (let i = 0; i < splSheets.length; i++) {
    const splCfg = splSheets[i];
    const splXmlFile = zip.file(splCfg.file);
    if (!splXmlFile) continue;
    let xml = await splXmlFile.async('text');

    const data = report.splList[i];
    if (data) {
      // Identitas pekerja, penugasan, dan tanda tangan SELALU diisi ulang agar
      // lembar SPL placeholder tidak menyisakan identitas bawaan template.
      // Baris tanggal terisi data nyata bila ada, atau '-' bila placeholder.
      // Row 7: Unit/Satuan Kerja D7
      xml = xml.replace(/<row\s+r="7"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 7, `: ${data.unitKerja}`)
      );
      // Row 8: Hari/Tanggal D8
      xml = xml.replace(/<row\s+r="8"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 8, `: ${data.hariTanggal}`)
      );
      // Row 10: Nama/NIP D10
      xml = xml.replace(/<row\s+r="10"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 10, `: ${data.namaPekerja} / ${data.nip}`)
      );
      // Row 11: Checkbox Biasa vs Emergency: D11 vs F11
      xml = xml.replace(/<row\s+r="11"[^>]*>[\s\S]*?<\/row>/, (row) => {
        let r = row;
        if (data.jenisLembur === 'BIASA') {
          r = updateCellInlineStr(r, 'D', 11, ':  [ X ]');
          r = updateCellInlineStr(r, 'F', 11, '[   ]');
        } else {
          r = updateCellInlineStr(r, 'D', 11, ':  [   ]');
          r = updateCellInlineStr(r, 'F', 11, '[ X ]');
        }
        return r;
      });
      // Row 13: Alasan Lembur D13
      xml = xml.replace(/<row\s+r="13"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 13, `: ${data.alasanLembur}`)
      );
      // Row 15: Tanggal Surat F15
      xml = xml.replace(/<row\s+r="15"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'F', 15, data.tanggalSurat)
      );
      // Row 20: Yang Memerintahkan F20
      xml = xml.replace(/<row\s+r="20"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'F', 20, `(${data.yangMemerintahkan}) `)
      );

      // Pertanggungjawaban Bagian Bawah
      // Row 30: Hari/Tanggal D30
      xml = xml.replace(/<row\s+r="30"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 30, `: ${data.hariTanggal}`)
      );
      // Row 31: Jam D31
      xml = xml.replace(/<row\s+r="31"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 31, `: ${data.jamKerja}`)
      );
      // Row 33: Checkbox Biasa vs Emergency: D33 vs F33
      xml = xml.replace(/<row\s+r="33"[^>]*>[\s\S]*?<\/row>/, (row) => {
        let r = row;
        if (data.jenisLembur === 'BIASA') {
          r = updateCellInlineStr(r, 'D', 33, ':  [ X ]');
          r = updateCellInlineStr(r, 'F', 33, '[   ]');
        } else {
          r = updateCellInlineStr(r, 'D', 33, ':  [   ]');
          r = updateCellInlineStr(r, 'F', 33, '[ X ]');
        }
        return r;
      });
      // Row 34: Hasil Kerja Lembur D34
      xml = xml.replace(/<row\s+r="34"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 34, `: ${data.hasilKerja}`)
      );
      // Row 37: Nama/NIP D37
      xml = xml.replace(/<row\s+r="37"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 37, `: ${data.namaPekerja} / ${data.nip}`)
      );
      // Row 38: Unit/Satuan Kerja D38
      xml = xml.replace(/<row\s+r="38"[^>]*>[\s\S]*?<\/row>/, (row) =>
        updateCellInlineStr(row, 'D', 38, `: ${data.unitKerja}`)
      );
      // Row 48: Yang Melaksanakan A48, Yang Memerintahkan F48
      xml = xml.replace(/<row\s+r="48"[^>]*>[\s\S]*?<\/row>/, (row) => {
        let r = row;
        r = updateCellInlineStr(r, 'A', 48, `(${data.yangMelaksanakan})`);
        r = updateCellInlineStr(r, 'F', 48, `(${data.yangMemerintahkan}) `);
        return r;
      });
    }

    zip.file(splCfg.file, xml);
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
