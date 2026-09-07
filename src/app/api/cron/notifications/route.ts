import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { formatJakartaDate, formatJakartaTime } from '@/lib/time';
import { createNotification, notifyAllManagers } from '@/server/services/notificationService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET || 'fieldops_cron_secret_key_2026';

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized CRON trigger' }, { status: 401 });
  }

  const today = formatJakartaDate();
  const currentJakartaTime = formatJakartaTime(new Date());

  // 1. Find all active work schedules for today
  const activeSchedules = await prisma.schedule.findMany({
    where: {
      date: today,
      status: 'WORK',
    },
    include: {
      user: true,
      shift: true,
      attendances: true,
    },
  });

  let notificationsGenerated = 0;

  for (const s of activeSchedules) {
    const hasCheckedIn = s.attendances.some((a) => a.checkIn !== null);

    // If shift has started and operator hasn't checked in
    if (!hasCheckedIn && currentJakartaTime > s.shift.startTime) {
      // Check if alert already sent today to prevent spam
      const existingAlert = await prisma.notification.findFirst({
        where: {
          userId: s.userId,
          type: 'ATTENDANCE_ALERT',
          createdAt: {
            gte: new Date(`${today}T00:00:00+07:00`),
          },
        },
      });

      if (!existingAlert) {
        await createNotification({
          userId: s.userId,
          type: 'ATTENDANCE_ALERT',
          title: 'Pengingat: Belum Melakukan Check-in',
          message: `Shift ${s.shift.name} telah dimulai pada pukul ${s.shift.startTime} WIB. Segera lakukan check-in absensi Anda.`,
          link: '/operator/dashboard',
        });
        notificationsGenerated++;
      }
    }
  }

  // Check overall shift coverage for managers
  const missingCount = activeSchedules.filter((s) => !s.attendances.some((a) => a.checkIn !== null)).length;
  if (missingCount > 0) {
    await notifyAllManagers(
      'ATTENDANCE_ALERT',
      `Monitor Manpower: ${missingCount} Operator Belum Absen`,
      `Terdapat ${missingCount} operator terjadwal kerja hari ini yang belum menyelesaikan absensi check-in.`,
      '/manager/dashboard'
    );
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    today,
    activeSchedulesCount: activeSchedules.length,
    notificationsGenerated,
  });
}
