import { getWordPressPostById, mapCategoryToType } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';

export const revalidate = 60;

export default async function BlogDetailPage({ params }: { params: { id: string } }) {
  const wpId = Number(params.id);
  if (isNaN(wpId)) notFound();

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish' || mapCategoryToType(wpPost.categories, 'en') !== 'BLOG') {
    notFound();
  }

  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: 'BLOG' as const,
    createdAt: new Date(wpPost.date),
    author: { email: `WP Author (${wpPost.author})` }
  };

  return <PostDetail post={post as any} backUrl="/blogs" backLabel="Blogs" />;
}
