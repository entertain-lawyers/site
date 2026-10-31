import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EditPostClient from './EditPostClient';
import { Role } from '@prisma/client';
import Link from 'next/link';
import {
  getWordPressMediaById,
  getWordPressPostById,
  getWordPressWriteBlock,
  hasWordPressCredentials,
  mapCategoryToType,
  parseWordPressPostId,
} from '@/lib/wordpress';
import { toFeaturedImageSelection, toWordPressMediaItem, type FeaturedImageSelection } from '@/lib/wordpress-media';

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
  // Anything but "ne" is English; an unknown value must not pin the editor
  // to a language the save action would reject.
  const lang: 'en' | 'ne' = queryLang === 'ne' ? 'ne' : 'en';
  const wpId = parseWordPressPostId(id);
  if (!wpId) {
    redirect('/admin/posts');
  }

  // Drafts and trashed posts are only visible with credentials. Without them
  // WordPress answers 401 and the post is treated as missing.
  let wpPost;
  try {
    wpPost = await getWordPressPostById(wpId, lang, { authenticated: hasWordPressCredentials() });
  } catch (error) {
    console.error(`[admin/posts/${wpId}/edit] WordPress request failed`, error);
    return (
      <div className="p-6 lg:p-10 max-w-3xl">
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <h1 className="text-lg font-bold">WordPress could not be reached</h1>
          <p className="mt-2 text-sm">
            Post #{wpId} could not be loaded, so it cannot be edited right now. Nothing has been changed. Try again in a moment.
          </p>
          <Link href="/admin/posts" className="mt-4 inline-block text-sm font-semibold underline">
            Back to posts
          </Link>
        </div>
      </div>
    );
  }

  if (!wpPost) {
    redirect('/admin/posts');
  }

  // NOTE: WordPress doesn't store our internal User IDs, so we bypass the exact 
  // author ownership check here. Since it's WordPress, Editors and Admins have global access.
  
  // Load the current featured image here so the editor shows it after a reload.
  // A media lookup failure must not block editing: keep the id without a preview.
  const featuredMediaId = wpPost.featured_media ?? 0;
  let featuredImage: FeaturedImageSelection | null = null;
  if (featuredMediaId > 0) {
    try {
      const media = await getWordPressMediaById(featuredMediaId, lang, { authenticated: hasWordPressCredentials() });
      featuredImage = media
        ? toFeaturedImageSelection(toWordPressMediaItem(media), lang)
        : { id: featuredMediaId, lang, url: null, thumbnailUrl: null, title: `Image #${featuredMediaId}` };
    } catch (error) {
      console.error(`[admin/posts/${wpId}/edit] featured media ${featuredMediaId} lookup failed`, error);
      featuredImage = { id: featuredMediaId, lang, url: null, thumbnailUrl: null, title: `Image #${featuredMediaId}` };
    }
  }

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
    featuredMediaId,
    featuredImage,
  };

  return (
    <div className="min-h-screen bg-transparent">
      <EditPostClient
        key={mappedPost.id}
        post={mappedPost}
        canSave={hasWordPressCredentials()}
        uploadBlockedReason={getWordPressWriteBlock()}
      />
    </div>
  );
}
