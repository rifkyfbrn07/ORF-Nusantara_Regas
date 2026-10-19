/**
 * Configuration and core operational calculation rules for Overtime (Lembur).
 * All calculation rules can be adjusted here without modifying code throughout the app.
 */

export interface OvertimeConfig {
  /** Jam kerja normal harian (default: 8 jam) */
  normalWorkHoursPerDay: number;
  /** Lokasi penempatan default */
  defaultLocation: string;
  /** Unit / Satuan kerja default */
  defaultUnitKerja: string;
  /** Supervisor / Pemberi tugas default */
  defaultSupervisor: string;
  /** Atasan langsung default */
  defaultAtasanLangsung: string;
  /** Manager PT Nusantara Regas default */
  defaultManagerNR: string;
  /** Jabatan Manager PT Nusantara Regas default */
  defaultManagerNRJabatan: string;
  /** Staff Project Support PT Permata Karya Jasa default */
  defaultStaffPermata: string;
  /** Jabatan Staff Permata default */
  defaultStaffPermataJabatan: string;
  /** Pjs Kepala Departemen default */
  defaultPjsKepalaDept: string;
}

export const OVERTIME_CONFIG: OvertimeConfig = {
  normalWorkHoursPerDay: 8,
  defaultLocation: 'NR Muara Karang',
  defaultUnitKerja: 'Operasi',
  defaultSupervisor: 'Muhammad Tauvik Ibrahim',
  defaultAtasanLangsung: 'Yosep Ismail Zulkarnain',
  defaultManagerNR: 'Yosep Ismail Zulkarnain',
  defaultManagerNRJabatan: 'Manager Gas Distribution & ORF Management',
  defaultStaffPermata: 'Aditya Paramayudha',
  defaultStaffPermataJabatan: 'Staff Project Support',
  defaultPjsKepalaDept: 'Pjs. Kepala Departemen Distribusi Gas & ORF',
};

/**
 * Calculates work duration in hours between two time strings (HH:mm or HH.mm).
 * Correctly handles overnight shifts crossing midnight (e.g., 19:00 - 07:00 = 12 hours)
 * without negative duration.
 */
export function calculateDurationHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0;

  const [hIn, mIn] = parseTime(timeIn);
  const [hOut, mOut] = parseTime(timeOut);

  let startMins = hIn * 60 + mIn;
  let endMins = hOut * 60 + mOut;

  // Cross midnight detection: e.g. 19:00 to 07:00
  if (endMins < startMins) {
    endMins += 24 * 60;
  }

  const durationMinutes = endMins - startMins;
  return Math.round((durationMinutes / 60) * 100) / 100;
}

function parseTime(timeStr: string): [number, number] {
  const clean = timeStr.trim().replace('.', ':');
  const parts = clean.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return [isNaN(h) ? 0 : h, isNaN(m) ? 0 : m];
}

export interface OvertimeCalculationResult {
  isScheduledWork: boolean;
  actualDurationHours: number;
  overtimeHours: number;
  awalLembur: string;
  akhirLembur: string;
  keterangan: string;
  pemberiTugas: string;
  isIncomplete: boolean;
}

/**
 * Core Operational Overtime Calculation Engine
 * 
 * Skenario 1 — Operator bekerja pada jadwal ON (Hari kerja terjadwal):
 *   - Jam kerja normal: 8 jam.
 *   - Jam Lembur = Maksimum(0, Jam Kerja Aktual - 8).
 *   - Contoh: 8 jam -> 0 jam; 10 jam -> 2 jam; 12 jam -> 4 jam.
 *   - Shift Pagi (07.00 - 19.00): Awal lembur 15.00, Akhir lembur 19.00.
 *   - Shift Malam (19.00 - 07.00): Awal lembur 03.00, Akhir lembur 07.00.
 * 
 * Skenario 2 — Operator bekerja pada jadwal OFF:
 *   - Jika operator seharusnya OFF tetapi masuk bekerja (misalnya mem-backup tim):
 *     Seluruh jam kerja aktual dihitung sebagai jam lembur!
 *   - Rumus: Jika Jadwal = OFF dan Operator Bekerja: Jam Lembur = Jam Kerja Aktual.
 *   - Contoh: Bekerja 12 jam -> Jam Lembur = 12 jam.
 *   - Awal & Akhir lembur = Jam masuk dan jam pulang.
 * 
 * Jadwal OFF tanpa kerja:
 *   - Jam Lembur = 0, Keterangan = "Off Duty".
 */
export function calculateDayOvertime(params: {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
}): OvertimeCalculationResult {
  const supervisor = params.supervisorName || OVERTIME_CONFIG.defaultSupervisor;

  // 1. Cuti
  if (params.isLeave) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Cuti',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Determine standard shift times if checkIn/checkOut are missing
  const isPagi = params.shiftCode === 'ORF_PAGI';
  const isMalam = params.shiftCode === 'ORF_MALAM';

  let rawIn = params.checkIn || '';
  let rawOut = params.checkOut || '';

  // If scheduled WORK and no attendance was explicitly logged, fall back to shift standard
  if (params.isScheduledWork && !rawIn && !rawOut) {
    if (isPagi) {
      rawIn = '07.00';
      rawOut = '19.00';
    } else if (isMalam) {
      rawIn = '19.00';
      rawOut = '07.00';
    }
  }

  // 2. Off Duty (Jadwal OFF and not working)
  if (!params.isScheduledWork && !rawIn && !rawOut) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Off Duty',
      pemberiTugas: '',
      isIncomplete: false,
    };
  }

  // Incomplete attendance flag (checkIn without checkOut)
  const isIncomplete = Boolean(rawIn && !rawOut);
  if (isIncomplete) {
    return {
      isScheduledWork: params.isScheduledWork,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: params.customNote || 'Absensi Belum Lengkap (Perlu Pemeriksaan)',
      pemberiTugas: supervisor,
      isIncomplete: true,
    };
  }

  // Format time display: 19:00 -> 19.00
  const formattedIn = rawIn.replace(':', '.');
  const formattedOut = rawOut.replace(':', '.');

  const actualDuration = calculateDurationHours(rawIn, rawOut);

  // Skenario 2: Operator terjadwal OFF tetapi masuk kerja
  if (!params.isScheduledWork) {
    const overtimeHours = actualDuration;
    const defaultBackupNote = isPagi ? 'Lembur Back Up Tim C' : 'Lembur Back Up Tim A';
    return {
      isScheduledWork: false,
      actualDurationHours: actualDuration,
      overtimeHours,
      awalLembur: formattedIn,
      akhirLembur: formattedOut,
      keterangan: params.customNote || defaultBackupNote,
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Skenario 1: Operator terjadwal ON (WORK)
  // Jam Lembur = Max(0, Jam Kerja Aktual - 8)
  const normalHours = OVERTIME_CONFIG.normalWorkHoursPerDay;
  const overtimeHours = Math.max(0, actualDuration - normalHours);

  let awalLembur = '';
  let akhirLembur = '';
  let defaultNote = 'Lembur Kerja';

  if (overtimeHours > 0) {
    akhirLembur = formattedOut;
    if (isPagi || formattedIn.startsWith('07')) {
      awalLembur = '15.00';
      defaultNote = 'Lembur Shift Pagi';
    } else if (isMalam || formattedIn.startsWith('19')) {
      awalLembur = '03.00';
      defaultNote = 'Lembur Shift Malam';
    } else {
      // General shift: start of overtime is 8 hours after check in
      const [hIn, mIn] = parseTime(rawIn);
      const otStartH = (hIn + normalHours) % 24;
      awalLembur = `${otStartH.toString().padStart(2, '0')}.${mIn.toString().padStart(2, '0')}`;
    }
  }

  return {
    isScheduledWork: true,
    actualDurationHours: actualDuration,
    overtimeHours,
    awalLembur,
    akhirLembur,
    keterangan: params.customNote || defaultNote,
    pemberiTugas: supervisor,
    isIncomplete: false,
  };
}
