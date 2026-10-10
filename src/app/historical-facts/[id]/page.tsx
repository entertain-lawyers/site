import { getWordPressPostById, getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';

export const revalidate = 60;

export default async function FactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wpId = Number(id);
  if (isNaN(wpId)) notFound();

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish' || mapCategoryToType(wpPost.categories, 'en') !== 'FACT' && mapCategoryToType(wpPost.categories, 'en') !== 'PERSONALITY') {
    notFound();
  }

  const postType = mapCategoryToType(wpPost.categories, 'en');
  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: postType,
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
      type: mapCategoryToType(p.categories, 'en'),
      createdAt: new Date(p.date),
      featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      url: `/historical-facts/${p.id}`
    }));

  const backUrl = postType === 'PERSONALITY' ? '/historical-facts/personalities' : '/historical-facts/historical';
  const backLabel = postType === 'PERSONALITY' ? 'Legal Personalities' : 'Historical Facts';

  return <PostDetail post={post} backUrl={backUrl} backLabel={backLabel} relatedPosts={relatedPosts} />;
}
