import { prisma } from '@/lib/db/prisma';
import { ChecklistItemStatus, ChecklistStatus, Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';

export interface SubmitHSSEParams {
  date: string;
  shiftId: string;
  operatorId: string;
  locationId: string;
  notes?: string;
  items: {
    itemKey: string;
    label: string;
    status: ChecklistItemStatus;
    note?: string;
  }[];
}

export const DEFAULT_HSSE_CHECKLIST_TEMPLATE = [
  { itemKey: 'PPE_VERIFIED', label: 'APD Lengkap (Safety Helmet, Safety Shoes, Glasses, Gloves, H2S Detector)' },
  { itemKey: 'WORK_AREA_SAFE', label: 'Area Kerja Bersih, Penerangan Cukup, & Bebas Hambatan Jalur Evakuasi' },
  { itemKey: 'PERMIT_VERIFIED', label: 'Surat Izin Kerja Aman (SIKA / Hot & Cold Work Permit) Valid & Aktif' },
  { itemKey: 'EQUIPMENT_CONDITION', label: 'Kondisi Mesin, Tekanan Pipa Gas, & Indikator Panel Dalam Batas Aman' },
  { itemKey: 'EMERGENCY_EQUIPMENT', label: 'APAR, Eyewash Station, Fire Hydrant, & Tombol ESD Siap Digunakan' },
  { itemKey: 'COMMUNICATION_RADIO', label: 'Radio HT & Alat Komunikasi Saluran Kontrol Berfungsi Jelas' },
  { itemKey: 'TOOLBOX_MEETING', label: 'Shift Briefing & Safety Toolbox Meeting Telah Dilaksanakan Bersama Tim' },
];

export async function submitHSSEChecklist(params: SubmitHSSEParams) {
  const checklist = await prisma.hSSEChecklist.create({
    data: {
      date: params.date,
      shiftId: params.shiftId,
      operatorId: params.operatorId,
      locationId: params.locationId,
      status: ChecklistStatus.COMPLETED,
      notes: params.notes,
      items: {
        create: params.items.map((i) => ({
          itemKey: i.itemKey,
          label: i.label,
          status: i.status,
          note: i.note || null,
        })),
      },
    },
    include: {
      operator: { select: { name: true } },
      shift: true,
      items: true,
    },
  });

  // Record Audit Log
  await recordAuditLog({
    userId: params.operatorId,
    action: 'SUBMIT_HSSE',
    entity: 'HSSEChecklist',
    entityId: checklist.id,
    metadata: {
      date: params.date,
      shift: checklist.shift.name,
      totalItems: checklist.items.length,
    },
  });

  return checklist;
}

export async function getOperatorHSSEChecklists(operatorId: string) {
  return prisma.hSSEChecklist.findMany({
    where: { operatorId },
    orderBy: { date: 'desc' },
    include: {
      shift: true,
      location: true,
      items: true,
    },
  });
}

export async function getAllHSSEChecklists(filters?: { date?: string; shiftId?: string }) {
  const where: Prisma.HSSEChecklistWhereInput = {};
  if (filters?.date) where.date = filters.date;
  if (filters?.shiftId) where.shiftId = filters.shiftId;

  return prisma.hSSEChecklist.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      operator: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          position: true,
        },
      },
      shift: true,
      location: true,
      items: true,
    },
  });
}

export async function getHSSEComplianceStats(startDate?: string, endDate?: string) {
  const where: Prisma.HSSEChecklistWhereInput = {};
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  }

  const checklists = await prisma.hSSEChecklist.findMany({
    where,
    include: { items: true },
  });

  const total = checklists.length;
  let totalItemsCount = 0;
  let compliantItemsCount = 0;

  for (const c of checklists) {
    for (const item of c.items) {
      totalItemsCount++;
      if (item.status === 'YES' || item.status === 'NA') {
        compliantItemsCount++;
      }
    }
  }

  const complianceRate = totalItemsCount > 0 ? Math.round((compliantItemsCount / totalItemsCount) * 100) : 100;

  return {
    totalChecklists: total,
    complianceRate,
    checklists,
  };
}
