import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getInfoOrfDashboard } from '@/server/services/infoOrfService';
import { PageHeader } from '@/components/ui/PageHeader';
import { MonitoringOrfClient } from '@/components/monitoringOrf/MonitoringOrfClient';

export default async function ManagerMonitoringOrfPage() {
  await requireRole(['MANAGER', 'ADMIN']);
  const data = await getInfoOrfDashboard();

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="OPERASIONAL DISTRIBUSI GAS"
        title="Monitoring ORF"
        description="Laporan Up Stream, penyaluran gas, total distribusi, FSRU, dan Next Cargo berdasarkan pencatatan tersimpan per jam."
      />
      <MonitoringOrfClient initialData={data} canEdit />
    </div>
  );
}
