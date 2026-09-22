import { prisma } from '@/lib/db/prisma';
import { Prisma, PrismaClient } from '@prisma/client';

export type AuditDbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function recordAuditLog(params: CreateAuditLogParams, client: AuditDbClient = prisma) {
  try {
    return await client.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

export async function getAuditLogs(limit = 100, page = 1) {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return { logs, total, totalPages: Math.ceil(total / limit) };
}
