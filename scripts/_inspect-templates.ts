import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function main() {
  const docxPath = path.join(process.cwd(), 'public', 'template', 'Cuti Nurman 26 & 27 September 2026.docx');
  const xlsxPath = path.join(process.cwd(), 'public', 'template', 'Form Lembur September - Nurman Assauri.xlsx');

  console.log('==================== DOCX TEMPLATE ====================');
  const dz = await JSZip.loadAsync(fs.readFileSync(docxPath));
  const docXml = await dz.file('word/document.xml')?.async('text');
  if (docXml) {
    const paras = docXml.match(/<w:p(?:[^>]*)>[\s\S]*?<\/w:p>/g) || [];
    console.log(`Total paragraphs: ${paras.length}`);
    paras.forEach((p, i) => {
      const text = p.replace(/<[^>]+>/g, '').trim();
      if (text) console.log(`${i}: ${text}`);
    });
  }

  console.log('\n==================== XLSX TEMPLATE ====================');
  const xz = await JSZip.loadAsync(fs.readFileSync(xlsxPath));
  const files = Object.keys(xz.files).filter((f) => f.startsWith('xl/worksheets/'));
  console.log('Worksheet files:', JSON.stringify(files));
  const wb = await xz.file('xl/workbook.xml')?.async('text');
  if (wb) {
    const sheetNames = [...wb.matchAll(/<sheet[^>]*name="([^"]+)"/g)].map((m) => m[1]);
    console.log('Sheet names (from workbook.xml):', JSON.stringify(sheetNames));
  }
  const rels = await xz.file('xl/_rels/workbook.xml.rels')?.async('text');
  if (rels) {
    const relMap = [...rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].reduce((acc, m) => {
      acc[m[1]] = m[2];
      return acc;
    }, {} as Record<string, string>);
    console.log('workbook rels:', JSON.stringify(relMap));
  }

  // Dump row-level text for each sheet (first 60 rows)
  for (const f of files) {
    const xml = await xz.file(f)?.async('text');
    if (!xml) continue;
    console.log(`\n--- ${f} ---`);
    const rows = xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];
    console.log(`Rows: ${rows.length}`);
    rows.slice(0, 60).forEach((r) => {
      const rn = (r.match(/r="(\d+)"/) || [])[1];
      const text = r.replace(/<[^>]+>/g, '').trim();
      if (text) console.log(`  row ${rn}: ${text.slice(0, 160)}`);
    });
  }
}

main().catch(console.error);
