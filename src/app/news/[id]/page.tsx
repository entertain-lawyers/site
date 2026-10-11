import { getWordPressPostById, getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';

export const revalidate = 60;

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wpId = Number(id);
  if (isNaN(wpId)) notFound();

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish' || mapCategoryToType(wpPost.categories, 'en') !== 'NEWS') {
    notFound();
  }

  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: 'NEWS' as const,
    createdAt: new Date(wpPost.date),
    author: { email: `WP Author (${wpPost.author})` },
    featuredImage: wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
  };

  const wpRelatedResponse = await getWordPressPosts({
    categories: wpPost.categories,
    status: 'publish',
    lang: 'en',
    perPage: 5,
    embed: true
  });

  const relatedPosts = wpRelatedResponse.data
    .filter(p => p.id !== wpPost.id)
    .slice(0, 4)
    .map(p => ({
      id: String(p.id),
      title: p.title.rendered,
      type: 'NEWS',
      createdAt: new Date(p.date),
      featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      url: `/news/${p.id}`
    }));

  return <PostDetail post={post} backUrl="/news" backLabel="News" relatedPosts={relatedPosts} />;
}
