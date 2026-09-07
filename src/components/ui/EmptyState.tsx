import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'anim-fade flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white/60 border border-dashed border-[#CBD5E1]',
        className
      )}
    >
      {/* Industrial abstract badge icon */}
      <div className="relative mb-4 flex items-center justify-center">
        <div className="h-14 w-14 rounded-2xl bg-[#EAF0F8] border border-[#DCE6F2] flex items-center justify-center text-[#123E7A] shadow-xs">
          <Icon className="h-7 w-7 stroke-[1.6]" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#FFF1E6] border border-[#F58220]/40 flex items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F58220]" />
        </div>
      </div>

      <h3 className="text-sm font-bold text-[#172033] tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#64748B] max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
