import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://www.entertainlawyers.com';

// Rebuild the sitemap hourly without rebuilding the whole site.
export const revalidate = 3600;

interface StaticRoute {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

// Publicly readable pages only. Gated material (`/resources/[id]`, `/read/*`)
// is deliberately absent: crawlers would only ever see a login redirect.
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: MetadataRoute.Sitemap = staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
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
        url: `${BASE_URL}/semesters/${semester.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const event of events) {
      routes.push({
        url: `${BASE_URL}/events/${event.slug}`,
        lastModified: event.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }

    for (const publication of publications) {
      routes.push({
        url: `${BASE_URL}/publications/${publication.slug}`,
        lastModified: publication.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }

    for (const gallery of galleries) {
      routes.push({
        url: `${BASE_URL}/gallery/${gallery.id}`,
        lastModified: gallery.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const member of teamMembers) {
      routes.push({
        url: `${BASE_URL}/team/${member.slug}`,
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

  return routes;
}
