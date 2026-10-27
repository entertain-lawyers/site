import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import PostPreviewClient from './PreviewClient';
import { getLatestPosts } from '@/lib/latest-posts';

export const metadata = {
  title: 'Post Preview',
  robots: { index: false, follow: false },
};

/**
 * Live preview of a post being created/edited, rendered with the real public
 * article template (same root layout, PostDetail and latest-posts rail as
 * /news/[id], /blogs/[id], /historical-facts/[id]).
 *
 * Draft content is handed over in sessionStorage (unsaved editor state);
 * the latest-posts rail is fetched server-side so the sidebar matches a real
 * post page. Admin/EDITOR only — everyone else is bounced home.
 */
export default async function PostPreviewPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  let latestPosts = [] as Awaited<ReturnType<typeof getLatestPosts>>;
  try {
    latestPosts = await getLatestPosts();
  } catch {
    // WP-side fetch hiccup — the article body itself is client data, keep rendering.
  }

  return (
    <PostPreviewClient
      latestPosts={latestPosts}
      authorName={session.user.name || session.user.email || null}
      authorEmail={session.user.email || null}
    />
  );
}
