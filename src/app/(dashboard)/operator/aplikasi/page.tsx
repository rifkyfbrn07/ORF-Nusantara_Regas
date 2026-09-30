import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/PageHeader';
import { AplikasiGrid } from './AplikasiGrid';

export default async function OperatorAplikasiPage() {
  await requireAuth();

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="APLIKASI OPERASIONAL"
        title="Aplikasi"
        description="Akses cepat ke berbagai aplikasi yang digunakan dalam operasional."
      />
      <AplikasiGrid />
    </div>
  );
}