import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ActForm from '../ActForm';

export default async function NewActPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  return <ActForm isEdit={false} />;
}
