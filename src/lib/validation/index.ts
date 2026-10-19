import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'Username minimal 3 karakter')
  .max(30, 'Username maksimal 30 karakter')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip');

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const checkInSchema = z.object({
  scheduleId: z.string().min(1, 'Jadwal kerja wajib dipilih'),
  location: z.string().optional().default('ORF Muara Karang'),
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  attendanceId: z.string().min(1, 'ID Absensi diperlukan'),
  notes: z.string().optional(),
});

export const scheduleSchema = z.object({
  userId: z.string().min(1, 'Operator wajib dipilih'),
  shiftId: z.string().min(1, 'Shift wajib dipilih'),
  locationId: z.string().min(1, 'Lokasi wajib dipilih'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  status: z.enum(['WORK', 'OFF'] as const).default('WORK'),
  notes: z.string().optional(),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const duplicateScheduleSchema = z.object({
  sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal sumber YYYY-MM-DD'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tujuan YYYY-MM-DD'),
});

export const leaveRequestSchema = z.object({
  targetUserId: z.string().optional(),
  type: z.enum(['LEAVE', 'PERMISSION', 'SICK'] as const),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal mulai YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal selesai YYYY-MM-DD'),
  reason: z.string().min(3, 'Alasan pengajuan minimal 3 karakter'),
  telepon: z.string().optional(),
  alamatCuti: z.string().optional(),
  penyerahanTugas: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentMime: z.string().optional(),
  attachmentSize: z.number().optional(),
  driveFileId: z.string().optional(),
  driveWebViewLink: z.string().optional(),
  storageProvider: z.string().optional(),
  storagePath: z.string().optional(),
})
  .refine(
    (v) => {
      // Bukti/surat wajib untuk semua jenis pengajuan (Cuti, Izin, Sakit)
      const hasProof = Boolean(v.attachmentUrl || v.driveWebViewLink || v.driveFileId || v.storagePath);
      return hasProof;
    },
    { message: 'Bukti surat wajib dilampirkan untuk pengajuan ini.', path: ['attachmentUrl'] }
  );

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const reviewLeaveSchema = z.object({
  requestId: z.string().min(1, 'ID Pengajuan wajib disertakan'),
  status: z.enum(['APPROVED', 'REJECTED'] as const),
  reviewerNote: z.string().optional(),
});

export const leaveApprovalSchema = z.object({
  requestId: z.string().min(1, 'ID Pengajuan wajib disertakan'),
  stage: z.enum(['REVIEWER', 'TEAM_LEAD', 'MANAGER'] as const, {
    message: 'Tahap approval tidak valid',
  }),
  status: z.enum(['APPROVED', 'REJECTED'] as const),
  note: z.string().optional(),
});

export const operationalReportSchema = z.object({
  title: z.string().min(3, 'Judul laporan minimal 3 karakter'),
  reportType: z.string().min(2, 'Jenis laporan wajib dipilih'),
  periodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal periode YYYY-MM-DD'),
  departmentId: z.string().optional(),
  description: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentMime: z.string().optional(),
  attachmentSize: z.number().optional(),
  driveFileId: z.string().optional(),
  driveWebViewLink: z.string().optional(),
  storageProvider: z.string().optional(),
  storagePath: z.string().optional(),
});

export type OperationalReportInput = z.infer<typeof operationalReportSchema>;

export const shiftExchangeSchema = z.object({
  requesterScheduleId: z.string().min(1, 'Hari OFF Anda wajib dipilih'),
  targetUserId: z.string().min(1, 'Operator tujuan wajib dipilih'),
  targetScheduleId: z.string().min(1, 'Hari OFF operator tujuan wajib dipilih'),
  reason: z.string().min(5, 'Alasan tukar hari OFF minimal 5 karakter'),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentMime: z.string().optional(),
  attachmentSize: z.number().optional(),
  driveFileId: z.string().optional(),
  driveWebViewLink: z.string().optional(),
  storageProvider: z.string().optional(),
  storagePath: z.string().optional(),
})
  .refine(
    (v) => {
      // Bukti/surat persetujuan wajib untuk mengajukan penukaran hari OFF
      const hasProof = Boolean(v.attachmentUrl || v.driveWebViewLink || v.driveFileId || v.storagePath);
      return hasProof;
    },
    { message: 'Bukti surat wajib dilampirkan untuk mengajukan tukar hari OFF.', path: ['attachmentUrl'] }
  );

export type ShiftExchangeInput = z.infer<typeof shiftExchangeSchema>;

export const reviewShiftExchangeSchema = z.object({
  exchangeId: z.string().min(1, 'ID Pengajuan pergantian shift wajib disertakan'),
  status: z.enum(['APPROVED', 'REJECTED'] as const),
  reviewerNote: z.string().optional(),
});

export const acceptShiftExchangeSchema = z.object({
  exchangeId: z.string().min(1, 'ID Pengajuan pergantian shift wajib disertakan'),
  accepted: z.boolean(),
});

export const handoverSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  shiftId: z.string().min(1, 'Shift wajib dipilih'),
  incomingOperatorId: z.string().min(1, 'Operator penerima shift wajib dipilih'),
  operationalNotes: z.string().min(10, 'Catatan operasional wajib diisi minimal 10 karakter'),
  equipmentStatus: z.string().min(3, 'Status peralatan wajib diisi'),
  issues: z.string().optional(),
  pendingTasks: z.string().optional(),
  safetyNotes: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'] as const).default('SUBMITTED'),
});

export type HandoverInput = z.infer<typeof handoverSchema>;

export const hsseChecklistSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  shiftId: z.string().min(1, 'Shift wajib dipilih'),
  locationId: z.string().min(1, 'Lokasi wajib dipilih'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      itemKey: z.string(),
      label: z.string(),
      status: z.enum(['YES', 'NO', 'NA'] as const),
      note: z.string().optional(),
    })
  ),
});

export type HSSEChecklistInput = z.infer<typeof hsseChecklistSchema>;

export const operatorCreateSchema = z.object({
  name: z.string().min(3, 'Nama operator minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  employeeId: z.string().min(3, 'Nomor Induk Pegawai minimal 3 karakter'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  position: z.string().min(2, 'Posisi/Jabatan minimal 2 karakter'),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR'] as const).default('OPERATOR'),
});

export type OperatorCreateInput = z.infer<typeof operatorCreateSchema>;

export const operatorUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3, 'Nama operator minimal 3 karakter'),
  position: z.string().min(2, 'Posisi/Jabatan minimal 2 karakter'),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  newPassword: z.string().optional(),
});

export type OperatorUpdateInput = z.infer<typeof operatorUpdateSchema>;

const avatarUrlSchema = z
  .string()
  .max(400_000, 'Ukuran foto terlalu besar. Gunakan foto yang lebih kecil.')
  .refine(
    (v) => v === '' || v.startsWith('data:image/') || v.startsWith('https://'),
    'Format foto profil tidak valid.'
  );

const adminUserBaseSchema = z.object({
  name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  email: z
    .union([z.literal(''), z.string().email('Format email tidak valid')])
    .optional(),
  employeeId: z.string().min(3, 'Employee ID minimal 3 karakter'),
  username: usernameSchema,
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  confirmPassword: z.string(),
  role: z.enum(['MANAGER', 'OPERATOR'] as const).default('OPERATOR'),
  position: z.string().min(2, 'Jabatan minimal 2 karakter'),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: avatarUrlSchema.optional().nullable(),
  isActive: z.boolean().default(true),
});

export const adminUserCreateSchema = adminUserBaseSchema.refine(
  (value) => value.password === value.confirmPassword,
  { message: 'Konfirmasi kata sandi tidak sama', path: ['confirmPassword'] }
);

export const adminUserUpdateSchema = adminUserBaseSchema
  .omit({ password: true, confirmPassword: true })
  .extend({
    id: z.string().min(1),
    role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR'] as const).optional(),
  });
export const adminPasswordResetSchema = z.object({ id: z.string().min(1), password: z.string().min(8, 'Kata sandi minimal 8 karakter') });
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  phone: z.string().optional(),
  avatarUrl: avatarUrlSchema.optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const announcementSchema = z
  .object({
    title: z.string().min(3, 'Judul minimal 3 karakter').max(120, 'Judul maksimal 120 karakter'),
    message: z.string().min(5, 'Pesan minimal 5 karakter').max(2000, 'Pesan maksimal 2000 karakter'),
    priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT'] as const),
    targetType: z.enum(['ALL', 'SHIFT', 'OPERATOR'] as const),
    targetId: z.string().optional(),
    startAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal mulai wajib diisi (YYYY-MM-DD)'),
    endAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal selesai YYYY-MM-DD').optional(),
  })
  .refine((v) => v.targetType === 'ALL' || Boolean(v.targetId), {
    message: 'Target shift/operator wajib dipilih',
    path: ['targetId'],
  });

export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const manualAttendanceCorrectionSchema = z.object({
  attendanceId: z.string().optional(),
  userId: z.string().min(1, 'Operator wajib dipilih'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: z.enum(['HADIR', 'TERLAMBAT', 'BELUM_ABSEN', 'ABSENT', 'IZIN', 'CUTI', 'SAKIT', 'OFF'] as const),
  notes: z.string().min(3, 'Alasan koreksi absensi wajib diisi'),
});

export type ManualAttendanceCorrectionInput = z.infer<typeof manualAttendanceCorrectionSchema>;

export const programKerjaCategoryEnum = z.enum([
  'PENGADAAN',
  'RAPAT_KOORDINASI',
  'OPERASIONAL_RUTIN',
  'AUDIT',
] as const);

export const programKerjaStatusEnum = z.enum([
  'PLAN',
  'REALISASI',
  'ON_PROGRESS',
  'BELUM_TEREALISASI',
] as const);

export const programKerjaProgressSchema = z.number().int().min(0, 'Progress minimal 0%').max(100, 'Progress maksimal 100%');

export const programKerjaBaseSchema = z.object({
  year: z.number().int().min(2020, 'Tahun minimal 2020').max(2100, 'Tahun maksimal 2100'),
  category: programKerjaCategoryEnum,
  sequence: z.number().int().min(1, 'Nomor urut minimal 1').max(999, 'Nomor urut maksimal 999'),
  name: z.string().min(3, 'Nama program minimal 3 karakter').max(250, 'Nama program maksimal 250 karakter'),
  plan: z.string().max(500, 'Deskripsi Plan maksimal 500 karakter').optional(),
  realization: z.string().max(500, 'Deskripsi Realisasi maksimal 500 karakter').optional(),
  planTarget: programKerjaProgressSchema.default(100),
  progress: programKerjaProgressSchema.default(0),
  status: programKerjaStatusEnum.default('PLAN'),
  notes: z.string().max(1000, 'Keterangan maksimal 1000 karakter').optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format deadline YYYY-MM-DD').nullable().optional(),
  picId: z.string().min(1, 'PIC tidak valid').optional(),
  evidenceUrl: z.string().optional(),
  evidenceName: z.string().optional(),
  evidenceMime: z.string().optional(),
  evidenceSize: z.number().optional(),
  driveFileId: z.string().optional(),
  driveWebViewLink: z.string().optional(),
  storageProvider: z.string().optional(),
  storagePath: z.string().optional(),
});

export const programKerjaCreateSchema = programKerjaBaseSchema.refine(
  (v) => {
    // Bukti/evidence wajib ketika progress > 0 atau status REALISASI/ON_PROGRESS
    const needsEvidence = v.progress > 0 || v.status === 'REALISASI' || v.status === 'ON_PROGRESS';
    if (!needsEvidence) return true;
    return Boolean(v.evidenceUrl || v.driveWebViewLink || v.driveFileId || v.storagePath);
  },
  { message: 'Bukti/evidence wajib dilampirkan untuk program dengan progress atau realisasi.', path: ['evidenceUrl'] }
);

export type ProgramKerjaCreateInput = z.infer<typeof programKerjaCreateSchema>;

export const programKerjaUpdateSchema = programKerjaBaseSchema
  .partial()
  .extend({ id: z.string().min(1, 'ID Program Kerja wajib disertakan') });

export type ProgramKerjaUpdateInput = z.infer<typeof programKerjaUpdateSchema>;

// ============================================================================
// RIWAYAT UPDATE PROGRAM (ProgramUpdate)
// ============================================================================
// Setiap pengiriman update = record terpisah (append-only). Status minimal
// TERKIRIM didukung; DRAFT/DIVERIFIKASI/DITOLAK tersedia untuk workflow masa
// depan (belum ada approval backend).
export const programUpdateSubmitSchema = z
  .object({
    programId: z.string().min(1, 'Program wajib dipilih.'),
    period: z.string().trim().min(1, 'Periode update wajib diisi.').max(120, 'Periode maksimal 120 karakter'),
    notes: z.string().trim().max(2000, 'Catatan update maksimal 2000 karakter').optional(),
    fileName: z.string().trim().max(255, 'Nama file maksimal 255 karakter').optional(),
    mimeType: z.string().trim().max(120).optional(),
    fileSize: z.number().int().min(0).max(50 * 1024 * 1024).optional(),
    storageProvider: z.string().trim().max(60).optional(),
    storagePath: z.string().trim().max(2048).optional(),
    driveFileId: z.string().trim().max(2048).optional(),
    driveWebViewLink: z.string().trim().max(2048).optional(),
    fileUrl: z.string().trim().max(2048).optional(),
  })
  .refine((v) => Boolean(v.fileName?.trim() || v.notes?.trim()), {
    message: 'Lampirkan file atau isi catatan pada update.',
    path: ['fileName'],
  });

export type ProgramUpdateSubmitInput = z.infer<typeof programUpdateSubmitSchema>;

// ============================================================================
// UPDATE PROGRESS KUMULATIF — "Tambah Realisasi Hari Ini"
// ============================================================================
export const programRealizationAddSchema = z.object({
  programId: z.string().min(1, 'Program wajib dipilih.'),
  amount: z.number().int().min(1, 'Jumlah realisasi hari ini minimal 1.').max(9999, 'Jumlah realisasi maksimal 9999.'),
  note: z.string().trim().max(500, 'Catatan update maksimal 500 karakter').optional(),
});

export type ProgramRealizationAddInput = z.infer<typeof programRealizationAddSchema>;

// ============================================================================
// INFO ORF — LAPORAN OPERASIONAL PER JAM
// ----------------------------------------------------------------------------
// Setiap tanggal dapat memiliki banyak laporan (satu per jam pencatatan).
// Validasi angka/satuan TIDAK mengubah nilai asli yang diinput.
// ============================================================================
export const infoOrfSectionEnum = z.enum(['UPSTREAM', 'TOTAL', 'FSRU'] as const);

export const infoOrfDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Tanggal laporan tidak valid.');

function infoOrfDecimal(precision: number, scale: number, label: string) {
  const scaleFactor = 10 ** scale;
  const maxInteger = 10 ** (precision - scale);
  return z
    .number()
    .finite(`${label} harus berupa angka valid`)
    .min(0, `${label} tidak boleh negatif`)
    .refine(
      (value) => {
        const scaled = value * scaleFactor;
        return Math.abs(value) < maxInteger && Math.abs(scaled - Math.round(scaled)) < Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
      },
      `${label} tidak dapat disimpan tepat dengan presisi database (maksimal ${scale} angka desimal).`
    );
}

export const infoOrfMetricInputSchema = z.object({
  section: infoOrfSectionEnum,
  key: z.string().trim().min(1, 'Kode metrik wajib diisi').max(80),
  label: z.string().trim().min(1, 'Label metrik wajib diisi').max(120),
  value: infoOrfDecimal(18, 4, 'Nilai'),
  unit: z.string().trim().min(1, 'Satuan wajib diisi').max(20),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const infoOrfLineInputSchema = z.object({
  lineCode: z.string().trim().min(1, 'Kode line wajib diisi').max(40),
  lineName: z.string().trim().min(1, 'Nama line wajib diisi').max(120),
  flowRate: infoOrfDecimal(18, 4, 'Flow').nullable().optional(),
  volume: infoOrfDecimal(18, 4, 'Volume').nullable().optional(),
  energy: infoOrfDecimal(18, 4, 'Energi').nullable().optional(),
  temperature: infoOrfDecimal(18, 4, 'Temperature').nullable().optional(),
  flowUnit: z.string().trim().min(1, 'Satuan flow wajib diisi').max(20).default('MMSCFD'),
  volumeUnit: z.string().trim().min(1, 'Satuan volume wajib diisi').max(20).default('m³'),
  energyUnit: z.string().trim().min(1, 'Satuan energi wajib diisi').max(20).default('MMBTU'),
  temperatureUnit: z.string().trim().min(1, 'Satuan temperature wajib diisi').max(20).default('°F'),
  sortOrder: z.number().int().min(0).max(999).default(0),
}).refine(
  (line) => line.flowRate != null || line.volume != null || line.energy != null,
  { message: 'Isi minimal satu nilai flow, volume, atau energy untuk setiap line.', path: ['flowRate'] }
);

export const infoOrfReportSchema = z.object({
  reportDate: infoOrfDateSchema,
  reportHour: z.string().regex(/^([01]\d|2[0-3])$/, 'Jam pencatatan harus 00–23'),
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').nullable().optional(),
  nextCargoId: z.string().trim().min(1).nullable().optional(),
  metrics: z.array(infoOrfMetricInputSchema).min(1, 'Minimal satu data metrik harus diisi'),
  lines: z.array(infoOrfLineInputSchema).min(1, 'Minimal satu line penyaluran harus diisi').max(50, 'Maksimal 50 line penyaluran'),
}).superRefine((report, context) => {
  for (const section of infoOrfSectionEnum.options) {
    if (!report.metrics.some((metric) => metric.section === section)) {
      context.addIssue({
        code: 'custom',
        path: ['metrics'],
        message: `Minimal satu metrik untuk bagian ${section} wajib diisi.`,
      });
    }
  }
});

export const infoOrfReportUpdateSchema = infoOrfReportSchema.safeExtend({
  id: z.string().min(1, 'ID laporan wajib disertakan'),
});

const monitoringLineSchema = infoOrfLineInputSchema.safeExtend({
  flowRate: infoOrfDecimal(18, 4, 'Flow'),
  volume: infoOrfDecimal(18, 4, 'Volume'),
  energy: infoOrfDecimal(18, 4, 'Energy'),
  temperature: infoOrfDecimal(18, 4, 'Temperature'),
});

const MONITORING_LINE_CODES = [
  'LINE-350-PLN-IP-PRIOK',
  'LINE-350-PLN-NP-MK',
  'LINE-620-PLN-NP-MK',
  'LINE-PERTAGAS-PLN-NP-MTW',
  'LINE-PEAKER-PLN-NP-MK',
  'LINE-PGN',
] as const;

const MONITORING_METRIC_KEYS = ['PRESSURE', 'TEMPERATURE', 'TOTAL_FLOW', 'LNG_FLOW', 'ROB_LNG'] as const;

export const monitoringOrfReportSchema = z.object({
  reportDate: infoOrfDateSchema,
  reportHour: z.string().regex(/^([01]\d|2[0-3])$/, 'Jam pencatatan harus 00–23'),
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').nullable().optional(),
  nextCargoId: z.string().trim().min(1).nullable().optional(),
  nextCargoCode: z.string().trim().max(60).nullable().optional(),
  nextCargoEta: z.string().datetime({ offset: true, message: 'ETA Next Cargo harus memiliki zona waktu.' }).nullable().optional(),
  metrics: z.array(infoOrfMetricInputSchema).length(MONITORING_METRIC_KEYS.length),
  lines: z.array(monitoringLineSchema).length(MONITORING_LINE_CODES.length),
}).superRefine((report, context) => {
  if (Boolean(report.nextCargoCode) !== Boolean(report.nextCargoEta)) {
    context.addIssue({
      code: 'custom',
      path: ['nextCargoCode'],
      message: 'Kode cargo dan ETA harus diisi bersamaan.',
    });
  }
  if (report.metrics.length !== new Set(report.metrics.map((metric) => metric.key)).size) {
    context.addIssue({ code: 'custom', path: ['metrics'], message: 'Kode parameter laporan tidak boleh duplikat.' });
  }
  for (const key of MONITORING_METRIC_KEYS) {
    if (!report.metrics.some((metric) => metric.key === key)) {
      context.addIssue({ code: 'custom', path: ['metrics'], message: `Data ${key} wajib diisi.` });
    }
  }
  const submittedCodes = report.lines.map((line) => line.lineCode);
  if (new Set(submittedCodes).size !== MONITORING_LINE_CODES.length ||
      MONITORING_LINE_CODES.some((code) => !submittedCodes.includes(code))) {
    context.addIssue({ code: 'custom', path: ['lines'], message: 'Semua enam line Monitoring ORF harus diisi tepat satu kali.' });
  }
});

export const monitoringOrfReportUpdateSchema = monitoringOrfReportSchema.safeExtend({
  id: z.string().min(1, 'ID laporan wajib disertakan'),
});

export const nextCargoSchema = z.object({
  id: z.string().trim().min(1).nullable().optional(),
  eta: z.string().datetime({ offset: true, message: 'ETA harus format datetime ISO (mis. 2026-10-20T08:00:00+07:00)' }),
  cargoCode: z.string().trim().min(1, 'Kode cargo wajib diisi').max(60),
  vesselName: z.string().trim().max(120).nullable().optional(),
  volumeLng: infoOrfDecimal(18, 2, 'Volume LNG').nullable().optional(),
  status: z.enum(['SCHEDULED', 'DISCHARGING', 'COMPLETED', 'CANCELLED'] as const),
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').nullable().optional(),
});

export type InfoOrfReportInput = z.infer<typeof infoOrfReportSchema>;
export type InfoOrfReportUpdateInput = z.infer<typeof infoOrfReportUpdateSchema>;
export type NextCargoInput = z.infer<typeof nextCargoSchema>;
