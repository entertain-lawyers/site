import type { MetadataRoute } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { prisma } from '@/lib/prisma';
import { getWordPressPosts, mapCategoryToType, type WordPressLanguage } from '@/lib/wordpress';
import { getSiteUrl, wordPressArticlePath } from '@/lib/seo';

// Rebuild the sitemap hourly without rebuilding the whole site.
export const revalidate = 3600;

interface StaticRoute {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

// Publicly readable pages only. Gated material (`/resources/[id]`, `/read/*`)
// is deliberately absent: those pages set `robots: { index: false }` and
// crawlers would only ever see a login redirect.
const staticRoutes: StaticRoute[] = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/explore', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/study', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/semesters', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/resources', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/news', changeFrequency: 'daily', priority: 0.8 },
  { path: '/blogs', changeFrequency: 'daily', priority: 0.8 },
  { path: '/events', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/publications', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/gallery', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/historical-facts', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/historical-facts/historical', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/historical-facts/personalities', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/nepali', changeFrequency: 'daily', priority: 0.8 },
  { path: '/team', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/faqs', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/calculator', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/consultation', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

/** WordPress's maximum `per_page` value. */
const WP_PAGE_SIZE = 100;
/** Safety valve: 500 pages = 50,000 URLs, the sitemap protocol limit. */
const WP_MAX_PAGES = 500;

/**
 * Pages through every published post of one language. `throwOnError` is
 * deliberate: an outage must fail the sitemap request (5xx, retried by
 * crawlers) instead of silently publishing a sitemap that is missing
 * hundreds of article URLs.
 */
async function wordpressArticleRoutes(
  origin: string,
  lang: WordPressLanguage
): Promise<MetadataRoute.Sitemap> {
  const query = {
    lang,
    status: 'publish',
    perPage: WP_PAGE_SIZE,
    fields: 'id,modified,categories,status',
    throwOnError: true,
  } as const;

  const first = await getWordPressPosts({ ...query, page: 1 });
  const totalPages = Math.min(first.totalPages, WP_MAX_PAGES);
  if (first.totalPages > WP_MAX_PAGES) {
    console.warn(
      `[sitemap] ${lang}: ${first.totalPages} WordPress pages exceeds the ${WP_MAX_PAGES}-page cap; later articles are omitted.`
    );
  }

  const pages = [first];
  for (let page = 2; page <= totalPages; page++) {
    pages.push(await getWordPressPosts({ ...query, page }));
  }

  const routes: MetadataRoute.Sitemap = [];
  for (const result of pages) {
    for (const post of result.data) {
      const type = mapCategoryToType(post.categories, lang);
      const path = wordPressArticlePath(type, post.id, lang);
      if (!path) continue;

      const lastModified = post.modified ? new Date(post.modified) : undefined;
      routes.push({
        url: `${origin}${path}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }
  return routes;
}

/**
 * Every WordPress article URL. At request time (hourly regeneration) a
 * WordPress outage must fail the sitemap, not publish a "complete" sitemap
 * that dropped every article: Next keeps serving the last good sitemap.
 *
 * During `next build` there is no previous sitemap to fall back on and a
 * throw fails the whole deploy, so the build ships the static and database
 * URLs and the first hourly regeneration adds the articles.
 */
async function articleRoutes(origin: string): Promise<MetadataRoute.Sitemap> {
  try {
    const [english, nepali] = await Promise.all([
      wordpressArticleRoutes(origin, 'en'),
      wordpressArticleRoutes(origin, 'ne'),
    ]);
    return [...english, ...nepali];
  } catch (error) {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    console.error(
      '[sitemap] WordPress unavailable during build; article URLs will be added on the next regeneration:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl();
  const now = new Date();

  const routes: MetadataRoute.Sitemap = staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  try {
    const [semesters, events, publications, galleries, teamMembers] = await Promise.all([
      prisma.semester.findMany({ select: { id: true } }),
      prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.publication.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.gallery.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, updatedAt: true },
      }),
      prisma.teamMember.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const semester of semesters) {
      routes.push({
        url: `${origin}/semesters/${semester.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const event of events) {
      routes.push({
        url: `${origin}/events/${event.slug}`,
        lastModified: event.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }

    for (const publication of publications) {
      routes.push({
        url: `${origin}/publications/${publication.slug}`,
        lastModified: publication.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }

    for (const gallery of galleries) {
      routes.push({
        url: `${origin}/gallery/${gallery.id}`,
        lastModified: gallery.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const member of teamMembers) {
      routes.push({
        url: `${origin}/team/${member.slug}`,
        lastModified: member.updatedAt ?? now,
        changeFrequency: 'yearly',
        priority: 0.5,
      });
    }
  } catch (error) {
    // A missing table (fresh preview DB) or a transient database error should
    // never take the whole build down — the static routes are still useful.
    console.error(
      '[sitemap] Could not load dynamic routes:',
      error instanceof Error ? error.message : error
    );
  }

  routes.push(...(await articleRoutes(origin)));

  return routes;
}
