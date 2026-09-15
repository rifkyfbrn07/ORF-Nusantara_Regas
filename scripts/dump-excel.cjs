/* eslint-disable */
// Dump lengkap seluruh baris kedua sheet + merges ke file teks.
const fs = require('fs');
const XLSX = require('xlsx');
const file = 'c:\\Users\\lapto\\Downloads\\Program kerja Distribusi Gas & ORF 2026.xlsx';
const wb = XLSX.readFile(file);
const out = [];
const PERIOD_COLS = [];
for (let m = 0; m < 12; m++) for (let w = 1; w <= 4; w++) PERIOD_COLS.push({ col: 3 + m * 4 + (w - 1), month: m + 1, week: w });
out.push('COLUMNS PANJANG: ' + PERIOD_COLS.map((p) => XLSX.utils.encode_col(p.col)).join(','));
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  out.push('==== SHEET: ' + name + ' ====');
  out.push('MERGES: ' + JSON.stringify(ws['!merges'] || []));
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const vals = [];
    for (const p of PERIOD_COLS) {
      const v = row[p.col];
      if (v !== null && v !== undefined && v !== '') vals.push('m' + p.month + '.w' + p.week + '=' + v);
    }
    const cells = [];
    for (let c = 0; c < Math.min(60, row.length); c++) {
      const v = row[c];
      if (v !== null && v !== undefined && v !== '') cells.push(XLSX.utils.encode_col(c) + '=' + String(v).replace(/\n/g, '\\n'));
    }
    out.push((r + 1) + '| ' + cells.join(' ; ') + (vals.length ? ' || PERIODS[' + vals.join(',') + ']' : ''));
  }
}
fs.writeFileSync('scripts/excel-audit.txt', out.join('\n'), 'utf8');
console.log('written scripts/excel-audit.txt lines=' + out.length);