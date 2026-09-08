'use client';

import React, { useState } from 'react';
import { ScheduleBulkAddModal, BulkAddButton } from './ScheduleBulkAddModal';
import { ScheduleImportModal, ImportExcelButton } from './ScheduleImportModal';

interface Option {
  id: string;
  label: string;
}

interface SchedulePageToolsProps {
  operators: Option[];
  shifts: Option[];
  locations: Option[];
}

export function SchedulePageTools({ operators, shifts, locations }: SchedulePageToolsProps) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <BulkAddButton onClick={() => setBulkOpen(true)} />
        <ImportExcelButton onClick={() => setImportOpen(true)} />
      </div>

      <ScheduleBulkAddModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        operators={operators}
        shifts={shifts}
        locations={locations}
      />
      <ScheduleImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
