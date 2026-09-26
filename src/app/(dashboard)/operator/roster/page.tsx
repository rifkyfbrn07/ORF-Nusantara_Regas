import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';

/**
 * Jalur lama diarahkan ke `/operator/jadwal-saya` (menu tunggal Jadwal Saya).
 * File dipertahankan agar tautan lama tidak menjadi broken route, namun seluruh
 * navigasi mengarah ke satu sumber jadwal operator.
 */
export default async function OperatorRedirectPage() {
  await requireAuth();
  redirect('/operator/jadwal-saya');
}
