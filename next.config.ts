import type { NextConfig } from "next";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const getB2EndpointDomain = () => {
  if (process.env.B2_ENDPOINT) {
    try {
      const url = new URL(process.env.B2_ENDPOINT);
      return url.origin;
    } catch {
      return 'https://*.backblazeb2.com';
    }
  }
  return 'https://*.backblazeb2.com';
};

const dynamicCspHeader = cspHeader.replace(
  "img-src 'self' blob: data:;",
  `img-src 'self' blob: data: ${getB2EndpointDomain()} https://entertainlawyers.com https://www.entertainlawyers.com;`
);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: dynamicCspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
