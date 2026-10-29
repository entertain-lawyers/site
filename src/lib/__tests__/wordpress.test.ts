import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWordPressBaseUrl,
  getWordPressAuthHeader,
  getWordPressPosts,
  getWordPressPostBySlug,
  getWordPressPostById,
  getWordPressCategories,
  createWordPressPost,
  updateWordPressPost,
  deleteWordPressPost,
  mapTypeToCategory,
  mapCategoryToType,
  WordPressAuthError,
  WordPressApiError,
  decodeHtmlEntities,
} from '../wordpress';

describe('WordPress REST API Client (src/lib/wordpress.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Base URL Configuration & Language Separation', () => {
    it('should default to standard English WordPress REST API URL', () => {
      delete process.env.WP_ENGLISH_URL;
      expect(getWordPressBaseUrl('en')).toBe('https://entertainlawyers.com/wp-json/wp/v2');
    });

    it('should default to standard Nepali WordPress REST API URL', () => {
      delete process.env.WP_NEPALI_URL;
      expect(getWordPressBaseUrl('ne')).toBe('https://entertainlawyers.com/nepali/wp-json/wp/v2');
    });

    it('should respect custom English and Nepali environment variables', () => {
      process.env.WP_ENGLISH_URL = 'https://custom-en.example.com/wp-json/wp/v2/';
      process.env.WP_NEPALI_URL = 'https://custom-ne.example.com/wp-json/wp/v2/';

      expect(getWordPressBaseUrl('en')).toBe('https://custom-en.example.com/wp-json/wp/v2');
      expect(getWordPressBaseUrl('ne')).toBe('https://custom-ne.example.com/wp-json/wp/v2');
    });
  });

  describe('2. Authentication Header & Credential Safety', () => {
    it('should throw WordPressAuthError when no credentials are set', () => {
      delete process.env.WP_AUTH_HEADER;
      delete process.env.WP_AUTH_USERNAME;
      delete process.env.WP_AUTH_APP_PASSWORD;

      expect(() => getWordPressAuthHeader()).toThrow(WordPressAuthError);
    });

    it('should construct Basic Auth header from username and app password', () => {
      delete process.env.WP_AUTH_HEADER;
      process.env.WP_AUTH_USERNAME = 'admin';
      process.env.WP_AUTH_APP_PASSWORD = 'abcd 1234 efgh 5678';

      const header = getWordPressAuthHeader();
      const expectedBase64 = Buffer.from('admin:abcd 1234 efgh 5678').toString('base64');
      expect(header).toBe(`Basic ${expectedBase64}`);
    });

    it('should prioritize explicit WP_AUTH_HEADER if provided', () => {
      process.env.WP_AUTH_HEADER = 'Bearer custom_token_123';
      process.env.WP_AUTH_USERNAME = 'admin';
      process.env.WP_AUTH_APP_PASSWORD = 'password';

      expect(getWordPressAuthHeader()).toBe('Bearer custom_token_123');
    });

    it('should fail write operations safely when auth credentials are missing', async () => {
      delete process.env.WP_AUTH_HEADER;
      delete process.env.WP_AUTH_USERNAME;
      delete process.env.WP_AUTH_APP_PASSWORD;

      await expect(createWordPressPost({ title: 'Test', content: 'Test' })).rejects.toThrow(WordPressAuthError);
      await expect(updateWordPressPost(123, { title: 'Test' })).rejects.toThrow(WordPressAuthError);
      await expect(deleteWordPressPost(123)).rejects.toThrow(WordPressAuthError);
    });
  });

  describe('3. Public Read Helpers & Pagination', () => {
    it('should fetch posts with correct URL, params, and pagination headers', async () => {
      const mockPosts = [
        { id: 1, title: { rendered: 'Post 1' }, slug: 'post-1', excerpt: { rendered: '' } },
        { id: 2, title: { rendered: 'Post 2' }, slug: 'post-2', excerpt: { rendered: '' } },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
        headers: new Headers({
          'X-WP-Total': '50',
          'X-WP-TotalPages': '5',
        }),
      } as Response);

      const result = await getWordPressPosts({ page: 2, perPage: 10, lang: 'en' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('https://entertainlawyers.com/wp-json/wp/v2/posts');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('per_page=10');

      expect(result.data).toEqual(mockPosts);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(5);
      expect(result.page).toBe(2);
      expect(result.perPage).toBe(10);
    });

    it('should append _embed=true to URL if embed option is true', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      await getWordPressPosts({ embed: true, lang: 'en' });
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('_embed=true');
    });

    it('should handle getWordPressPostBySlug', async () => {
      const mockPost = { id: 42, slug: 'test-post', title: { rendered: 'Test Post' }, excerpt: { rendered: 'Excerpt Test' } };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPost],
        headers: new Headers({ 'X-WP-Total': '1', 'X-WP-TotalPages': '1' }),
      } as Response);

      const post = await getWordPressPostBySlug('test-post', 'en');
      expect(post).toEqual(mockPost);
    });

    it('should return null for getWordPressPostById on 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' }),
      } as Response);

      const post = await getWordPressPostById(9999, 'en');
      expect(post).toBeNull();
    });

    it('should fetch categories correctly', async () => {
      const mockCategories = [{ id: 10, name: 'Constitutional Law', slug: 'constitutional-law' }];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories,
        headers: new Headers({ 'X-WP-Total': '1', 'X-WP-TotalPages': '1' }),
      } as Response);

      const res = await getWordPressCategories({ lang: 'ne' });
      expect(res.data).toEqual(mockCategories);
    });
  });

  describe('4. Error Handling & Request Timeout', () => {
    it('should return empty list on non-200 responses to survive outage', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server crash' }),
      } as Response);

      const res = await getWordPressPosts();
      expect(res.data).toEqual([]);
      expect(res.total).toBe(0);
    });
  });

  describe('5. Category Mapping', () => {

    it('should map English types to correct categories', () => {
      expect(mapTypeToCategory('NEWS', 'en')).toEqual([58]);
      expect(mapTypeToCategory('BLOG', 'en')).toEqual([61]);
      expect(mapTypeToCategory('OPINION', 'en')).toEqual([60]);
      expect(mapTypeToCategory('FACT', 'en')).toEqual([78]);
    });

    it('should map Nepali types to correct categories', () => {
      expect(mapTypeToCategory('NEPALI_SAMANYA_SAMACHAR', 'ne')).toEqual([58]);
      expect(mapTypeToCategory('NEPALI_ADALAT_SAMACHAR', 'ne')).toEqual([56]);
      expect(mapTypeToCategory('NEPALI_MUKHYA_SAMACHAR', 'ne')).toEqual([58]);
      expect(mapTypeToCategory('NEPALI_NAJIRHARU', 'ne')).toEqual([57]);
      expect(mapTypeToCategory('NEPALI_AIN_KANUN', 'ne')).toEqual([64]);
      expect(mapTypeToCategory('NEPALI_BLOG_BICHAR', 'ne')).toEqual([61]);
    });

    it('should explicitly throw on unknown English types', () => {
      expect(() => mapTypeToCategory('UNKNOWN_TYPE', 'en')).toThrowError('Unknown English post type: UNKNOWN_TYPE');
      expect(() => mapTypeToCategory('NEPALI_SAMANYA_SAMACHAR', 'en')).toThrowError('Unknown English post type: NEPALI_SAMANYA_SAMACHAR');
    });

    it('should explicitly throw on unknown Nepali types', () => {
      expect(() => mapTypeToCategory('UNKNOWN_TYPE', 'ne')).toThrowError('Unknown Nepali post type: UNKNOWN_TYPE');
      expect(() => mapTypeToCategory('NEWS', 'ne')).toThrowError('Unknown Nepali post type: NEWS');
    });

    it('should gracefully return UNKNOWN for unmapped or undefined categories', () => {
      // Undefined or empty array
      expect(mapCategoryToType(undefined, 'en')).toBe('UNKNOWN');
      expect(mapCategoryToType([], 'en')).toBe('UNKNOWN');
      
      // Unknown category ID
      expect(mapCategoryToType([99999], 'en')).toBe('UNKNOWN');
      expect(mapCategoryToType([99999], 'ne')).toBe('UNKNOWN');
    });

    it('should return correct type for known categories', () => {
      expect(mapCategoryToType([58], 'en')).toBe('NEWS');
      expect(mapCategoryToType([61], 'en')).toBe('BLOG');
      expect(mapCategoryToType([60], 'en')).toBe('OPINION');
      expect(mapCategoryToType([58], 'ne')).toBe('NEPALI_SAMANYA_SAMACHAR');
      expect(mapCategoryToType([68], 'ne')).toBe('NEPALI_ADALAT_SAMACHAR');
      expect(mapCategoryToType([60], 'ne')).toBe('NEPALI_BLOG_BICHAR');
      expect(mapCategoryToType([64], 'ne')).toBe('NEPALI_AIN_KANUN');
    });
});
});

describe('decodeHtmlEntities', () => {
  it('should decode HTML entities correctly', () => {
    expect(decodeHtmlEntities('&#8220;Test&#8221;')).toBe('“Test”');
    expect(decodeHtmlEntities('&#8230;')).toBe('…');
    expect(decodeHtmlEntities('&amp; &lt; &gt;')).toBe('& < >');
  });
});
