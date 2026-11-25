import { redirect } from 'next/navigation';
import { requirePasswordChangeAuth } from '@/lib/auth/session';
import ChangePasswordForm from './ChangePasswordForm';

export default async function ChangePasswordPage() {
  let user: Awaited<ReturnType<typeof requirePasswordChangeAuth>>;
  try { user = await requirePasswordChangeAuth(); }
  catch { redirect('/login'); }
  if (!user.mustChangePassword) redirect('/');
  return <ChangePasswordForm name={user.name} />;
}
