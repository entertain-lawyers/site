import type { NextConfig } from "next";
import { storageOriginForCsp } from "./src/lib/storage-origin";

const isDev = process.env.NODE_ENV !== 'production';

// `unsafe-eval` is only needed by the dev runtime (and some editor tooling).
// Production React/Next does not need it, so keep it out of the deployed CSP.
const cspHeader = `
    default-src 'self';
    script-src 'self'${isDev ? " 'unsafe-eval'" : ''} 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self';
    worker-src 'self' blob:;
    frame-src https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
`;

function buildCspHeader(): string {
  const b2Origin = storageOriginForCsp(process.env.B2_ENDPOINT, isDev);
  const b2OriginPart = b2Origin ? ` ${b2Origin}` : '';

  return cspHeader
    .replace(
      "script-src 'self'",
      "script-src 'self' https://va.vercel-scripts.com"
    )
    .replace(
      "img-src 'self' blob: data:;",
      `img-src 'self' blob: data:${b2OriginPart} https://entertainlawyers.com https://www.entertainlawyers.com https://secure.gravatar.com;`
    )
    .replace(
      "connect-src 'self';",
      `connect-src 'self'${b2OriginPart} https://va.vercel-scripts.com https://vitals.vercel-insights.com;`
    )
    .replace(/\n/g, '');
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 's3.us-east-005.backblazeb2.com' },
      { protocol: 'https', hostname: 'entertainlawyers.com' },
      { protocol: 'https', hostname: 'www.entertainlawyers.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
    ],
    minimumCacheTTL: 86400,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    optimizePackageImports: ['lucide-react', 'motion', '@measured/puck'],
  },
  async headers() {
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: buildCspHeader(),
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
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
