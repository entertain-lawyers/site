import { describe, it, expect } from 'vitest';

/**
 * Tests for the middleware matcher config in proxy.ts.
 * The matcher is a simple regex pattern - we test the logic directly
 * without needing a full Next.js middleware test harness.
 */

describe('Middleware Matcher (proxy.ts config)', () => {
  // The matcher pattern from proxy.ts line 217:
  // "/((?!api|_next/static|_next/image|favicon.ico|wp-content|nepali/wp-content).*)"
  const matcherPattern = /^\/((?!api|_next\/static|_next\/image|favicon\.ico|wp-content|nepali\/wp-content).*)/;

  const shouldMatch = (pathname: string) => matcherPattern.test(pathname);

  it('should match regular page routes', () => {
    expect(shouldMatch('/')).toBe(true);
    expect(shouldMatch('/news')).toBe(true);
    expect(shouldMatch('/blogs')).toBe(true);
    expect(shouldMatch('/resources')).toBe(true);
    expect(shouldMatch('/admin')).toBe(true);
    expect(shouldMatch('/dashboard')).toBe(true);
    expect(shouldMatch('/read/something')).toBe(true);
  });

  it('should match nepali page routes', () => {
    expect(shouldMatch('/nepali')).toBe(true);
    expect(shouldMatch('/nepali/news')).toBe(true);
    expect(shouldMatch('/nepali/blogs')).toBe(true);
    expect(shouldMatch('/nepali/resources')).toBe(true);
  });

  it('should NOT match wp-content paths (English)', () => {
    expect(shouldMatch('/wp-content/uploads/2024/01/img.jpg')).toBe(false);
    expect(shouldMatch('/wp-content/plugins/foo.js')).toBe(false);
    expect(shouldMatch('/wp-content/themes/bar.css')).toBe(false);
  });

  it('should NOT match nepali/wp-content paths', () => {
    expect(shouldMatch('/nepali/wp-content/uploads/2024/01/img.jpg')).toBe(false);
    expect(shouldMatch('/nepali/wp-content/plugins/foo.js')).toBe(false);
    expect(shouldMatch('/nepali/wp-content/themes/bar.css')).toBe(false);
  });

  it('should NOT match api routes', () => {
    expect(shouldMatch('/api/posts')).toBe(false);
    expect(shouldMatch('/api/auth/login')).toBe(false);
  });

  it('should NOT match _next/static', () => {
    expect(shouldMatch('/_next/static/chunks/main.js')).toBe(false);
  });

  it('should NOT match _next/image', () => {
    expect(shouldMatch('/_next/image?url=...')).toBe(false);
  });

  it('should NOT match favicon.ico', () => {
    expect(shouldMatch('/favicon.ico')).toBe(false);
  });

  it('should still match paths containing wp-content as a substring in other contexts', () => {
    // These are not actual wp-content paths, so they should match
    expect(shouldMatch('/some-wp-content-page')).toBe(true);
    expect(shouldMatch('/blog/wp-content-analysis')).toBe(true);
  });
});