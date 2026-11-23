import { describe, it, expect } from 'vitest';
import {
  parseSocialLinks,
  serializeSocialLinks,
  normalizeSocialUrl,
  getPlatformConfig,
  PLATFORM_OPTIONS,
  SocialLinkItem,
} from '../social-links';

describe('social-links utilities', () => {
  describe('normalizeSocialUrl', () => {
    it('returns empty string for null, undefined, or whitespace', () => {
      expect(normalizeSocialUrl(null)).toBe('');
      expect(normalizeSocialUrl(undefined)).toBe('');
      expect(normalizeSocialUrl('')).toBe('');
      expect(normalizeSocialUrl('   ')).toBe('');
    });

    it('preserves existing https:// and http:// schemes', () => {
      expect(normalizeSocialUrl('https://amritesh.com.np')).toBe('https://amritesh.com.np');
      expect(normalizeSocialUrl('http://example.com')).toBe('http://example.com');
    });

    it('preserves mailto: and tel: schemes', () => {
      expect(normalizeSocialUrl('mailto:info@entertainlawyers.com')).toBe('mailto:info@entertainlawyers.com');
      expect(normalizeSocialUrl('tel:+9779800000000')).toBe('tel:+9779800000000');
    });

    it('prepends https:// when schema is omitted', () => {
      expect(normalizeSocialUrl('github.com/entertain-lawyers')).toBe('https://github.com/entertain-lawyers');
      expect(normalizeSocialUrl('amritesh.com.np')).toBe('https://amritesh.com.np');
    });
  });

  describe('parseSocialLinks', () => {
    it('returns an empty array for empty, null, or undefined values', () => {
      expect(parseSocialLinks(null)).toEqual([]);
      expect(parseSocialLinks(undefined)).toEqual([]);
      expect(parseSocialLinks('')).toEqual([]);
      expect(parseSocialLinks('   ')).toEqual([]);
    });

    it('correctly parses legacy plain URL as website link', () => {
      const parsed = parseSocialLinks('https://amritesh.com.np');
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual({
        id: 'social-legacy-website',
        platform: 'website',
        url: 'https://amritesh.com.np',
        label: 'Portfolio / Website',
      });
    });

    it('correctly parses structured JSON links and normalizes URLs', () => {
      const raw = JSON.stringify([
        { id: '1', platform: 'github', url: 'github.com/amritesh' },
        { id: '2', platform: 'youtube', url: 'https://youtube.com/@entertainlawyers' },
      ]);
      const parsed = parseSocialLinks(raw);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].platform).toBe('github');
      expect(parsed[0].url).toBe('https://github.com/amritesh');
      expect(parsed[1].platform).toBe('youtube');
      expect(parsed[1].url).toBe('https://youtube.com/@entertainlawyers');
    });

    it('ignores empty URL items within JSON array', () => {
      const raw = JSON.stringify([
        { id: '1', platform: 'github', url: '' },
        { id: '2', platform: 'twitter', url: 'https://x.com/lawyers' },
      ]);
      const parsed = parseSocialLinks(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].platform).toBe('twitter');
    });

    it('gracefully handles non-JSON non-URL garbage strings', () => {
      expect(parseSocialLinks('{not valid json')).toEqual([]);
      expect(parseSocialLinks('random-text-without-url')).toEqual([]);
    });
  });

  describe('serializeSocialLinks', () => {
    it('returns null when links array is empty or invalid', () => {
      expect(serializeSocialLinks([])).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(serializeSocialLinks(null as any)).toBeNull();
    });

    it('filters out entries with blank URLs', () => {
      const links: SocialLinkItem[] = [
        { id: '1', platform: 'github', url: '' },
        { id: '2', platform: 'website', url: '   ' },
      ];
      expect(serializeSocialLinks(links)).toBeNull();
    });

    it('normalizes URLs and serializes valid items to JSON', () => {
      const links: SocialLinkItem[] = [
        { id: '1', platform: 'github', url: 'github.com/entertain' },
        { id: '2', platform: 'whatsapp', url: 'https://wa.me/9779800000000' },
      ];
      const serialized = serializeSocialLinks(links);
      expect(serialized).not.toBeNull();
      const deserialized = JSON.parse(serialized!);
      expect(deserialized).toEqual([
        { platform: 'github', url: 'https://github.com/entertain' },
        { platform: 'whatsapp', url: 'https://wa.me/9779800000000' },
      ]);
    });
  });

  describe('getPlatformConfig & PLATFORM_OPTIONS', () => {
    it('contains configurations for expected platforms', () => {
      const keys = PLATFORM_OPTIONS.map((o) => o.key);
      expect(keys).toContain('website');
      expect(keys).toContain('github');
      expect(keys).toContain('twitter');
      expect(keys).toContain('youtube');
      expect(keys).toContain('whatsapp');
      expect(keys).toContain('telegram');
      expect(keys).toContain('threads');
      expect(keys).toContain('tiktok');
      expect(keys).toContain('discord');
      expect(keys).toContain('scholar');
      expect(keys).toContain('medium');
      expect(keys).toContain('linkedin');
      expect(keys).toContain('facebook');
      expect(keys).toContain('instagram');
      expect(keys).toContain('custom');
    });

    it('returns matching config for recognized keys', () => {
      const config = getPlatformConfig('github');
      expect(config.key).toBe('github');
      expect(config.label).toBe('GitHub');
      expect(config.placeholder).toContain('github.com');
    });

    it('returns fallback config for unknown keys', () => {
      const fallback = getPlatformConfig('non-existent-key');
      expect(fallback.key).toBe('custom');
      expect(fallback.label).toBe('Direct Link');
    });
  });
});
