import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.entertainlawyers.com';

export default function robots(): MetadataRoute.Robots {
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
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
