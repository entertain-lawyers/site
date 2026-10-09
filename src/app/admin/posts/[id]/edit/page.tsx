import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EditPostClient from './EditPostClient';
import { Role } from '@prisma/client';
import { getWordPressPostById, mapCategoryToType } from '@/lib/wordpress';

export default async function EditPostPage({ params, searchParams }: { params: { id: string }, searchParams: { lang?: 'en' | 'ne' } }) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.EDITOR)) {
    redirect('/');
  }

  const lang = searchParams.lang || 'en';
  const wpPost = await getWordPressPostById(Number(params.id), lang);

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
  };

  return (
    <div className="min-h-screen bg-transparent">
      <EditPostClient post={mappedPost} />
    </div>
  );
}
