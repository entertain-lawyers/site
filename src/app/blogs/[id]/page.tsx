import { getWordPressPostById, getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { getLatestPosts } from '@/lib/latest-posts';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';
import type { Metadata } from 'next';
import { postMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const wpId = Number(id);
  if (isNaN(wpId)) notFound();

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish' || mapCategoryToType(wpPost.categories, 'en') !== 'BLOG') {
    notFound();
  }

  return postMetadata({
    title: wpPost.title.rendered,
    excerpt: wpPost.excerpt?.rendered,
    content: wpPost.content?.rendered,
    canonical: `/blogs/${id}`,
    image: wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url,
    publishedTime: wpPost.date,
    modifiedTime: wpPost.modified,
  });
}

export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wpId = Number(id);
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
    author: { email: `WP Author (${wpPost.author})`, name: (wpPost._embedded?.['author'] as Array<{ name?: string }> | undefined)?.[0]?.name },
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
    .filter(p => p.id !== wpPost.id && mapCategoryToType(p.categories, 'en') === 'BLOG')
    .slice(0, 4)
    .map(p => ({
      id: String(p.id),
      title: p.title.rendered,
      type: 'BLOG',
      createdAt: new Date(p.date),
      featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      url: `/blogs/${p.id}`
    }));

  const latestPosts = await getLatestPosts(wpId);

  return <PostDetail post={post} backUrl="/blogs" backLabel="Blogs" relatedPosts={relatedPosts} latestPosts={latestPosts} />;
}
