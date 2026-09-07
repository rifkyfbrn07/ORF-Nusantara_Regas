import { AnnouncementTargetType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export async function getActiveAnnouncements(userId?: string, date = new Date()) {
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true, startAt: { lte: date }, OR: [{ endAt: null }, { endAt: { gte: date } }] },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  if (!userId) return announcements;
  const schedule = await prisma.schedule.findUnique({ where: { userId_date: { userId, date: date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) } }, select: { shiftId: true } });
  return announcements.filter((announcement) => announcement.targetType === AnnouncementTargetType.ALL || (announcement.targetType === AnnouncementTargetType.OPERATOR && announcement.targetId === userId) || (announcement.targetType === AnnouncementTargetType.SHIFT && announcement.targetId === schedule?.shiftId));
}
