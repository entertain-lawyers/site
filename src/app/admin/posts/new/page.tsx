import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NewPostClient from './NewPostClient';

export default async function NewPostPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  return <NewPostClient />;
}
