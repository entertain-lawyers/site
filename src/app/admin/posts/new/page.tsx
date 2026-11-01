import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NewPostClient from './NewPostClient';
import { getWordPressWriteBlock, hasWordPressCredentials } from '@/lib/wordpress';
import { listLocalAuthors } from '@/lib/content-authors';

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
  const authors = await listLocalAuthors();

  return (
    <NewPostClient
      defaultLang={lang === 'ne' ? 'ne' : 'en'}
      canSave={hasWordPressCredentials('en') || hasWordPressCredentials('ne')}
      uploadBlockedReasons={{
        en: getWordPressWriteBlock('en'),
        ne: getWordPressWriteBlock('ne'),
      }}
      authors={authors}
      defaultAuthorId={session.user.id}
    />
  );
}
