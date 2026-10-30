import { describe, expect, it } from 'vitest';
import { isSafeAssetUrl, isValidDateString } from '@/lib/url-validation';

describe('isSafeAssetUrl', () => {
  it('accepts site paths, http(s) URLs and empty values', () => {
    for (const ok of ['', '/uploads/editorial/team/a.jpg', '/api/media/gallery/x.png', 'https://entertainlawyers.com/wp-content/a.jpg', 'http://example.com/a.pdf']) {
      expect(isSafeAssetUrl(ok)).toBe(true);
    }
  });

  it('rejects script, data and protocol-relative URLs', () => {
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:image/svg+xml,<svg/onload=alert(1)>', '//evil.example/x.png', '/\\evil.example', 'ftp://x/y', 'not a url']) {
      expect(isSafeAssetUrl(bad)).toBe(false);
    }
  });
});

describe('isValidDateString', () => {
  it('distinguishes real dates from garbage', () => {
    expect(isValidDateString('2026-11-01')).toBe(true);
    expect(isValidDateString('2026-11-01T10:00')).toBe(true);
    expect(isValidDateString('soon')).toBe(false);
  });
});
