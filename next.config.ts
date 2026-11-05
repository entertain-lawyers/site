import type { NextConfig } from "next";

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
      // CSP is applied per-request in src/proxy.ts with a nonce; setting it
      // here too would create a second, unsafe-inline policy that browsers
      // enforce as a conjunction and defeat the nonce.
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
