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

  // NEW: Roster-based assumption mode - when enabled, ON schedule = 8 normal + 4 lembur assumption
  if (params.assumeOnShift4HoursLembur) {
    const overtimeHours = 4;
    const normalHours = 8;
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';
    const isPagi = params.shiftCode === 'ORF_PAGI';
    const isMalam = params.shiftCode === 'ORF_MALAM';

    if (isMalam) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Determine if we have checkIn/checkout
  const hasCheckIn = params.checkIn !== null && params.checkIn !== '';
  const hasCheckOut = params.checkOut !== null && params.checkOut !== '';

  // Extract checkIn/checkout values
  const rawIn = params.checkIn || '';
  const rawOut = params.checkOut || '';

  // Format time display
  const formattedIn = rawIn.replace(':', '.');
  const formattedOut = rawOut.replace(':', '.');

  // Determine shift type
  const isPagi = params.shiftCode === 'ORF_PAGI';
  const isMalam = params.shiftCode === 'ORF_MALAM';

  // 2. Off Duty (no confirmation)
  if (!params.isScheduledWork && !hasCheckIn && !hasCheckOut) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Tidak ada konfirmasi kerja pada hari OFF (berdasarkan roster)',
      pemberiTugas: '',
      isIncomplete: false,
    };
  }

  // If OFF but has explicit confirmation
  if (!params.isScheduledWork && hasCheckIn && hasCheckOut) {
    const actualDuration = calculateDurationHours(rawIn, rawOut);
    const overtimeHours = actualDuration;

    const defaultBackupNote = isPagi ? 'Lembur Back Up Tim C' : 'Lembur Back Up Tim A';

    return {
      isScheduledWork: false,
      actualDurationHours: actualDuration,
      overtimeHours,
      awalLembur: formattedIn,
      akhirLembur: formattedOut,
      keterangan: params.customNote || defaultBackupNote + ' (confirmed working on OFF day)',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 3. Incomplete attendance (checkIn without checkOut)
  if (hasCheckIn && !hasCheckOut) {
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
// 4. Calculate actual duration
  const actualDuration = calculateDurationHours(rawIn, rawOut);

  // 5. Operator terjadwal ON (WORK) - menggunakan asumsi roster
  // Jam normal = 8 jam, Jam lembur = 4 jam (assumption), Total = 12 jam
  if (params.isScheduledWork) {
    const normalHours = 8;
    const overtimeHours = 4; // Fixed assumption, bukan Math.max(0, actualDuration - 8)
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';

    if (isPagi || (rawIn && rawIn.startsWith('07'))) {
      awalLembur = '15.00';
    } else if (isMalam || (rawIn && rawIn.startsWith('19'))) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    } else {
      const parsedIn = parseTime(rawIn);
      const otStartH = (parsedIn[0] + normalHours) % 24;
      awalLembur = `${otStartH.toString().padStart(2, '0')}.${parsedIn[1].toString().padStart(2, '0')}`;
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 6. Operator terjadwal OFF but has explicit checkIn/checkout (backup working)
  const overtimeHours = actualDuration;

  return {
    isScheduledWork: false,
    actualDurationHours: actualDuration,
    overtimeHours,
    awalLembur: formattedIn,
    akhirLembur: formattedOut,
    keterangan: params.customNote || 'Lembur Backup (working on OFF day)',
    pemberiTugas: supervisor,
    isIncomplete: false,
  };
}
export interface CalculateDayOvertimeParams {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
  // NEW: Use roster-based assumption when scheduled work (8 normal + 4 lembur assumption, not from actual attendance)
  assumeOnShift4HoursLembur?: boolean;
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
/**
 * Configuration and core operational calculation rules for Overtime (Lembur).
 * All calculation rules can be adjusted here without modifying code throughout the app.
 */
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
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
// 4. Calculate actual duration
  const actualDuration = calculateDurationHours(rawIn, rawOut);

  // 5. Operator terjadwal ON (WORK) - menggunakan asumsi roster
  // Jam normal = 8 jam, Jam lembur = 4 jam (assumption), Total = 12 jam
  if (params.isScheduledWork) {
    const normalHours = 8;
    const overtimeHours = 4; // Fixed assumption, bukan Math.max(0, actualDuration - 8)
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';

    if (isPagi || (rawIn && rawIn.startsWith('07'))) {
      awalLembur = '15.00';
    } else if (isMalam || (rawIn && rawIn.startsWith('19'))) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    } else {
      const parsedIn = parseTime(rawIn);
      const otStartH = (parsedIn[0] + normalHours) % 24;
      awalLembur = `${otStartH.toString().padStart(2, '0')}.${parsedIn[1].toString().padStart(2, '0')}`;
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 6. Operator terjadwal OFF but has explicit checkIn/checkout (backup working)
  const overtimeHours = actualDuration;

  return {
    isScheduledWork: false,
    actualDurationHours: actualDuration,
    overtimeHours,
    awalLembur: formattedIn,
    akhirLembur: formattedOut,
    keterangan: params.customNote || 'Lembur Backup (working on OFF day)',
    pemberiTugas: supervisor,
    isIncomplete: false,
  };
}
/**
 * Calculates overtime for a single day based on scheduled work status and attendance.
 *
 * Modes:
 * 1. assumeOnShift4HoursLembur=true: When true, ON schedule = 8 jam normal + 4 jam lembur assumption
 *    (used when attendance data is not yet active, using roster assumption)
 * 2. isScheduledWork=true, assumeOnShift4HoursLembur=false: ON schedule with actual attendance
 * 3. isScheduledWork=false, has checkIn/checkout: OFF but working (backup)
 * 4. isScheduledWork=false, no checkIn/checkout: Off Duty
 * 5. isLeave=true: Cuti
 */
export function calculateDayOvertime(params) {
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

  // NEW: Roster-based assumption mode - when enabled, ON schedule = 8 normal + 4 lembur assumption
  if (params.assumeOnShift4HoursLembur) {
    const overtimeHours = 4;
    const normalHours = 8;
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';
    const isPagi = params.shiftCode === 'ORF_PAGI';
    const isMalam = params.shiftCode === 'ORF_MALAM';

    if (isMalam) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Determine if we have checkIn/checkout
  const hasCheckIn = params.checkIn !== null && params.checkIn !== '';
  const hasCheckOut = params.checkOut !== null && params.checkOut !== '';

  // Extract checkIn/checkout values
  const rawIn = params.checkIn || '';
  const rawOut = params.checkOut || '';

  // Format time display
  const formattedIn = rawIn.replace(':', '.');
  const formattedOut = rawOut.replace(':', '.');

  // Determine shift type
  const isPagi = params.shiftCode === 'ORF_PAGI';
  const isMalam = params.shiftCode === 'ORF_MALAM';

  // 2. Off Duty (no confirmation)
  if (!params.isScheduledWork && !hasCheckIn && !hasCheckOut) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Tidak ada konfirmasi kerja pada hari OFF (berdasarkan roster)',
      pemberiTugas: '',
      isIncomplete: false,
    };
  }

  // If OFF but has explicit confirmation
  if (!params.isScheduledWork && hasCheckIn && hasCheckOut) {
    const actualDuration = calculateDurationHours(rawIn, rawOut);
    const overtimeHours = actualDuration;

    const defaultBackupNote = isPagi ? 'Lembur Back Up Tim C' : 'Lembur Back Up Tim A';

    return {
      isScheduledWork: false,
      actualDurationHours: actualDuration,
      overtimeHours,
      awalLembur: formattedIn,
      akhirLembur: formattedOut,
      keterangan: params.customNote || defaultBackupNote + ' (confirmed working on OFF day)',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 3. Incomplete attendance (checkIn without checkOut)
  if (hasCheckIn && !hasCheckOut) {
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
export interface CalculateDayOvertimeParams {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
  // NEW: Use roster-based assumption when scheduled work (8 normal + 4 lembur assumption, not from actual attendance)
  assumeOnShift4HoursLembur?: boolean;
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
/** 
 * Configuration and core operational calculation rules for Overtime (Lembur). 
 * All calculation rules can be adjusted here without modifying code throughout the app. 
 */
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
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
// 4. Calculate actual duration
  const actualDuration = calculateDurationHours(rawIn, rawOut);

  // 5. Operator terjadwal ON (WORK) - menggunakan asumsi roster
  // Jam normal = 8 jam, Jam lembur = 4 jam (assumption), Total = 12 jam
  if (params.isScheduledWork) {
    const normalHours = 8;
    const overtimeHours = 4; // Fixed assumption, bukan Math.max(0, actualDuration - 8)
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';

    if (isPagi || (rawIn && rawIn.startsWith('07'))) {
      awalLembur = '15.00';
    } else if (isMalam || (rawIn && rawIn.startsWith('19'))) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    } else {
      const parsedIn = parseTime(rawIn);
      const otStartH = (parsedIn[0] + normalHours) % 24;
      awalLembur = `${otStartH.toString().padStart(2, '0')}.${parsedIn[1].toString().padStart(2, '0')}`;
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 6. Operator terjadwal OFF but has explicit checkIn/checkout (backup working)
  const overtimeHours = actualDuration;

  return {
    isScheduledWork: false,
    actualDurationHours: actualDuration,
    overtimeHours,
    awalLembur: formattedIn,
    akhirLembur: formattedOut,
    keterangan: params.customNote || 'Lembur Backup (working on OFF day)',
    pemberiTugas: supervisor,
    isIncomplete: false,
  };
}
/**
 * Calculates overtime for a single day based on scheduled work status and attendance.
 *
 * Modes:
 * 1. assumeOnShift4HoursLembur=true: When true, ON schedule = 8 jam normal + 4 jam lembur assumption
 *    (used when attendance data is not yet active, using roster assumption)
 * 2. isScheduledWork=true, assumeOnShift4HoursLembur=false: ON schedule with actual attendance
 * 3. isScheduledWork=false, has checkIn/checkout: OFF but working (backup)
 * 4. isScheduledWork=false, no checkIn/checkout: Off Duty
 * 5. isLeave=true: Cuti
 */
export function calculateDayOvertime(params) {
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

  // NEW: Roster-based assumption mode - when enabled, ON schedule = 8 normal + 4 lembur assumption
  if (params.assumeOnShift4HoursLembur) {
    const overtimeHours = 4;
    const normalHours = 8;
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';
    const isPagi = params.shiftCode === 'ORF_PAGI';
    const isMalam = params.shiftCode === 'ORF_MALAM';

    if (isMalam) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Determine if we have checkIn/checkout
  const hasCheckIn = params.checkIn !== null && params.checkIn !== '';
  const hasCheckOut = params.checkOut !== null && params.checkOut !== '';

  // Extract checkIn/checkout values
  const rawIn = params.checkIn || '';
  const rawOut = params.checkOut || '';

  // Format time display
  const formattedIn = rawIn.replace(':', '.');
  const formattedOut = rawOut.replace(':', '.');

  // Determine shift type
  const isPagi = params.shiftCode === 'ORF_PAGI';
  const isMalam = params.shiftCode === 'ORF_MALAM';

  // 2. Off Duty (no confirmation)
  if (!params.isScheduledWork && !hasCheckIn && !hasCheckOut) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Tidak ada konfirmasi kerja pada hari OFF (berdasarkan roster)',
      pemberiTugas: '',
      isIncomplete: false,
    };
  }

  // If OFF but has explicit confirmation
  if (!params.isScheduledWork && hasCheckIn && hasCheckOut) {
    const actualDuration = calculateDurationHours(rawIn, rawOut);
    const overtimeHours = actualDuration;

    const defaultBackupNote = isPagi ? 'Lembur Back Up Tim C' : 'Lembur Back Up Tim A';

    return {
      isScheduledWork: false,
      actualDurationHours: actualDuration,
      overtimeHours,
      awalLembur: formattedIn,
      akhirLembur: formattedOut,
      keterangan: params.customNote || defaultBackupNote + ' (confirmed working on OFF day)',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 3. Incomplete attendance (checkIn without checkOut)
  if (hasCheckIn && !hasCheckOut) {
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
export interface CalculateDayOvertimeParams {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
  // NEW: Use roster-based assumption when scheduled work (8 normal + 4 lembur assumption, not from actual attendance)
  assumeOnShift4HoursLembur?: boolean;
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
/** 
 * Configuration and core operational calculation rules for Overtime (Lembur). 
 * All calculation rules can be adjusted here without modifying code throughout the app. 
 */
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
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
// 4. Calculate actual duration
  const actualDuration = calculateDurationHours(rawIn, rawOut);

  // 5. Operator terjadwal ON (WORK) - menggunakan asumsi roster
  // Jam normal = 8 jam, Jam lembur = 4 jam (assumption), Total = 12 jam
  if (params.isScheduledWork) {
    const normalHours = 8;
    const overtimeHours = 4; // Fixed assumption, bukan Math.max(0, actualDuration - 8)
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';

    if (isPagi || (rawIn && rawIn.startsWith('07'))) {
      awalLembur = '15.00';
    } else if (isMalam || (rawIn && rawIn.startsWith('19'))) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    } else {
      const parsedIn = parseTime(rawIn);
      const otStartH = (parsedIn[0] + normalHours) % 24;
      awalLembur = `${otStartH.toString().padStart(2, '0')}.${parsedIn[1].toString().padStart(2, '0')}`;
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 6. Operator terjadwal OFF but has explicit checkIn/checkout (backup working)
  const overtimeHours = actualDuration;

  return {
    isScheduledWork: false,
    actualDurationHours: actualDuration,
    overtimeHours,
    awalLembur: formattedIn,
    akhirLembur: formattedOut,
    keterangan: params.customNote || 'Lembur Backup (working on OFF day)',
    pemberiTugas: supervisor,
    isIncomplete: false,
  };
}
/**
 * Calculates overtime for a single day based on scheduled work status and attendance.
 *
 * Modes:
 * 1. assumeOnShift4HoursLembur=true: When true, ON schedule = 8 jam normal + 4 jam lembur assumption
 *    (used when attendance data is not yet active, using roster assumption)
 * 2. isScheduledWork=true, assumeOnShift4HoursLembur=false: ON schedule with actual attendance
 * 3. isScheduledWork=false, has checkIn/checkout: OFF but working (backup)
 * 4. isScheduledWork=false, no checkIn/checkout: Off Duty
 * 5. isLeave=true: Cuti
 */
export function calculateDayOvertime(params) {
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

  // NEW: Roster-based assumption mode - when enabled, ON schedule = 8 normal + 4 lembur assumption
  if (params.assumeOnShift4HoursLembur) {
    const overtimeHours = 4;
    const normalHours = 8;
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';
    const isPagi = params.shiftCode === 'ORF_PAGI';
    const isMalam = params.shiftCode === 'ORF_MALAM';

    if (isMalam) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Determine if we have checkIn/checkout
  const hasCheckIn = params.checkIn !== null && params.checkIn !== '';
  const hasCheckOut = params.checkOut !== null && params.checkOut !== '';

  // Extract checkIn/checkout values
  const rawIn = params.checkIn || '';
  const rawOut = params.checkOut || '';

  // Format time display
  const formattedIn = rawIn.replace(':', '.');
  const formattedOut = rawOut.replace(':', '.');

  // Determine shift type
  const isPagi = params.shiftCode === 'ORF_PAGI';
  const isMalam = params.shiftCode === 'ORF_MALAM';

  // 2. Off Duty (no confirmation)
  if (!params.isScheduledWork && !hasCheckIn && !hasCheckOut) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Tidak ada konfirmasi kerja pada hari OFF (berdasarkan roster)',
      pemberiTugas: '',
      isIncomplete: false,
    };
  }

  // If OFF but has explicit confirmation
  if (!params.isScheduledWork && hasCheckIn && hasCheckOut) {
    const actualDuration = calculateDurationHours(rawIn, rawOut);
    const overtimeHours = actualDuration;

    const defaultBackupNote = isPagi ? 'Lembur Back Up Tim C' : 'Lembur Back Up Tim A';

    return {
      isScheduledWork: false,
      actualDurationHours: actualDuration,
      overtimeHours,
      awalLembur: formattedIn,
      akhirLembur: formattedOut,
      keterangan: params.customNote || defaultBackupNote + ' (confirmed working on OFF day)',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 3. Incomplete attendance (checkIn without checkOut)
  if (hasCheckIn && !hasCheckOut) {
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
export interface CalculateDayOvertimeParams {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
  // NEW: Use roster-based assumption when scheduled work (8 normal + 4 lembur assumption, not from actual attendance)
  assumeOnShift4HoursLembur?: boolean;
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
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
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
/** @type {import('next').Config} */
module.exports = {
  reactStrictMode: true,
};
export interface CalculateDayOvertimeParams {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
  // NEW: Use roster-based assumption when scheduled work (8 normal + 4 lembur assumption, not from actual attendance)
  assumeOnShift4HoursLembur?: boolean;
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
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
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
// 4. Calculate actual duration
  const actualDuration = calculateDurationHours(rawIn, rawOut);

  // 5. Operator terjadwal ON (WORK) - menggunakan asumsi roster
  // Jam normal = 8 jam, Jam lembur = 4 jam (assumption), Total = 12 jam
  if (params.isScheduledWork) {
    const normalHours = 8;
    const overtimeHours = 4; // Fixed assumption, bukan Math.max(0, actualDuration - 8)
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';

    if (isPagi || (rawIn && rawIn.startsWith('07'))) {
      awalLembur = '15.00';
    } else if (isMalam || (rawIn && rawIn.startsWith('19'))) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    } else {
      const parsedIn = parseTime(rawIn);
      const otStartH = (parsedIn[0] + normalHours) % 24;
      awalLembur = `${otStartH.toString().padStart(2, '0')}.${parsedIn[1].toString().padStart(2, '0')}`;
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 6. Operator terjadwal OFF but has explicit checkIn/checkout (backup working)
  const overtimeHours = actualDuration;

  return {
    isScheduledWork: false,
    actualDurationHours: actualDuration,
    overtimeHours,
    awalLembur: formattedIn,
    akhirLembur: formattedOut,
    keterangan: params.customNote || 'Lembur Backup (working on OFF day)',
    pemberiTugas: supervisor,
    isIncomplete: false,
  };
}
/**
 * Calculates overtime for a single day based on scheduled work status and attendance.
 *
 * Modes:
 * 1. assumeOnShift4HoursLembur=true: When true, ON schedule = 8 jam normal + 4 jam lembur assumption
 *    (used when attendance data is not yet active, using roster assumption)
 * 2. isScheduledWork=true, assumeOnShift4HoursLembur=false: ON schedule with actual attendance
 * 3. isScheduledWork=false, has checkIn/checkout: OFF but working (backup)
 * 4. isScheduledWork=false, no checkIn/checkout: Off Duty
 * 5. isLeave=true: Cuti
 */
export function calculateDayOvertime(params) {
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

  // NEW: Roster-based assumption mode - when enabled, ON schedule = 8 normal + 4 lembur assumption
  if (params.assumeOnShift4HoursLembur) {
    const overtimeHours = 4;
    const normalHours = 8;
    const actualDurationHours = normalHours + overtimeHours;

    let awalLembur = '15.00';
    let akhirLembur = '19.00';
    const isPagi = params.shiftCode === 'ORF_PAGI';
    const isMalam = params.shiftCode === 'ORF_MALAM';

    if (isMalam) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Determine if we have checkIn/checkout
  const hasCheckIn = params.checkIn !== null && params.checkIn !== '';
  const hasCheckOut = params.checkOut !== null && params.checkOut !== '';

  // Extract checkIn/checkout values
  const rawIn = params.checkIn || '';
  const rawOut = params.checkOut || '';

  // Format time display
  const formattedIn = rawIn.replace(':', '.');
  const formattedOut = rawOut.replace(':', '.');

  // Determine shift type
  const isPagi = params.shiftCode === 'ORF_PAGI';
  const isMalam = params.shiftCode === 'ORF_MALAM';

  // 2. Off Duty (no confirmation)
  if (!params.isScheduledWork && !hasCheckIn && !hasCheckOut) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Tidak ada konfirmasi kerja pada hari OFF (berdasarkan roster)',
      pemberiTugas: '',
      isIncomplete: false,
    };
  }

  // If OFF but has explicit confirmation
  if (!params.isScheduledWork && hasCheckIn && hasCheckOut) {
    const actualDuration = calculateDurationHours(rawIn, rawOut);
    const overtimeHours = actualDuration;

    const defaultBackupNote = isPagi ? 'Lembur Back Up Tim C' : 'Lembur Back Up Tim A';

    return {
      isScheduledWork: false,
      actualDurationHours: actualDuration,
      overtimeHours,
      awalLembur: formattedIn,
      akhirLembur: formattedOut,
      keterangan: params.customNote || defaultBackupNote + ' (confirmed working on OFF day)',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 3. Incomplete attendance (checkIn without checkOut)
  if (hasCheckIn && !hasCheckOut) {
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
 * Parameters for calculating day overtime.
 */
export interface CalculateDayOvertimeParams {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
  // NEW: Use roster-based assumption when scheduled work (8 normal + 4 lembur assumption, not from actual attendance)
  assumeOnShift4HoursLembur?: boolean;
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
};
/**
 * Configuration and core operational calculation rules for Overtime (Lembur).
 * All calculation rules can be adjusted here without modifying code throughout the app.
 */
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
}

