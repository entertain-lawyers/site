import { getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { getLatestPosts } from '@/lib/latest-posts';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';
import type { Metadata } from 'next';
import { isBlogRouteType, postMetadata } from '@/lib/seo';
import { resolvePostAuthorForDisplay } from '@/lib/post-author';
import { getPublishedBlogPost } from './validate';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const wpPost = await getPublishedBlogPost(id);
  if (!wpPost) notFound();

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
  const wpPost = await getPublishedBlogPost(id);
  if (!wpPost) notFound();

  const resolvedAuthor = await resolvePostAuthorForDisplay({ wpPost, lang: 'en' });

  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: 'BLOG' as const,
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
    .filter(p => p.id !== wpPost.id && isBlogRouteType(mapCategoryToType(p.categories, 'en')))
    .slice(0, 4)
    .map(p => ({
      id: String(p.id),
      title: p.title.rendered,
      type: 'BLOG',
      createdAt: new Date(p.date),
      featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      url: `/blogs/${p.id}`
    }));

  return <PostDetail post={post} backUrl="/blogs" backLabel="Blogs" relatedPosts={relatedPosts} latestPosts={latestPosts} />;
}
