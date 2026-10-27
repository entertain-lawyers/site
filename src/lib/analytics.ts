import { getWordPressPostById } from '@/lib/wordpress';

/** AccessLog action used for first-party page-view tracking. */
export const PAGE_VIEW_ACTION = 'PAGE_VIEW';

/**
 * Map a public URL to a WordPress post reference, when it is one.
 * Recognised post routes: /news/<id>, /blogs/<id> (EN) and /nepali/post/<id> (NE).
 */
export function postRefFromUrl(url: string | null | undefined): { id: number; lang: 'en' | 'ne' } | null {
  if (!url) return null;
  let match = /^\/(?:news|blogs)\/(\d+)/.exec(url);
  if (match) return { id: Number(match[1]), lang: 'en' };
  match = /^\/nepali\/post\/(\d+)/.exec(url);
  if (match) return { id: Number(match[1]), lang: 'ne' };
  return null;
}

export interface RankedPage {
  url: string;
  count: number;
}

export interface RankedPost extends RankedPage {
  title: string;
}

/**
 * Given ranked page URLs, resolve the ones that are WP posts to real titles
 * via the WP REST API. Non-post pages keep their URL as the label; failed
 * lookups degrade to "Post #<id>" so the widget is never blocked on WP being
 * slow or credential-less.
 */
export async function resolvePostTitles(pages: RankedPage[]): Promise<{
  posts: RankedPost[];
  plainPages: RankedPage[];
}> {
  // Resolve positionally (Promise.all settle order would scramble the rank).
  const resolved = await Promise.all(
    pages.map(async (page): Promise<((RankedPage | RankedPost) & { isPost: boolean })> => {
      const ref = postRefFromUrl(page.url);
      if (!ref) return { ...page, isPost: false };
      let title = `Post #${ref.id}`;
      try {
        const post = await getWordPressPostById(ref.id, ref.lang);
        if (post?.title?.rendered) title = post.title.rendered.replace(/<[^>]+>/g, '').trim() || title;
      } catch {
        // keep fallback title
      }
      return { ...page, title, isPost: true } as RankedPost & { isPost: boolean };
    })
  );
  return {
    posts: resolved.filter((r): r is RankedPost & { isPost: boolean } => r.isPost).map((post) => {
      const { isPost: _discard, ...clean } = post;
      void _discard;
      return clean;
    }),
    plainPages: resolved.filter(r => !r.isPost),
  };
}

/** Pretty label for non-post public pages in the widget. */
export function friendlyPageLabel(url: string): string {
  if (url === '/' || url === '') return 'Homepage';
  const cleaned = url.split('?')[0].replace(/\/+$/, '') || '/';
  return cleaned;
}
