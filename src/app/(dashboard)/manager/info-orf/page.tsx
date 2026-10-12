import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getInfoOrfDashboard } from '@/server/services/infoOrfService';
import { PageHeader } from '@/components/ui/PageHeader';
import { InfoOrfClient } from './InfoOrfClient';

export default async function ManagerInfoOrfPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole(['MANAGER', 'ADMIN']);
  const params = await searchParams;
  const data = await getInfoOrfDashboard(params.date);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="OPERASIONAL DISTRIBUSI GAS"
        title="Info ORF"
        description="Pencatatan data operasional ORF dan FSRU per jam (WIB). Satu tanggal dapat memiliki banyak laporan — 08:00, 09:00, 10:00, dan seterusnya. Laporan ditampilkan sesuai jam yang dipilih, tanpa penjumlahan lintas jam."
      />

      <InfoOrfClient initialData={data} />
    </div>
  );
}
