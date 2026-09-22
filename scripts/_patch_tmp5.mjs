// TEMP: patch leaveService (notify ADMIN+MANAGER, status PENDING, reject-cleanup)
import fs from 'fs';
const p = 'src/server/services/leaveService.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
let t = s.replace(/\r\n/g, '\n');

const repls = [
  ["import { createNotification, notifyAllManagers } from './notificationService';",
   "import { createNotification, notifyAllManagersAndAdmins } from './notificationService';\nimport { deleteEvidenceForRejectedRecord } from './evidenceCleanupService';"],
  [`  // Notify Managers
  await notifyAllManagers(
    'LEAVE_STATUS',
    \`Pengajuan \${params.type}: \${user.name}\`,
    \`Operator \${user.name} (\${user.employeeId}) mengajukan \${params.type} voor periode \${params.startDate} s/d \${params.endDate}.\${request.driveFileId ? ' Bukti surat tersedia.' : ''}\`,
    '/manager/requests'
  );`,
   `  // Notify Manager + Admin (status: PENDING)
  await notifyAllManagersAndAdmins(
    'LEAVE_STATUS',
    \`Pengajuan \${params.type} (PENDING): \${user.name}\`,
    \`Operator \${user.name} (\${user.employeeId}) mengajukan \${params.type} (Cuti/Izin/Sakit) voor periode \${params.startDate} s/d \${params.endDate}. Status: PENDING. Link naar detail: /manager/requests\`,
    '/manager/requests'
  );`],
  [`  // Notify Operator
  const decisionText = params.status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
  await createNotification({
    userId: existing.userId,
    type: 'LEAVE_STATUS',
    title: \`Pengajuan \${existing.type} \${decisionText}\`,
    message: \`Permohonan \${existing.type} Anda untuk tanggal \${existing.startDate} s/d \${existing.endDate} heeft \${decisionText.toLowerCase()} door Manager. \${params.reviewerNote ? \`Catatan: \${params.reviewerNote}\` : ''}\`,
    link: '/operator/requests',
  });`,
   `  // REJECTED → evidence veilig verwijderen (record blijft). Nooit bij APPROVED.
  if (params.status === 'REJECTED') {
    await deleteEvidenceForRejectedRecord('LeaveRequest', updated.id, params.managerId);
  }

  // Notify Operator
  const decisionText = params.status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
  await createNotification({
    userId: existing.userId,
    type: 'LEAVE_STATUS',
    title: \`Pengajuan \${existing.type} \${decisionText}\`,
    message: decisionText === 'Disetujui'
      ? \`Pengajuan cuti/izin Anda voor \${existing.startDate} s/d \${existing.endDate} is goedgekeurd.\`
      : \`Pengajuan cuti/izin Anda voor \${existing.startDate} s/d \${existing.endDate} is afgewezen.\${params.reviewerNote ? \` Catatan: \${params.reviewerNote}\` : ''}\`,
    link: '/operator/requests',
  });`],
];
for (const [a, b] of repls) {
  if (!t.includes(a)) { console.error('NOT FOUND: ' + JSON.stringify(a.slice(0, 70))); process.exit(1); }
  t = t.replace(a, b);
}
fs.writeFileSync(p, t.replace(/\n/g, eol), 'utf8');
console.log('OK leaveService patched');