import { getWordPressPostById, mapCategoryToType } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';

export const revalidate = 60;

export default async function FactDetailPage({ params }: { params: { id: string } }) {
  const wpId = Number(params.id);
  if (isNaN(wpId)) notFound();

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish' || mapCategoryToType(wpPost.categories, 'en') !== 'FACT' && mapCategoryToType(wpPost.categories, 'en') !== 'PERSONALITY') {
    notFound();
  }

  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: 'FACT' as const,
    createdAt: new Date(wpPost.date),
    author: { email: `WP Author (${wpPost.author})` }
  };

  return <PostDetail post={post as any} backUrl="/historical-facts" backLabel="Historical Facts" />;
}
