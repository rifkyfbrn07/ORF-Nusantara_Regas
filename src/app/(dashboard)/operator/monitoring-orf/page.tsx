import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getInfoOrfDashboard } from '@/server/services/infoOrfService';
import { PageHeader } from '@/components/ui/PageHeader';
import { MonitoringOrfClient } from '@/components/monitoringOrf/MonitoringOrfClient';

export default async function OperatorMonitoringOrfPage() {
  await requireAuth();
  const data = await getInfoOrfDashboard();

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="OPERASIONAL DISTRIBUSI GAS"
        title="Monitoring ORF"
        description="Laporan operasional tersimpan per jam. Nilai pada grafik dan histori mengikuti waktu pencatatan, bukan agregasi."
      />
      <MonitoringOrfClient initialData={data} canEdit={false} />
    </div>
  );
}
