import { prisma } from '@/lib/db/prisma';
import { RequestStatus, ScheduleStatus } from '@prisma/client';
import {
  calculateDayOvertime,
  OVERTIME_CONFIG,
} from './overtimeConfig';

export interface OvertimeDayItem {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1 to 31
  dayName: string; // Senin, Selasa, etc.
  isScheduledWork: boolean; // ON vs OFF from Roster
  shiftName: string;
  shiftCode: string;
  checkIn: string; // e.g. "19.00" or ""
  checkOut: string; // e.g. "07.00" or ""
  awalLembur: string; // e.g. "03.00" or ""
  akhirLembur: string; // e.g. "07.00" or ""
  totalJamLembur: number; // 0, 4, 12, etc.
  keterangan: string; // "Lembur Shift Malam", "Lembur Back Up Tim A", "Off Duty", "Cuti"
  pemberiTugas: string;
  isIncomplete: boolean;
}

export interface OvertimeSplItem {
  id: string;
  sheetName: string; // "SPL 1", "SPL 2", "SPL 3", etc.
  unitKerja: string;
  hariTanggal: string; // e.g. "Jumat, 4 September 2026"
  dateStr: string; // YYYY-MM-DD
  namaPekerja: string;
  nip: string;
  jenisLembur: 'BIASA' | 'EMERGENCY';
  alasanLembur: string;
  tanggalSurat: string; // e.g. "Jakarta, 3-9-2026"
  yangMemerintahkan: string;
  jamKerja: string; // e.g. "19.00 - 07.00"
  hasilKerja: string; // e.g. "Kegiatan Operasi Lancar"
  yangMelaksanakan: string;
}

export interface MonthlyOvertimeReport {
  user: {
    id: string;
    name: string;
    employeeId: string; // NIP template row 10
    nipInternal: string; // NIP template row 9
    position: string;
    department: string;
    phone: string;
    location: string;
  };
  period: {
    year: number;
    month: number;
    monthName: string; // e.g. "September"
    periodeBulanText: string; // e.g. "September 2026"
    totalDays: number;
  };
  days: OvertimeDayItem[];
  splList: OvertimeSplItem[];
  summary: {
    totalJamLembur: number;
    totalHariKerjaON: number;
    totalHariLiburOFF: number;
    totalHariLemburBackup: number;
    totalHariCuti: number;
    totalHariIncomplete: number;
  };
  signatories: {
    diketahuiPT: string;
    diketahuiNama: string;
    diketahuiJabatan: string;
    disetujuiPT: string;
    disetujuiNama: string;
    disetujuiJabatan: string;
    dibuatNama: string;
    dibuatJabatan: string;
  };
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Generates the full Monthly Overtime Report for a specific user and month.
 * Automatically integrates:
 * 1. Operator Roster / Schedule (for ON vs OFF status)
 * 2. Attendances (for actual checkIn & checkOut)
 * 3. Approved LeaveRequests (for Cuti)
 * 4. Prepares SPL documents for all backup / emergency / off-day overtime events.
 */
export async function getMonthlyOvertimeReport(
  userId: string,
  year: number,
  month: number // 1-indexed (1 to 12)
): Promise<MonthlyOvertimeReport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: true },
  });

  if (!user) {
    throw new Error('Data pekerja tidak ditemukan.');
  }

  const monthStr = month.toString().padStart(2, '0');
  const periodPrefix = `${year}-${monthStr}`;
  const totalDays = new Date(year, month, 0).getDate();
  const monthName = INDO_MONTHS[month - 1];

  // 1. Fetch schedules for this user in this month
  const schedules = await prisma.schedule.findMany({
    where: {
      userId,
      date: { startsWith: periodPrefix },
    },
    include: { shift: true },
    orderBy: { date: 'asc' },
  });
  const scheduleMap = new Map<string, typeof schedules[0]>();
  for (const s of schedules) {
    scheduleMap.set(s.date, s);
  }

  // 2. Fetch attendances for this user in this month
  const attendances = await prisma.attendance.findMany({
    where: {
      userId,
      date: { startsWith: periodPrefix },
    },
    orderBy: { date: 'asc' },
  });
  const attendanceMap = new Map<string, typeof attendances[0]>();
  for (const a of attendances) {
    attendanceMap.set(a.date, a);
  }

  // 3. Fetch approved leaves overlapping this month
  const startDateMonth = `${periodPrefix}-01`;
  const endDateMonth = `${periodPrefix}-${totalDays.toString().padStart(2, '0')}`;
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: RequestStatus.APPROVED,
      startDate: { lte: endDateMonth },
      endDate: { gte: startDateMonth },
    },
    include: { reviewedBy: true },
  });

  // Calculate day-by-day records
  const days: OvertimeDayItem[] = [];
  let totalJamLembur = 0;
  let totalHariKerjaON = 0;
  let totalHariLiburOFF = 0;
  let totalHariLemburBackup = 0;
  let totalHariCuti = 0;
  let totalHariIncomplete = 0;

  const splCandidates: OvertimeDayItem[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const dayStr = d.toString().padStart(2, '0');
    const date = `${periodPrefix}-${dayStr}`;
    const dateObj = new Date(year, month - 1, d);
    const dayName = INDO_DAYS[dateObj.getDay()];

    const sched = scheduleMap.get(date);
    const att = attendanceMap.get(date);

    // Check if this day is within an approved leave request
    const isLeave = approvedLeaves.some((l) => l.startDate <= date && l.endDate >= date);
    const isScheduledWork = sched ? sched.status === ScheduleStatus.WORK && sched.shift?.code !== 'ORF_OFF' : false;

    // Check-in and Check-out
    let checkIn = '';
    let checkOut = '';
    if (att) {
      if (att.checkIn) {
        checkIn = formatTimeWIB(att.checkIn);
      }
      if (att.checkOut) {
        checkOut = formatTimeWIB(att.checkOut);
      }
    }

    const shiftCode = sched?.shift?.code || (isScheduledWork ? 'ORF_PAGI' : 'ORF_OFF');
    const shiftName = sched?.shift?.name || (isScheduledWork ? 'PAGI' : 'OFF');

    const result = calculateDayOvertime({
      isScheduledWork,
      isLeave,
      shiftCode,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      customNote: sched?.notes || null,
      supervisorName: OVERTIME_CONFIG.defaultAtasanLangsung,
    });

    if (result.isIncomplete) totalHariIncomplete++;
    if (isLeave) {
      totalHariCuti++;
    } else if (isScheduledWork) {
      totalHariKerjaON++;
    } else {
      totalHariLiburOFF++;
    }

    if (!isScheduledWork && result.overtimeHours > 0) {
      totalHariLemburBackup++;
    }

    totalJamLembur += result.overtimeHours;

    const dayItem: OvertimeDayItem = {
      date,
      dayNumber: d,
      dayName,
      isScheduledWork,
      shiftName,
      shiftCode,
      checkIn: result.awalLembur && !isScheduledWork ? result.awalLembur : (result.actualDurationHours > 0 ? (shiftCode === 'ORF_MALAM' ? '19.00' : '07.00') : ''),
      checkOut: result.akhirLembur && !isScheduledWork ? result.akhirLembur : (result.actualDurationHours > 0 ? (shiftCode === 'ORF_MALAM' ? '07.00' : '19.00') : ''),
      awalLembur: result.awalLembur,
      akhirLembur: result.akhirLembur,
      totalJamLembur: result.overtimeHours,
      keterangan: result.keterangan,
      pemberiTugas: result.pemberiTugas,
      isIncomplete: result.isIncomplete,
    };

    days.push(dayItem);

    // Candidates for SPL: off-day backup shifts with 12h overtime or explicit backup notes
    if (!isScheduledWork && result.overtimeHours >= 8) {
      splCandidates.push(dayItem);
    }
  }

  // Pre-fill SPL documents:
  // Jika event backup OFF kurang dari 3, fallback ke hari dengan jam lembur
  // tertinggi (termasuk lembur hari kerja ON) agar SPL terisi data jadwal
  // sebenarnya, bukan sekadar placeholder kosong.
  const fallbackSplCandidates = days
    .filter((d) => d.totalJamLembur > 0 && !splCandidates.some((c) => c.date === d.date))
    .sort((a, b) => b.totalJamLembur - a.totalJamLembur);
  const orderedSplCandidates = [...splCandidates, ...fallbackSplCandidates];

  const splList: OvertimeSplItem[] = [];
  const splCount = Math.max(3, orderedSplCandidates.length);

  for (let i = 0; i < splCount; i++) {
    const candidate = orderedSplCandidates[i];
    const sheetName = `SPL ${i + 1}`;

    if (candidate) {
      const prevDate = new Date(candidate.date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = `${prevDate.getDate()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}-${prevDate.getFullYear()}`;

      splList.push({
        id: `spl-${candidate.date}`,
        sheetName,
        unitKerja: user.department?.name || OVERTIME_CONFIG.defaultUnitKerja,
        hariTanggal: `${candidate.dayName}, ${candidate.dayNumber} ${monthName} ${year}`,
        dateStr: candidate.date,
        namaPekerja: user.name,
        nip: user.employeeId,
        jenisLembur: 'BIASA',
        alasanLembur: candidate.keterangan || 'Lembur Backup Tim',
        tanggalSurat: `Jakarta, ${prevDateStr}`,
        yangMemerintahkan: OVERTIME_CONFIG.defaultSupervisor,
        jamKerja: `${candidate.checkIn || '19.00'} - ${candidate.checkOut || '07.00'}`,
        hasilKerja: 'Kegiatan Operasi Lancar',
        yangMelaksanakan: user.name,
      });
    } else if (i < 3) {
      // Keep empty template placeholder for SPL 1-3 if fewer backup days occurred
      splList.push({
        id: `spl-placeholder-${i + 1}`,
        sheetName,
        unitKerja: user.department?.name || OVERTIME_CONFIG.defaultUnitKerja,
        hariTanggal: `-`,
        dateStr: '',
        namaPekerja: user.name,
        nip: user.employeeId,
        jenisLembur: 'BIASA',
        alasanLembur: '-',
        tanggalSurat: `Jakarta, ${monthName} ${year}`,
        yangMemerintahkan: OVERTIME_CONFIG.defaultSupervisor,
        jamKerja: '-',
        hasilKerja: 'Kegiatan Operasi Lancar',
        yangMelaksanakan: user.name,
      });
    }
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      employeeId: user.employeeId, // e.g. 1226000094
      nipInternal: '83200800100', // standard Perkasa / Pertamina internal placement code from template
      position: user.position || 'Penunjang Pengoperasian ORF',
      department: user.department?.name || 'Operasi',
      phone: user.phone || '-',
      location: OVERTIME_CONFIG.defaultLocation,
    },
    period: {
      year,
      month,
      monthName,
      periodeBulanText: `${monthName} ${year}`,
      totalDays,
    },
    days,
    splList,
    summary: {
      totalJamLembur,
      totalHariKerjaON,
      totalHariLiburOFF,
      totalHariLemburBackup,
      totalHariCuti,
      totalHariIncomplete,
    },
    signatories: {
      diketahuiPT: 'PT Permata Karya Jasa',
      diketahuiNama: OVERTIME_CONFIG.defaultStaffPermata,
      diketahuiJabatan: OVERTIME_CONFIG.defaultStaffPermataJabatan,
      disetujuiPT: 'PT. Nusantara Regas',
      disetujuiNama: OVERTIME_CONFIG.defaultManagerNR,
      disetujuiJabatan: OVERTIME_CONFIG.defaultManagerNRJabatan,
      dibuatNama: user.name,
      dibuatJabatan: user.position || 'Penunjang Pengoperasian ORF',
    },
  };
}

/**
 * Formats a Date object to WIB time string (HH.mm)
 */
function formatTimeWIB(date: Date): string {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return parts.replace(':', '.');
}
