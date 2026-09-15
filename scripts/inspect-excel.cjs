/* eslint-disable */
// Audit cepat struktur Program kerja Excel (untuk verifikasi parsing).
const XLSX = require('xlsx');
const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/inspect-excel.cjs <file.xlsx>');
  process.exit(1);
}
const wb = XLSX.readFile(path, { cellDates: false });
console.log('=== SHEETS ===');
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  console.log(`- "${name}" ref=${ws['!ref']} merges=${(ws['!merges'] || []).length}`);
}

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  console.log(`\n=== SHEET: ${name} ===`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  // Print col letter mapping for columns D..AY
  const colLetters = [];
  for (let i = 3; i <= 50; i++) colLetters.push(XLSX.utils.encode_col(i));
  console.log('Columns:', colLetters.join(' '));
  // print first 12 rows in full to see header structure
  const printRow = (r) => {
    const cells = r.map((v, i) => (v === null || v === undefined ? '' : `[${XLSX.utils.encode_col(i)}]${String(v).replace(/\n/g, '\\n')}`));
    return cells.join(' | ');
  };
  for (let i = 0; i < Math.min(14, rows.length); i++) {
    console.log(`R${i + 1}: ${printRow(rows[i])}`);
  }
  console.log(`... total data rows: ${rows.length}`);
}