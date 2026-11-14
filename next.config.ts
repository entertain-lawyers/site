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
      // CMS media proxied via rewrites (Phase 1: CMS hostname compatibility)
      { protocol: 'https', hostname: 'cms.entertainlawyers.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'cms.entertainlawyers.com', pathname: '/nepali/wp-content/uploads/**' },
    ],
    minimumCacheTTL: 86400,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    optimizePackageImports: ['lucide-react', 'motion', '@measured/puck'],
  },
  async rewrites() {
    return [
      // Phase 1: Proxy legacy WordPress media paths to CMS host.
      // Destination is fixed; no user-controlled host. Query strings are forwarded.
      { source: '/wp-content/:path*', destination: 'https://cms.entertainlawyers.com/wp-content/:path*' },
      { source: '/nepali/wp-content/:path*', destination: 'https://cms.entertainlawyers.com/nepali/wp-content/:path*' },
    ];
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
      {
        // The act reader modal embeds this PDF proxy in an iframe on the same
        // origin; DENY blocks even same-origin framing ("This content is
        // blocked" in the reader).
        source: '/api/acts/:id/pdf',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ];
  },
};

export default nextConfig;
