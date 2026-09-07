import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  statusBadge?: React.ReactNode;
}

export function PageHeader({
  eyebrow = 'PERTAMINA NUSANTARA REGAS · FIELDOPS',
  title,
  description,
  action,
  statusBadge,
}: PageHeaderProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE5EF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black tracking-wider uppercase text-[#1769AA]">
            {eyebrow}
          </span>
          {statusBadge}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#092B57] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-[#5F718A] font-medium leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-2.5 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
