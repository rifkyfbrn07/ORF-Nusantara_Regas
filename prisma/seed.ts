import { PrismaClient, Role, ScheduleStatus, AttendanceStatus, LeaveType, RequestStatus, HandoverStatus, ChecklistStatus, ChecklistItemStatus, NotificationType, AnnouncementPriority, AnnouncementTargetType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { slugifyUsername } from '../src/lib/auth/username';

const prisma = new PrismaClient();

const usedUsernames = new Set<string>(['admin', 'manager']);

function uniqueUsername(name: string): string {
  const base = slugifyUsername(name);
  let candidate = base;
  let suffix = 2;
  while (usedUsernames.has(candidate)) candidate = `${base}${suffix++}`.slice(0, 30);
  usedUsernames.add(candidate);
  return candidate;
}

async function main() {
  console.log('--- Starting PERTAMINA FIELDOPS Database Seed ---');

  // 1. Clean existing records in cascade order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.hSSEChecklistItem.deleteMany();
  await prisma.hSSEChecklist.deleteMany();
  await prisma.handover.deleteMany();
  await prisma.shiftExchange.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.location.deleteMany();
  await prisma.department.deleteMany();

  console.log('✓ Cleaned existing tables');

  // 2. Create Departments
  const deptOps = await prisma.department.create({
    data: {
      name: 'Operations & Production',
      code: 'OPS',
      description: 'Operasional Lapangan, Control Room, Gas Metering, & Scada Systems',
    },
  });

  const deptMaint = await prisma.department.create({
    data: {
      name: 'Maintenance & Reliability',
      code: 'MAINT',
      description: 'Pemeliharaan Mekanikal, Elektrikal, & Instrumentasi Fasilitas Gas',
    },
  });

  const deptHsse = await prisma.department.create({
    data: {
      name: 'HSSE & Safety Compliance',
      code: 'HSSE',
      description: 'Health, Safety, Security, and Environmental Field Monitoring',
    },
  });

  console.log('✓ Created Departments');

  // 3. Create Locations
  const locationOrf = await prisma.location.create({
    data: {
      name: 'ORF Muara Karang',
      code: 'ORF-MKG',
      address: 'Onshore Receiving Facility Muara Karang, Jl. Pluit Karang Ayu, Pluit, Penjaringan, Jakarta Utara',
    },
  });

  await prisma.location.create({
    data: {
      name: 'Platform Echo Booster',
      code: 'PLT-ECHO',
      address: 'Offshore Processing Platform Area Offshore North West Java',
    },
  });

  console.log('✓ Created Locations');

  // 4. Create Shifts (Operational 24/7 3-Shift System)
  const shiftPagi = await prisma.shift.create({
    data: {
      name: 'Shift Pagi',
      code: 'SHIFT_PAGI',
      startTime: '06:00',
      endTime: '14:00',
      durationHours: 8,
      requiredCount: 9,
      description: 'Shift Pagi Operasional Gas Receiving & Compression Station (06:00 - 14:00 WIB)',
    },
  });

  const shiftSiang = await prisma.shift.create({
    data: {
      name: 'Shift Siang',
      code: 'SHIFT_SIANG',
      startTime: '14:00',
      endTime: '22:00',
      durationHours: 8,
      requiredCount: 8,
      description: 'Shift Siang Distribusi & Monitoring Tekanan Gas Pipa (14:00 - 22:00 WIB)',
    },
  });

  await prisma.shift.create({
    data: {
      name: 'Shift Malam',
      code: 'SHIFT_MALAM',
      startTime: '22:00',
      endTime: '06:00',
      durationHours: 8,
      requiredCount: 6,
      description: 'Shift Malam Pengawasan Kontinu & Emergency Standby (22:00 - 06:00 WIB)',
    },
  });

  console.log('✓ Created Shifts');

  // 5. Password Hashes
  const managerPasswordHash = await bcrypt.hash('Manager123!', 10);
  const operatorPasswordHash = await bcrypt.hash('Operator123!', 10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@fieldops.local' },
    update: { employeeId: 'FO-ADM-001', name: 'System Administrator', username: 'admin', passwordHash: adminPasswordHash, role: Role.ADMIN, position: 'System Administrator', isActive: true, departmentId: deptOps.id },
    create: { employeeId: 'FO-ADM-001', name: 'System Administrator', username: 'admin', email: 'admin@fieldops.local', passwordHash: adminPasswordHash, role: Role.ADMIN, position: 'System Administrator', isActive: true, departmentId: deptOps.id },
  });

  // 6. Create Manager
  const managerUser = await prisma.user.create({
    data: {
      employeeId: 'FO-MGR-001',
      name: 'Rifky Febrian',
      username: 'manager',
      email: 'manager@fieldops.local',
      passwordHash: managerPasswordHash,
      role: Role.MANAGER,
      position: 'Field Operations Superintendent',
      phone: '+62 811-2345-6789',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 7. Create Operators
  const operatorsData = [
    {
      employeeId: 'FO-OPR-101',
      name: 'Andi Pratama',
      email: 'operator1@fieldops.local',
      position: 'Lead Control Room Operator',
      phone: '+62 812-9876-1001',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-102',
      name: 'Budi Santoso',
      email: 'operator2@fieldops.local',
      position: 'Gas Metering & Quality Technician',
      phone: '+62 812-9876-1002',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-103',
      name: 'Citra Dewi',
      email: 'operator3@fieldops.local',
      position: 'Process Safety Field Operator',
      phone: '+62 812-9876-1003',
      departmentId: deptHsse.id,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-104',
      name: 'Dimas Saputra',
      email: 'operator4@fieldops.local',
      position: 'Mechanical & Rotating Equipment Operator',
      phone: '+62 812-9876-1004',
      departmentId: deptMaint.id,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-105',
      name: 'Eko Ramadhan',
      email: 'operator5@fieldops.local',
      position: 'Electrical & Instrumentation Operator',
      phone: '+62 812-9876-1005',
      departmentId: deptMaint.id,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-106',
      name: 'Fajar Nugraha',
      email: 'operator6@fieldops.local',
      position: 'Pipeline Integrity & Valve Station Operator',
      phone: '+62 812-9876-1006',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-107',
      name: 'Gita Permata',
      email: 'operator7@fieldops.local',
      position: 'Utilities & Fire Water System Operator',
      phone: '+62 812-9876-1007',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-108',
      name: 'Hadi Wijaya',
      email: 'operator8@fieldops.local',
      position: 'Gas Compression Specialist',
      phone: '+62 812-9876-1008',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-109',
      name: 'Indra Kurniawan',
      email: 'operator9@fieldops.local',
      position: 'Field Patrol & Scada Monitor',
      phone: '+62 812-9876-1009',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-110',
      name: 'Joko Susilo',
      email: 'operator10@fieldops.local',
      position: 'HSSE Field Compliance Officer',
      phone: '+62 812-9876-1010',
      departmentId: deptHsse.id,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-111',
      name: 'Kurnia Setiawan',
      email: 'operator11@fieldops.local',
      position: 'Metering Station Field Operator',
      phone: '+62 812-9876-1011',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    },
    {
      employeeId: 'FO-OPR-112',
      name: 'Lukman Hakim',
      email: 'operator12@fieldops.local',
      position: 'Pig Launcher & Receiver Operator',
      phone: '+62 812-9876-1012',
      departmentId: deptOps.id,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const createdOperators = [];
  for (const op of operatorsData) {
    const user = await prisma.user.create({
      data: {
        employeeId: op.employeeId,
        name: op.name,
        username: uniqueUsername(op.name),
        email: op.email,
        passwordHash: operatorPasswordHash,
        role: Role.OPERATOR,
        position: op.position,
        phone: op.phone,
        departmentId: op.departmentId,
        avatarUrl: op.avatarUrl,
      },
    });
    createdOperators.push(user);
  }

  console.log(`✓ Created Manager + ${createdOperators.length} Operators`);

  // Target Date = Today (2026-09-03)
  const today = '2026-09-03';
  const tomorrow = '2026-09-04';
  const yesterday = '2026-09-02';

  // 8. Create Today's Schedules & Status Configurations
  // [op0] Andi Pratama: Shift Pagi, WORK, Check-in 05:52 -> HADIR
  const schedAndi = await prisma.schedule.create({
    data: {
      userId: createdOperators[0].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
      notes: 'Control Room primary operator',
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[0].id,
      scheduleId: schedAndi.id,
      date: today,
      checkIn: new Date('2026-09-03T05:52:00+07:00'),
      status: AttendanceStatus.HADIR,
      lateMinutes: 0,
      checkInLocation: 'ORF Muara Karang (GPS Verified)',
      notes: 'On-time check in via Biometric & Mobile',
    },
  });

  // [op1] Budi Santoso: Shift Pagi, WORK, Check-in 06:21 (21 min late) -> TERLAMBAT
  const schedBudi = await prisma.schedule.create({
    data: {
      userId: createdOperators[1].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
      notes: 'Gas Metering stream B verification',
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[1].id,
      scheduleId: schedBudi.id,
      date: today,
      checkIn: new Date('2026-09-03T06:21:00+07:00'),
      status: AttendanceStatus.TERLAMBAT,
      lateMinutes: 21,
      checkInLocation: 'ORF Muara Karang Main Gate',
      notes: 'Terlambat 21 menit - kendala lalu lintas akses jembatan',
    },
  });

  // [op2] Citra Dewi: Shift Siang, Scheduled WORK, but Approved CUTI
  const schedCitra = await prisma.schedule.create({
    data: {
      userId: createdOperators[2].id,
      shiftId: shiftSiang.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
      notes: 'Cuti Tahunan (Approved)',
    },
  });
  await prisma.leaveRequest.create({
    data: {
      userId: createdOperators[2].id,
      type: LeaveType.LEAVE,
      startDate: '2026-09-02',
      endDate: '2026-09-04',
      reason: 'Cuti tahunan keluarga terencana di Bandung',
      status: RequestStatus.APPROVED,
      reviewedById: managerUser.id,
      reviewedAt: new Date('2026-09-01T10:30:00+07:00'),
      reviewerNote: 'Disetujui. Pastikan handover proses safety diserahkan.',
    },
  });

  // [op3] Dimas Saputra: Shift Pagi, WORK, Check-in 05:48 -> HADIR
  const schedDimas = await prisma.schedule.create({
    data: {
      userId: createdOperators[3].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[3].id,
      scheduleId: schedDimas.id,
      date: today,
      checkIn: new Date('2026-09-03T05:48:00+07:00'),
      status: AttendanceStatus.HADIR,
      lateMinutes: 0,
      checkInLocation: 'ORF Muara Karang Area Compressor B',
    },
  });

  // [op4] Eko Ramadhan: Shift Pagi, WORK, no check-in yet -> BELUM ABSEN (Needs attention!)
  await prisma.schedule.create({
    data: {
      userId: createdOperators[4].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
      notes: 'Electrical switchgear 6kV monitoring',
    },
  });

  // [op5] Fajar Nugraha: OFF
  await prisma.schedule.create({
    data: {
      userId: createdOperators[5].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.OFF,
      notes: 'Day Off Periodical Shift Cycle',
    },
  });

  // [op6] Gita Permata: Shift Pagi, WORK, Check-in 05:50 -> HADIR
  const schedGita = await prisma.schedule.create({
    data: {
      userId: createdOperators[6].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[6].id,
      scheduleId: schedGita.id,
      date: today,
      checkIn: new Date('2026-09-03T05:50:00+07:00'),
      status: AttendanceStatus.HADIR,
      lateMinutes: 0,
      checkInLocation: 'ORF Muara Karang Utilities Station',
    },
  });

  // [op7] Hadi Wijaya: Shift Pagi, WORK, Check-in 05:55 -> HADIR
  const schedHadi = await prisma.schedule.create({
    data: {
      userId: createdOperators[7].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[7].id,
      scheduleId: schedHadi.id,
      date: today,
      checkIn: new Date('2026-09-03T05:55:00+07:00'),
      status: AttendanceStatus.HADIR,
      lateMinutes: 0,
      checkInLocation: 'ORF Muara Karang Compressor Hall 1',
    },
  });

  // [op8] Indra Kurniawan: Shift Pagi, WORK, Check-in 05:58 -> HADIR
  const schedIndra = await prisma.schedule.create({
    data: {
      userId: createdOperators[8].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[8].id,
      scheduleId: schedIndra.id,
      date: today,
      checkIn: new Date('2026-09-03T05:58:00+07:00'),
      status: AttendanceStatus.HADIR,
      lateMinutes: 0,
      checkInLocation: 'ORF Muara Karang Patrol Base',
    },
  });

  // [op9] Joko Susilo: Approved IZIN (Dispensasi Seminar K3 Migas)
  await prisma.schedule.create({
    data: {
      userId: createdOperators[9].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
    },
  });
  await prisma.leaveRequest.create({
    data: {
      userId: createdOperators[9].id,
      type: LeaveType.PERMISSION,
      startDate: today,
      endDate: today,
      reason: 'Izin tugas kedinasan menghadiri Workshop Audit K3 Migas Ditjen Migas',
      status: RequestStatus.APPROVED,
      reviewedById: managerUser.id,
      reviewedAt: new Date('2026-09-02T14:00:00+07:00'),
      reviewerNote: 'Disetujui. Lampirkan sertifikat kehadiran setelah selesai.',
    },
  });

  // [op10] Kurnia Setiawan: Shift Pagi, Check-in 05:51 -> HADIR
  const schedKurnia = await prisma.schedule.create({
    data: {
      userId: createdOperators[10].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[10].id,
      scheduleId: schedKurnia.id,
      date: today,
      checkIn: new Date('2026-09-03T05:51:00+07:00'),
      status: AttendanceStatus.HADIR,
      lateMinutes: 0,
      checkInLocation: 'ORF Muara Karang Metering Run 3',
    },
  });

  // [op11] Lukman Hakim: Shift Pagi, Check-in 05:56 -> HADIR
  const schedLukman = await prisma.schedule.create({
    data: {
      userId: createdOperators[11].id,
      shiftId: shiftPagi.id,
      locationId: locationOrf.id,
      date: today,
      status: ScheduleStatus.WORK,
    },
  });
  await prisma.attendance.create({
    data: {
      userId: createdOperators[11].id,
      scheduleId: schedLukman.id,
      date: today,
      checkIn: new Date('2026-09-03T05:56:00+07:00'),
      status: AttendanceStatus.HADIR,
      lateMinutes: 0,
      checkInLocation: 'ORF Muara Karang Pigging Station',
    },
  });

  // 9. Create Historical Schedules & Attendance for Yesterday (2026-09-02)
  for (let i = 0; i < 8; i++) {
    const op = createdOperators[i];
    const sched = await prisma.schedule.create({
      data: {
        userId: op.id,
        shiftId: shiftPagi.id,
        locationId: locationOrf.id,
        date: yesterday,
        status: ScheduleStatus.WORK,
      },
    });
    await prisma.attendance.create({
      data: {
        userId: op.id,
        scheduleId: sched.id,
        date: yesterday,
        checkIn: new Date('2026-09-02T05:52:00+07:00'),
        checkOut: new Date('2026-09-02T14:05:00+07:00'),
        status: AttendanceStatus.HADIR,
        lateMinutes: 0,
        checkInLocation: 'ORF Muara Karang',
        checkOutLocation: 'ORF Muara Karang',
      },
    });
  }

  // 10. Tomorrow's Upcoming Schedules (2026-09-04)
  for (let i = 0; i < createdOperators.length; i++) {
    const op = createdOperators[i];
    await prisma.schedule.create({
      data: {
        userId: op.id,
        shiftId: i % 2 === 0 ? shiftPagi.id : shiftSiang.id,
        locationId: locationOrf.id,
        date: tomorrow,
        status: i === 5 ? ScheduleStatus.OFF : ScheduleStatus.WORK,
      },
    });
  }

  // 11. Create Pending Shift Exchange Request
  await prisma.shiftExchange.create({
    data: {
      requesterId: createdOperators[1].id, // Budi Santoso
      requesterScheduleId: schedBudi.id,
      targetUserId: createdOperators[5].id, // Fajar Nugraha
      targetDate: tomorrow,
      reason: 'Keperluan mendadak mengantar orang tua kontrol kesehatan di RS',
      status: RequestStatus.PENDING,
    },
  });

  // 12. Create Digital Shift Handover (Shift Malam -> Shift Pagi)
  await prisma.handover.create({
    data: {
      date: today,
      shiftId: shiftPagi.id,
      outgoingOperatorId: createdOperators[11].id,
      incomingOperatorId: createdOperators[0].id,
      operationalNotes: 'Suplai gas dari offshore stabil pada flow rate 245 MMSCFD, inlet pressure 680 psig. Suhu scrubber dalam batas aman.',
      equipmentStatus: 'Compressor K-101A Running Normal, K-101B Standby Auto, K-101C Maintenance Valve.',
      issues: 'Terdeteksi fluktuasi minor pada pressure transmitter PT-2041, telah dikalibrasi ulang oleh tim I&C.',
      pendingTasks: 'Lanjutkan monitoring differential pressure pada coalescer filter F-102.',
      safetyNotes: 'Work permit panas aktif di area slug catcher s/d pukul 12:00. Safety observer siaga.',
      status: HandoverStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date('2026-09-03T06:15:00+07:00'),
    },
  });

  // 13. Create HSSE Pre-Shift Safety Checklist
  const hsseChecklist = await prisma.hSSEChecklist.create({
    data: {
      date: today,
      shiftId: shiftPagi.id,
      operatorId: createdOperators[0].id, // Andi Pratama
      locationId: locationOrf.id,
      status: ChecklistStatus.COMPLETED,
      notes: 'Pemeriksaan safety pre-shift Pagi lengkap. Area kerja aman & kondusif.',
    },
  });

  const checklistItems = [
    { itemKey: 'PPE_VERIFIED', label: 'APD Lengkap (Safety Helmet, Safety Shoes, Glasses, Gloves, H2S Detector)' },
    { itemKey: 'WORK_AREA_SAFE', label: 'Area Kerja Bersih, Penerangan Cukup, & Bebas Hambatan Evakuasi' },
    { itemKey: 'PERMIT_VERIFIED', label: 'Surat Izin Kerja Aman (SIKA / Hot & Cold Work Permit) Valid' },
    { itemKey: 'EQUIPMENT_CONDITION', label: 'Kondisi Mesin, Tekanan Pipa, & Panel Indikator Dalam Batas Normal' },
    { itemKey: 'EMERGENCY_EQUIPMENT', label: 'APAR, Eyewash Station, & Tombol ESD (Emergency Shutdown) Siap Pakai' },
    { itemKey: 'COMMUNICATION_RADIO', label: 'Radio HT & Alat Komunikasi Saluran Operasional Berfungsi Baik' },
    { itemKey: 'TOOLBOX_MEETING', label: 'Shift Briefing & Safety Toolbox Meeting Telah Dilaksanakan' },
  ];

  for (const item of checklistItems) {
    await prisma.hSSEChecklistItem.create({
      data: {
        checklistId: hsseChecklist.id,
        itemKey: item.itemKey,
        label: item.label,
        status: ChecklistItemStatus.YES,
        note: 'Verified OK',
      },
    });
  }

  // 14. Seed Notifications
  await prisma.announcement.createMany({
    data: [
      { title: 'Safety briefing Shift Pagi', message: 'Safety briefing dimulai pukul 05:45 WIB sebelum memasuki area operasi.', priority: AnnouncementPriority.IMPORTANT, targetType: AnnouncementTargetType.ALL, startAt: new Date('2026-09-01T00:00:00+07:00'), endAt: new Date('2026-09-30T23:59:59+07:00'), createdById: managerUser.id },
      { title: 'Checklist HSSE wajib diselesaikan', message: 'Pastikan checklist HSSE pre-shift telah selesai sebelum memulai pekerjaan.', priority: AnnouncementPriority.URGENT, targetType: AnnouncementTargetType.SHIFT, targetId: shiftPagi.id, startAt: new Date('2026-09-03T00:00:00+07:00'), endAt: new Date('2026-09-03T23:59:59+07:00'), createdById: managerUser.id },
      { title: 'Pelatihan sertifikasi gas metering', message: 'Andi Pratama dijadwalkan mengikuti pelatihan sertifikasi gas metering di ruang training pada hari Jumat pukul 09:00 WIB.', priority: AnnouncementPriority.NORMAL, targetType: AnnouncementTargetType.OPERATOR, targetId: createdOperators[0].id, startAt: new Date('2026-09-01T00:00:00+07:00'), endAt: new Date('2026-09-30T23:59:59+07:00'), createdById: managerUser.id },
    ],
  });
  // For Manager:
  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      type: NotificationType.ATTENDANCE_ALERT,
      title: 'Perhatian Manpower: 1 Operator Belum Check-in',
      message: 'Operator Eko Ramadhan (Shift Pagi) belum melakukan check-in pada jendela shift 06:00 - 14:00.',
      link: '/manager/dashboard',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      type: NotificationType.SHIFT_EXCHANGE,
      title: 'Permintaan Pergantian Shift Masuk',
      message: 'Budi Santoso mengajukan permohonan pergantian shift dengan Fajar Nugraha untuk 04 Sep 2026.',
      link: '/manager/requests',
      isRead: false,
    },
  });

  // For Operator Andi Pratama:
  await prisma.notification.create({
    data: {
      userId: createdOperators[0].id,
      type: NotificationType.SHIFT_REMINDER,
      title: 'Shift Pagi Sedang Berlangsung',
      message: 'Anda telah berhasil check-in pada 05:52 WIB di ORF Muara Karang. Selamat bertugas & utamakan HSSE!',
      link: '/operator/dashboard',
      isRead: false,
    },
  });

  // For Operator Citra Dewi:
  await prisma.notification.create({
    data: {
      userId: createdOperators[2].id,
      type: NotificationType.LEAVE_STATUS,
      title: 'Permohonan Cuti Disetujui',
      message: 'Pengajuan Cuti Tahunan Anda untuk periode 02 Sep - 04 Sep 2026 telah disetujui oleh Superintendent.',
      link: '/operator/requests',
      isRead: true,
    },
  });

  // 15. Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: managerUser.id,
      action: 'APPROVE_LEAVE',
      entity: 'LeaveRequest',
      entityId: schedCitra.id,
      metadata: JSON.stringify({ operatorName: 'Citra Dewi', type: 'LEAVE', dates: '2026-09-02 s/d 2026-09-04' }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: createdOperators[0].id,
      action: 'CHECK_IN',
      entity: 'Attendance',
      entityId: schedAndi.id,
      metadata: JSON.stringify({ time: '05:52', location: 'ORF Muara Karang', status: 'HADIR' }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: createdOperators[1].id,
      action: 'CHECK_IN',
      entity: 'Attendance',
      entityId: schedBudi.id,
      metadata: JSON.stringify({ time: '06:21', lateMinutes: 21, status: 'TERLAMBAT' }),
    },
  });

  console.log('----------------------------------------------------');
  // 15b. Username backfill (login berbasis username/nama)
  const { ensureUsernames } = await import('./usernameBackfill');
  const userCount = await ensureUsernames(prisma);
  console.log(`✓ Username backfill: ${userCount} user diperbarui`);

  console.log('✓ Database Seeding Successfully Completed!');
  console.log('Demo Credentials:');
  console.log('  Manager  : manager@fieldops.local / Manager123!');
  console.log('  Operator : operator1@fieldops.local / Operator123!');
  console.log('  Operator : operator2@fieldops.local / Operator123!');
  console.log('  Operator : operator3@fieldops.local / Operator123!');
  console.log('  Operator : operator4@fieldops.local / Operator123!');
  console.log('  Operator : operator5@fieldops.local / Operator123!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
