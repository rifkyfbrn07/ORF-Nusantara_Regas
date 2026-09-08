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
  type: z.enum(['LEAVE', 'PERMISSION', 'SICK'] as const),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal mulai YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal selesai YYYY-MM-DD'),
  reason: z.string().min(5, 'Alasan pengajuan minimal 5 karakter'),
  attachmentUrl: z.string().optional(),
});

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const reviewLeaveSchema = z.object({
  requestId: z.string().min(1, 'ID Pengajuan wajib disertakan'),
  status: z.enum(['APPROVED', 'REJECTED'] as const),
  reviewerNote: z.string().optional(),
});

export const shiftExchangeSchema = z.object({
  requesterScheduleId: z.string().min(1, 'Jadwal Anda wajib dipilih'),
  targetUserId: z.string().min(1, 'Operator tujuan wajib dipilih'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tujuan YYYY-MM-DD'),
  reason: z.string().min(5, 'Alasan pergantian shift minimal 5 karakter'),
});

export type ShiftExchangeInput = z.infer<typeof shiftExchangeSchema>;

export const reviewShiftExchangeSchema = z.object({
  exchangeId: z.string().min(1, 'ID Pengajuan pergantian shift wajib disertakan'),
  status: z.enum(['APPROVED', 'REJECTED'] as const),
  reviewerNote: z.string().optional(),
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
    // Saat update, role existing (termasuk ADMIN utama) boleh dipertahankan;
    // eskalasi ke ADMIN diblokir di server action.
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
  checkInTime: z.string().optional(), // "HH:mm"
  checkOutTime: z.string().optional(), // "HH:mm"
  status: z.enum(['HADIR', 'TERLAMBAT', 'BELUM_ABSEN', 'ABSENT', 'IZIN', 'CUTI', 'SAKIT', 'OFF'] as const),
  notes: z.string().min(3, 'Alasan koreksi absensi wajib diisi'),
});

export type ManualAttendanceCorrectionInput = z.infer<typeof manualAttendanceCorrectionSchema>;

// ============================================================================
// PROGRAM KERJA (P = Plan, R = Realisasi) — Departemen Distribusi Gas & ORF
// ============================================================================

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

export const programKerjaCreateSchema = z.object({
  year: z.number().int().min(2020, 'Tahun minimal 2020').max(2100, 'Tahun maksimal 2100'),
  category: programKerjaCategoryEnum,
  sequence: z.number().int().min(1, 'Nomor urut minimal 1').max(999, 'Nomor urut maksimal 999'),
  name: z.string().min(3, 'Nama program minimal 3 karakter').max(250, 'Nama program maksimal 250 karakter'),
  plan: z.string().max(500, 'Deskripsi Plan maksimal 500 karakter').optional(),
  realization: z.string().max(500, 'Deskripsi Realisasi maksimal 500 karakter').optional(),
  planTarget: z.number().int().min(0).max(100).default(100),
  progress: z.number().int().min(0, 'Realisasi minimal 0%').max(100, 'Realisasi maksimal 100%').default(0),
  status: programKerjaStatusEnum.default('PLAN'),
  notes: z.string().max(1000, 'Keterangan maksimal 1000 karakter').optional(),
});

export type ProgramKerjaCreateInput = z.infer<typeof programKerjaCreateSchema>;

export const programKerjaUpdateSchema = programKerjaCreateSchema
  .partial()
  .extend({ id: z.string().min(1, 'ID Program Kerja wajib disertakan') });

export type ProgramKerjaUpdateInput = z.infer<typeof programKerjaUpdateSchema>;
