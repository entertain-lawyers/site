import { describe, it, expect } from 'vitest';
import {
  isRedirectExempt,
  normalizePath,
  redirectIdSchema,
  redirectSchema,
  updateRedirectSchema,
} from '@/lib/redirect-rules';

describe('normalizePath', () => {
  it('adds a leading slash and trims whitespace', () => {
    expect(normalizePath('  old-page  ')).toBe('/old-page');
  });

  it('drops trailing slashes but keeps the root', () => {
    expect(normalizePath('/old-page/')).toBe('/old-page');
    expect(normalizePath('/old-page///')).toBe('/old-page');
    expect(normalizePath('/')).toBe('/');
  });
});

describe('isRedirectExempt', () => {
  it('protects the root, app areas and auth routes', () => {
    for (const path of [
      '/',
      '/admin',
      '/admin/redirects',
      '/api/ai/chat',
      '/_next/static/chunk.js',
      '/dashboard',
      '/read/abc',
      '/payment/success',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
    ]) {
      expect(isRedirectExempt(path), path).toBe(true);
    }
  });

  it('allows ordinary public paths', () => {
    for (const path of ['/old-page', '/study', '/resources/abc', '/administrator']) {
      expect(isRedirectExempt(path), path).toBe(false);
    }
  });
});

describe('redirectSchema', () => {
  const base = {
    source: '/old-page',
    destination: '/faqs',
    statusCode: 301,
    isActive: true,
  };

  it('accepts a normal rule and trims the source', () => {
    const parsed = redirectSchema.parse({ ...base, source: '  /old-page  ' });
    expect(parsed.source).toBe('/old-page');
    expect(parsed.statusCode).toBe(301);
  });

  it('coerces string status codes and defaults to 301', () => {
    expect(redirectSchema.parse({ ...base, statusCode: '302' }).statusCode).toBe(302);
    expect(redirectSchema.parse({ source: '/a', destination: '/b' }).statusCode).toBe(301);
  });

  it.each([
    ['the root', '/'],
    ['a protocol-relative path', '//evil.example'],
    ['a missing leading slash', 'old-page'],
    ['spaces', '/old page'],
    ['a query string', '/old?utm=1'],
    ['a fragment', '/old#top'],
    ['an admin path', '/admin/users'],
    ['an api path', '/api/ai/chat'],
    ['a full URL', 'https://example.com/old'],
  ])('rejects %s as a source', (_label, source) => {
    expect(redirectSchema.safeParse({ ...base, source }).success).toBe(false);
  });

  it('rejects unsupported status codes', () => {
    expect(redirectSchema.safeParse({ ...base, statusCode: 303 }).success).toBe(false);
    expect(redirectSchema.safeParse({ ...base, statusCode: 200 }).success).toBe(false);
  });

  it('allows relative and absolute http destinations only', () => {
    expect(redirectSchema.safeParse({ ...base, destination: '/study' }).success).toBe(true);
    expect(redirectSchema.safeParse({ ...base, destination: 'https://example.com/x' }).success).toBe(true);
    expect(redirectSchema.safeParse({ ...base, destination: 'javascript:alert(1)' }).success).toBe(false);
    expect(redirectSchema.safeParse({ ...base, destination: 'ftp://example.com' }).success).toBe(false);
  });
});

describe('redirect identifiers', () => {
  it('requires a uuid for updates and deletes', () => {
    expect(redirectIdSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(redirectIdSchema.safeParse({ id: '3f1c2b7a-9d4e-4c1a-8f2b-6e5d4c3b2a10' }).success).toBe(true);
    expect(
      updateRedirectSchema.safeParse({
        id: '3f1c2b7a-9d4e-4c1a-8f2b-6e5d4c3b2a10',
        source: '/old',
        destination: '/new',
      }).success
    ).toBe(true);
  });
});
