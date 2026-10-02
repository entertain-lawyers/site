import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://www.entertainlawyers.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes = [
    '',
    '/about',
    '/explore',
    '/contact',
    '/pricing',
    '/privacy-policy',
    '/semesters',
    '/study',
    '/resources',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic Semesters
  const semesters = await prisma.semester.findMany({
    select: { id: true },
  });

  const semesterRoutes = semesters.map((semester) => ({
    url: `${BASE_URL}/semesters/${semester.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic Resources
  const resources = await prisma.resource.findMany({
    select: { id: true },
  });

  const resourceRoutes = resources.map((resource) => ({
    url: `${BASE_URL}/resources/${resource.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...semesterRoutes, ...resourceRoutes];
}
