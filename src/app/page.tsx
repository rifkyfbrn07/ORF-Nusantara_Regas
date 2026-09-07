import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/admin/dashboard');
  } else if (session.role === 'MANAGER') {
    redirect('/manager/dashboard');
  } else {
    redirect('/operator/dashboard');
  }
}
