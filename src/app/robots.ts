import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // Private application areas.
        '/admin/',
        '/api/',
        '/dashboard',
        '/profile',
        '/payment/',
        // Authentication flows have no indexable content.
        '/login',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        // Login-gated study material and the reader.
        '/read/',
        '/resources/',
        '/study?type=',
        // Query-driven result pages.
        '/search',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
