import type { NextConfig } from "next";

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
    frame-src https://www.google.com https://maps.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
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
  serverExternalPackages: ['isomorphic-dompurify'],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
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
