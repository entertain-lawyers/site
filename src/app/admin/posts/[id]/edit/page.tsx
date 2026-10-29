import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EditPostClient from './EditPostClient';
import { Role } from '@prisma/client';
import { getWordPressPostById, mapCategoryToType } from '@/lib/wordpress';

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: 'en' | 'ne' }>;
}) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.EDITOR)) {
    redirect('/');
  }

  const { id } = await params;
  const { lang: queryLang } = await searchParams;
  const lang = queryLang || 'en';
  const wpPost = await getWordPressPostById(Number(id), lang);

  if (!wpPost) {
    redirect('/admin/posts');
  }

  // NOTE: WordPress doesn't store our internal User IDs, so we bypass the exact 
  // author ownership check here. Since it's WordPress, Editors and Admins have global access.
  
  const mappedPost = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: mapCategoryToType(wpPost.categories, lang),
    status: wpPost.status === 'publish' ? 'PUBLISHED' : 'DRAFT',
    // Pinned so an edit can never be written to the other WordPress install.
    lang,
    // Kept so an unchanged type re-sends the exact categories WordPress has.
    categories: wpPost.categories ?? [],
  };

  return (
    <div className="min-h-screen bg-transparent">
      <EditPostClient key={mappedPost.id} post={mappedPost} />
    </div>
  );
}
