import { MetadataRoute } from 'next';

const BASE_URL = 'https://www.entertainlawyers.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/dashboard/',
        '/payment/',
        '/api/',
        '/read/',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
