import type { NextConfig } from "next";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self';
    frame-src https://www.google.com https://maps.google.com;
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
      if (url.protocol === 'https:' && /^https:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?$/.test(url.origin)) {
        return url.origin;
      }
      return '';
    } catch {
      return '';
    }
  }
  return '';
};

function buildCspHeader(): string {
  const b2Origin = getB2EndpointDomain();
  const b2OriginPart = b2Origin ? ` ${b2Origin}` : '';

  return cspHeader
    .replace(
      "img-src 'self' blob: data:;",
      `img-src 'self' blob: data:${b2OriginPart} https://entertainlawyers.com https://www.entertainlawyers.com;`
    )
    .replace(
      "connect-src 'self';",
      `connect-src 'self'${b2OriginPart};`
    )
    .replace(/\n/g, '');
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
