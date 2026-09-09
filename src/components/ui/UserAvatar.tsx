'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';

/**
 * Status indicator colors mapped from AttendanceStatus values.
 * Optional — pass `status` to render a small colored dot on the avatar.
 */
const STATUS_DOT_COLORS: Record<string, string> = {
  HADIR: 'bg-emerald-500',
  TERLAMBAT: 'bg-[#F58220]',
  BELUM_ABSEN: 'bg-amber-500',
  CUTI: 'bg-[#1D5FA7]',
  IZIN: 'bg-[#F58220]',
  SAKIT: 'bg-amber-500',
  OFF: 'bg-[#DC2626]',
  ABSENT: 'bg-[#DC2626]',
  ONLINE: 'bg-emerald-500',
  PENDING: 'bg-[#F58220]',
};

export type UserAvatarStatus = keyof typeof STATUS_DOT_COLORS;

interface UserAvatarProps {
  /** Full display name — used to derive initials fallback (e.g. "Andi Pratama" -> "AP") */
  name: string;
  /** Optional photo URL (remote https URL or data URL). Falls back to initials. */
  avatarUrl?: string | null;
  /** Rendered size in px (rounded). Common: 32-44 for tables/topbar. */
  size?: number;
  /** Optional attendance/status indicator dot */
  status?: UserAvatarStatus | null;
  /** Extra ring/border classes */
  className?: string;
  /** Title/tooltip text */
  title?: string;
}

/**
 * Derives at most two initials from a name:
 * "System Administrator" -> "SA"
 * "Budi Santoso" -> "BS"
 * "Rifky Febrian" -> "RF"
 * "Andi" -> "A"
 */
export function getUserInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Pure circular user avatar with guaranteed-safe fallback:
 * photo -> initials -> "?" icon.
 * Guaranteed 100% circular, zero rectangular background bleeding.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = 34,
  status,
  className,
  title,
}: UserAvatarProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(avatarUrl) && !photoFailed;
  const dotSize = Math.max(7, Math.round(size * 0.26));

  return (
    <span
      className={clsx(
        'relative inline-flex shrink-0 select-none rounded-full overflow-hidden items-center justify-center aspect-square',
        className
      )}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      title={title ?? name}
      aria-label={name}
    >
      {/* Initials fallback layer (always circular) */}
      <span
        className="h-full w-full rounded-full bg-[#0F315A] text-white font-bold flex items-center justify-center uppercase select-none tracking-tight"
        style={{ fontSize: Math.max(9, Math.round(size * 0.38)) }}
        aria-hidden={showPhoto}
      >
        {getUserInitials(name)}
      </span>

      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl as string}
          alt={name}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
          onError={() => setPhotoFailed(true)}
          referrerPolicy="no-referrer"
        />
      )}

      {status && STATUS_DOT_COLORS[status] && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            STATUS_DOT_COLORS[status]
          )}
          style={{ width: dotSize, height: dotSize }}
        />
      )}
    </span>
  );
}
