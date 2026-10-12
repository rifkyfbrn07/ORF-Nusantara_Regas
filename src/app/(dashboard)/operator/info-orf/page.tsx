import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getInfoOrfDashboard } from '@/server/services/infoOrfService';
import { PageHeader } from '@/components/ui/PageHeader';
import { InfoOrfOperatorClient } from './InfoOrfOperatorClient';

export default async function OperatorInfoOrfPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const data = await getInfoOrfDashboard(params.date);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="OPERASIONAL DISTRIBUSI GAS"
        title="Info ORF"
        description="Data operasional ORF dan FSRU yang dicatat per jam (WIB). Tampilan mengikuti laporan pada jam yang dipilih — nilai tidak dijumlahkan lintas jam."
      />

      <InfoOrfOperatorClient initialData={data} />
    </div>
  );
}
