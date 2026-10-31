import { describe, it, expect } from 'vitest';
import { serializeJsonLd, getSiteUrl, wordPressArticlePath, isBlogRouteType } from '@/lib/seo';
import { mapCategoryToType } from '@/lib/wordpress';

describe('serializeJsonLd', () => {
  it('keeps normal structured data as valid JSON', () => {
    const value = { '@type': 'BreadcrumbList', name: 'Study & Notes' };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it('cannot break out of the inline script tag', () => {
    const payload = { name: '</script><script>alert(1)</script>' };
    const serialized = serializeJsonLd(payload);

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(JSON.parse(serialized).name).toBe(payload.name);
  });

  it('escapes line/paragraph separators that are invalid in inline JS', () => {
    const serialized = serializeJsonLd({ name: 'a\u2028b\u2029c' });
    expect(serialized).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(serialized).name).toBe('a\u2028b\u2029c');
  });
});

describe('getSiteUrl', () => {
  it('returns a bare https origin with no trailing slash or path', () => {
    const origin = getSiteUrl();
    expect(origin).toMatch(/^https?:\/\/[^/]+$/);
    expect(new URL(origin).pathname).toBe('/');
    expect(origin.endsWith('/')).toBe(false);
  });
});

describe('wordPressArticlePath', () => {
  it('maps each English type to the route that renders it', () => {
    expect(wordPressArticlePath('NEWS', 2768, 'en')).toBe('/news/2768');
    expect(wordPressArticlePath('BLOG', 12, 'en')).toBe('/blogs/12');
    expect(wordPressArticlePath('OPINION', 7, 'en')).toBe('/blogs/7');
    expect(wordPressArticlePath('FACT', 34, 'en')).toBe('/historical-facts/34');
    expect(wordPressArticlePath('PERSONALITY', 56, 'en')).toBe('/historical-facts/56');
  });

  it('never advertises a URL for types the site has no route for', () => {
    expect(wordPressArticlePath('UNKNOWN', 8, 'en')).toBeNull();
  });

  it('maps Nepali posts to the Nepali route and rejects English types', () => {
    expect(wordPressArticlePath('NEPALI_SAMANYA_SAMACHAR', 90, 'ne')).toBe('/nepali/post/90');
    expect(wordPressArticlePath('NEPALI_BLOG_BICHAR', 91, 'ne')).toBe('/nepali/post/91');
    expect(wordPressArticlePath('NEWS', 92, 'ne')).toBeNull();
  });
});

describe('isBlogRouteType', () => {
  it('serves blog and opinion posts on /blogs, nothing else', () => {
    expect(isBlogRouteType('BLOG')).toBe(true);
    expect(isBlogRouteType('OPINION')).toBe(true);
    expect(isBlogRouteType('NEWS')).toBe(false);
    expect(isBlogRouteType('UNKNOWN')).toBe(false);
  });

  it('accepts a post tagged both Blog (61) and Opinion (60), which /blogs lists', () => {
    // mapCategoryToType checks Opinion first, so this post maps to OPINION;
    // the /blogs/[id] route used to 404 on it (e.g. WordPress post 3392).
    const type = mapCategoryToType([61, 60], 'en');
    expect(type).toBe('OPINION');
    expect(isBlogRouteType(type)).toBe(true);
    expect(wordPressArticlePath(type, 3392, 'en')).toBe('/blogs/3392');
  });
});
