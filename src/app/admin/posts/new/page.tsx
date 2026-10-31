import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NewPostClient from './NewPostClient';
import { hasWordPressCredentials } from '@/lib/wordpress';

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { lang } = await searchParams;

  return <NewPostClient defaultLang={lang === 'ne' ? 'ne' : 'en'} canSave={hasWordPressCredentials()} />;
}
