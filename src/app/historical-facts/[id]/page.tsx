import { getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { getLatestPosts } from '@/lib/latest-posts';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';
import type { Metadata } from 'next';
import { postMetadata } from '@/lib/seo';
import { resolvePostAuthorForDisplay } from '@/lib/post-author';
import { getPublishedHistoricalFact } from './validate';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fact = await getPublishedHistoricalFact(id);
  if (!fact) notFound();
  const { wpPost } = fact;

  return postMetadata({
    title: wpPost.title.rendered,
    excerpt: wpPost.excerpt?.rendered,
    content: wpPost.content?.rendered,
    canonical: `/historical-facts/${id}`,
    image: wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url,
    publishedTime: wpPost.date,
    modifiedTime: wpPost.modified,
  });
}

export default async function FactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fact = await getPublishedHistoricalFact(id);
  if (!fact) notFound();
  const wpPost = fact.wpPost;

  const resolvedAuthor = await resolvePostAuthorForDisplay({ wpPost, lang: 'en' });
  const postType = mapCategoryToType(wpPost.categories, 'en');
  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: postType,
    createdAt: new Date(wpPost.date),
    author: {
      email: resolvedAuthor.email || `WP Author (${wpPost.author})`,
      name: resolvedAuthor.name,
      image: resolvedAuthor.image,
      bio: resolvedAuthor.bio,
      website: resolvedAuthor.website,
      role: resolvedAuthor.role,
    },
    featuredImage: wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
  };

  const [wpRelatedResponse, latestPosts] = await Promise.all([
    getWordPressPosts({
      categories: wpPost.categories,
      status: 'publish',
      lang: 'en',
      perPage: 5,
      embed: true,
      fields: 'id,date,title,categories,_links,_embedded',
    }),
    getLatestPosts(wpPost.id),
  ]);

  const relatedPosts = wpRelatedResponse.data
    .filter(p => {
      if (p.id === wpPost.id) return false;
      const type = mapCategoryToType(p.categories, 'en');
      return type === 'FACT' || type === 'PERSONALITY';
    })
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

  return <PostDetail post={post} backUrl={backUrl} backLabel={backLabel} relatedPosts={relatedPosts} latestPosts={latestPosts} />;
}
