import { revalidateTag } from 'next/cache';

/**
 * Custom Error for WordPress API Errors
 */
export class WordPressApiError extends Error {
  public readonly status?: number;
  public readonly endpoint?: string;
  public readonly data?: unknown;

  constructor(message: string, status?: number, endpoint?: string, data?: unknown) {
    super(message);
    this.name = 'WordPressApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.data = data;
  }
}

/**
 * Custom Error for Missing or Invalid Credentials
 */
export class WordPressAuthError extends Error {
  constructor(message: string = 'WordPress authentication credentials are missing or unconfigured.') {
    super(message);
    this.name = 'WordPressAuthError';
  }
}

export type WordPressLanguage = 'en' | 'ne';

export interface WordPressRenderedField {
  rendered: string;
}

export interface WordPressPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: 'publish' | 'draft' | 'future' | 'private' | 'trash' | string;
  type: string;
  link: string;
  title: WordPressRenderedField;
  content: WordPressRenderedField;
  excerpt: WordPressRenderedField;
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  meta?: Record<string, unknown>;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
}

export interface WordPressCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

export interface WordPressMedia {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: WordPressRenderedField;
  author: number;
  source_url: string;
  mime_type: string;
  media_details?: {
    width?: number;
    height?: number;
    file?: string;
    sizes?: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface WordPressPaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface WordPressQueryOptions {
  page?: number;
  perPage?: number;
  search?: string;
  categories?: number[];
  slug?: string;
  status?: string;
  lang?: WordPressLanguage;
  order?: 'asc' | 'desc';
  orderBy?: string;
  timeoutMs?: number;
  revalidate?: number | false;
  tags?: string[];
  embed?: boolean;
  /** Comma-separated WP `_fields` allow-list (keeps search-index fetches small). */
  fields?: string;
  /**
   * Reject instead of returning an empty page. Public pages keep the empty
   * fallback so an outage degrades gracefully; admin screens opt in so they can
   * tell "no posts" apart from "WordPress is unavailable".
   */
  throwOnError?: boolean;
  /**
   * Send the server's WordPress credentials (admin screens only). Required for
   * `draft`/`trash` statuses and for opening an unpublished post. These
   * responses are never written to the shared fetch cache.
   */
  authenticated?: boolean;
  /** Extra endpoint-specific query parameters (e.g. `media_type` on /media). */
  params?: Record<string, string>;
}

export interface WordPressCreatePostInput {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'private';
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  slug?: string;
}

export interface WordPressUpdatePostInput {
  title?: string;
  content?: string;
  status?: 'publish' | 'draft' | 'private' | 'trash';
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  slug?: string;
}

/**
 * Returns base URL for English or Nepali WordPress REST API
 */
export function getWordPressBaseUrl(lang: WordPressLanguage = 'en'): string {
  if (lang === 'ne') {
    return (process.env.WP_NEPALI_URL || 'https://entertainlawyers.com/nepali/wp-json/wp/v2').replace(/\/+$/, '');
  }
  return (process.env.WP_ENGLISH_URL || 'https://entertainlawyers.com/wp-json/wp/v2').replace(/\/+$/, '');
}

export function hasWordPressCredentials(): boolean {
  return Boolean(
    process.env.WP_AUTH_HEADER ||
      (process.env.WP_AUTH_USERNAME && process.env.WP_AUTH_APP_PASSWORD)
  );
}

/**
 * Retrieves authentication header for WordPress write operations.
 * Fails safely if credentials are not configured on the server.
 */
export function getWordPressAuthHeader(): string {
  if (typeof window !== 'undefined') {
    throw new WordPressAuthError('WordPress authentication operations must strictly run on the server.');
  }

  if (process.env.WP_AUTH_HEADER) {
    return process.env.WP_AUTH_HEADER.trim();
  }

  const username = process.env.WP_AUTH_USERNAME;
  const password = process.env.WP_AUTH_APP_PASSWORD;

  if (username && password) {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  throw new WordPressAuthError(
    'WordPress authentication credentials are missing. Set WP_AUTH_HEADER or WP_AUTH_USERNAME and WP_AUTH_APP_PASSWORD.'
  );
}

/**
 * Core internal fetcher for public WordPress REST API read requests.
 */
async function fetchWordPress<T>(
  endpoint: string,
  options: WordPressQueryOptions = {}
): Promise<WordPressPaginatedResponse<T>> {
  const lang = options.lang || 'en';
  const baseUrl = getWordPressBaseUrl(lang);
  const timeoutMs = options.timeoutMs ?? 8000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const tags = options.tags || ['wordpress', `wordpress-${lang}`, `wordpress-${endpoint.split('/')[1] || 'general'}`];
  const revalidate = options.revalidate !== undefined ? options.revalidate : 3600;

  try {
    // A malformed WP_ENGLISH_URL/WP_NEPALI_URL must fail here (and be reported to
    // the admin screen) instead of throwing before the error handler below.
    const url = new URL(`${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`);

    if (options.page) url.searchParams.set('page', String(options.page));
    if (options.perPage) url.searchParams.set('per_page', String(options.perPage));
    if (options.search) url.searchParams.set('search', options.search);
    if (options.categories && options.categories.length > 0) {
      url.searchParams.set('categories', options.categories.join(','));
    }
    if (options.slug) url.searchParams.set('slug', options.slug);
    if (options.status) url.searchParams.set('status', options.status);
    if (options.order) url.searchParams.set('order', options.order);
    if (options.orderBy) url.searchParams.set('orderby', options.orderBy);
    if (options.embed) url.searchParams.set('_embed', 'true');
    if (options.fields) url.searchParams.set('_fields', options.fields);
    for (const [key, value] of Object.entries(options.params ?? {})) url.searchParams.set(key, value);

    const fetchOptions: RequestInit & { next?: { tags?: string[]; revalidate?: number | false } } = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.authenticated ? { Authorization: getWordPressAuthHeader() } : {}),
      },
      signal: controller.signal,
    };

    if (options.authenticated) {
      // Drafts and trash must never land in the cache public pages read from.
      fetchOptions.cache = 'no-store';
    } else if (revalidate !== undefined || tags.length > 0) {
      fetchOptions.next = {
        tags,
        ...(revalidate !== undefined ? { revalidate } : {}),
      };
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new WordPressApiError(
        `WordPress API error ${response.status}: ${response.statusText}`,
        response.status,
        endpoint,
        errorData
      );
    }

    const data: T[] = await response.json();
    const total = parseInt(response.headers.get('X-WP-Total') || String(Array.isArray(data) ? data.length : 0), 10);
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);

    return {
      data: Array.isArray(data) ? data : ([data] as unknown as T[]),
      total,
      totalPages,
      page: options.page || 1,
      perPage: options.perPage || (Array.isArray(data) ? data.length : 1),
    };
  } catch (error: any) {
    // Public content must survive a WordPress outage. Return an empty page so
    // list/detail pages render their empty state instead of a 500. Admin
    // callers pass throwOnError so they can show the real outage instead.
    const reason =
      error?.name === 'AbortError'
        ? `timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(`[wordpress] ${endpoint} failed: ${reason}`);
    if (options.throwOnError) {
      throw error instanceof WordPressApiError
        ? error
        : new WordPressApiError(reason, undefined, endpoint);
    }
    return {
      data: [],
      total: 0,
      totalPages: 0,
      page: options.page || 1,
      perPage: options.perPage || 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Decodes HTML entities commonly found in WordPress titles and excerpts.
 */
export function decodeHtmlEntities(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
            .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ');
}

/**
 * Safely invalidates Next.js cache tags
 */
function invalidateCacheTags(lang: WordPressLanguage) {
  try {
    // `{ expire: 0 }`: the next visitor gets fresh content, not a stale copy
    // (the deprecated one-argument form behaved the same way).
    revalidateTag('wordpress', { expire: 0 });
    revalidateTag(`wordpress-${lang}`, { expire: 0 });
  } catch {
    // Graceful fallback when outside Next.js request context (e.g., unit testing)
  }
}

/**
 * GET posts with pagination & filtering
 */
export async function getWordPressPosts(
  options: WordPressQueryOptions = {}
): Promise<WordPressPaginatedResponse<WordPressPost>> {
  const result = await fetchWordPress<WordPressPost>('/posts', options);
  if (result.data) {
    result.data = result.data.map((post) => ({
      ...post,
      title: { ...post.title, rendered: decodeHtmlEntities(post.title?.rendered) },
      excerpt: { ...post.excerpt, rendered: decodeHtmlEntities(post.excerpt?.rendered) },
    }));
  }
  return result;
}

/**
 * GET single post by slug
 */
export async function getWordPressPostBySlug(
  slug: string,
  lang: WordPressLanguage = 'en'
): Promise<WordPressPost | null> {
  const result = await fetchWordPress<WordPressPost>('/posts', { slug, lang, perPage: 1 });
  const post = result.data[0];
  if (!post) return null;
  return {
    ...post,
    title: { ...post.title, rendered: decodeHtmlEntities(post.title?.rendered) },
    excerpt: { ...post.excerpt, rendered: decodeHtmlEntities(post.excerpt?.rendered) },
  };
}

/** WordPress answers these for ids that do not exist or are not public. */
const MISSING_POST_STATUSES = new Set([401, 403, 404, 410]);

/**
 * GET single post by ID.
 *
 * Returns `null` only when WordPress says the post does not exist (or is not
 * visible to this request). Any other failure — timeout, 5xx, bad config —
 * throws. Callers previously got `null` for outages too, so article pages
 * answered a WordPress outage with a 404, which replaced the cached page and
 * told crawlers the article was gone.
 */
export async function getWordPressPostById(
  id: number,
  lang: WordPressLanguage = 'en',
  { authenticated = false }: { authenticated?: boolean } = {}
): Promise<WordPressPost | null> {
  try {
    const result = await fetchWordPress<WordPressPost>(`/posts/${id}`, {
      lang,
      embed: true,
      throwOnError: true,
      authenticated,
    });
    const post = result.data[0];
    if (!post) return null;
    return {
      ...post,
      title: { ...post.title, rendered: decodeHtmlEntities(post.title?.rendered) },
      excerpt: { ...post.excerpt, rendered: decodeHtmlEntities(post.excerpt?.rendered) },
      content: { ...post.content, rendered: post.content?.rendered?.split('<div class="wpra-reactions-wrap')[0] || '' }
    };
  } catch (error: any) {
    if (error instanceof WordPressApiError && error.status && MISSING_POST_STATUSES.has(error.status)) {
      return null;
    }
    throw error;
  }
}

/**
 * Parses a WordPress post id from a route segment. Only canonical decimal ids
 * are accepted: `Number()` also took "0x1F", "1e3" and " 31 ", which served
 * the same article under many URLs.
 */
export function parseWordPressPostId(segment: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(segment)) return null;
  return Number(segment);
}

/**
 * GET categories with pagination & filtering
 */
export async function getWordPressCategories(
  options: WordPressQueryOptions = {}
): Promise<WordPressPaginatedResponse<WordPressCategory>> {
  return fetchWordPress<WordPressCategory>('/categories', options);
}

/**
 * GET category by slug
 */
export async function getWordPressCategoryBySlug(
  slug: string,
  lang: WordPressLanguage = 'en'
): Promise<WordPressCategory | null> {
  const result = await fetchWordPress<WordPressCategory>('/categories', { slug, lang, perPage: 1 });
  return result.data[0] || null;
}

/**
 * GET media item by ID
 */
export async function getWordPressMediaById(
  id: number,
  lang: WordPressLanguage = 'en',
  { authenticated = false }: { authenticated?: boolean } = {}
): Promise<WordPressMedia | null> {
  try {
    const result = await fetchWordPress<WordPressMedia>(`/media/${id}`, { lang, throwOnError: true, authenticated });
    return result.data[0] || null;
  } catch (error: any) {
    if (error instanceof WordPressApiError && error.status && MISSING_POST_STATUSES.has(error.status)) {
      return null;
    }
    throw error;
  }
}

/**
 * Why WordPress writes are not allowed on this deployment, or null when they
 * are. Preview deployments and WP_READ_ONLY protect production WordPress.
 */
export function getWordPressWriteBlock(): string | null {
  if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
    return 'WordPress writes are disabled on this Preview deployment to protect production WordPress.';
  }
  if (!hasWordPressCredentials()) {
    return 'This server has no WordPress credentials. Set WP_AUTH_USERNAME and WP_AUTH_APP_PASSWORD and redeploy.';
  }
  return null;
}

/**
 * Images in the Media Library, newest first. Uses the server's credentials when
 * configured (so images attached to drafts are listed) and is never cached, so
 * a fresh upload shows up immediately.
 */
export async function listWordPressMedia({
  lang = 'en',
  page = 1,
  perPage = 24,
  search,
}: {
  lang?: WordPressLanguage;
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<WordPressPaginatedResponse<WordPressMedia>> {
  return fetchWordPress<WordPressMedia>('/media', {
    lang,
    page,
    perPage,
    search: search?.trim() || undefined,
    order: 'desc',
    orderBy: 'date',
    params: { media_type: 'image' },
    fields: 'id,date,slug,link,title,author,source_url,mime_type,media_details',
    throwOnError: true,
    authenticated: hasWordPressCredentials(),
    revalidate: 0,
    timeoutMs: 10000,
  });
}

/**
 * Authenticated upload of one image to the Media Library of `lang`. The caller
 * validates the bytes first; this only transports them.
 */
export async function uploadWordPressMedia(
  file: { bytes: Uint8Array; filename: string; mimeType: string; title?: string },
  lang: WordPressLanguage = 'en',
  timeoutMs = 30000
): Promise<WordPressMedia> {
  const authHeader = getWordPressAuthHeader();
  const baseUrl = getWordPressBaseUrl(lang);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.filename.replace(/["\\\r\n]/g, '')}"`,
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
      body: file.bytes as BodyInit,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new WordPressApiError(
        `Failed to upload media to WordPress: ${response.status} ${response.statusText}`,
        response.status,
        '/media',
        errorData
      );
    }

    let media: WordPressMedia = await response.json();

    // Use the editor's title instead of the slugified filename WordPress derives.
    if (file.title?.trim()) {
      try {
        const titled = await fetch(`${baseUrl}/media/${media.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader, Accept: 'application/json' },
          body: JSON.stringify({ title: file.title.trim(), alt_text: file.title.trim() }),
          signal: controller.signal,
          cache: 'no-store',
        });
        if (titled.ok) media = await titled.json();
      } catch {
        // The image is uploaded; a missing title is not worth failing over.
      }
    }

    return media;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new WordPressApiError(`Upload to WordPress timed out after ${Math.round(timeoutMs / 1000)}s`, 408, '/media');
    }
    if (error instanceof WordPressApiError || error instanceof WordPressAuthError) {
      throw error;
    }
    throw new WordPressApiError(`Failed to upload media: ${error instanceof Error ? error.message : String(error)}`, 502, '/media');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Authenticated POST request to create a post in WordPress
 */
export async function createWordPressPost(
  input: WordPressCreatePostInput,
  lang: WordPressLanguage = 'en'
): Promise<WordPressPost> {
  const authHeader = getWordPressAuthHeader();
  const baseUrl = getWordPressBaseUrl(lang);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new WordPressApiError(
        `Failed to create WordPress post: ${response.statusText}`,
        response.status,
        '/posts',
        errorData
      );
    }

    const post: WordPressPost = await response.json();
    invalidateCacheTags(lang);
    return post;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new WordPressApiError('Create post request to WordPress timed out', 408, '/posts');
    }
    if (error instanceof WordPressApiError || error instanceof WordPressAuthError) {
      throw error;
    }
    throw new WordPressApiError(`Failed to create post: ${error.message}`, 500, '/posts');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Authenticated POST request to update an existing post in WordPress
 */
export async function updateWordPressPost(
  id: number,
  input: WordPressUpdatePostInput,
  lang: WordPressLanguage = 'en'
): Promise<WordPressPost> {
  const authHeader = getWordPressAuthHeader();
  const baseUrl = getWordPressBaseUrl(lang);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/posts/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new WordPressApiError(
        `Failed to update WordPress post ${id}: ${response.statusText}`,
        response.status,
        `/posts/${id}`,
        errorData
      );
    }

    const post: WordPressPost = await response.json();
    invalidateCacheTags(lang);
    return post;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new WordPressApiError(`Update post ${id} request timed out`, 408, `/posts/${id}`);
    }
    if (error instanceof WordPressApiError || error instanceof WordPressAuthError) {
      throw error;
    }
    throw new WordPressApiError(`Failed to update post: ${error.message}`, 500, `/posts/${id}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Authenticated DELETE request to delete a post in WordPress
 */
export async function deleteWordPressPost(
  id: number,
  force: boolean = false,
  lang: WordPressLanguage = 'en'
): Promise<{ deleted: boolean; previous?: Partial<WordPressPost> }> {
  const authHeader = getWordPressAuthHeader();
  const baseUrl = getWordPressBaseUrl(lang);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const url = new URL(`${baseUrl}/posts/${id}`);
    if (force) url.searchParams.set('force', 'true');

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new WordPressApiError(
        `Failed to delete WordPress post ${id}: ${response.statusText}`,
        response.status,
        `/posts/${id}`,
        errorData
      );
    }

    const result = await response.json();
    invalidateCacheTags(lang);
    return {
      deleted: result.deleted ?? true,
      previous: result.previous,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new WordPressApiError(`Delete post ${id} request timed out`, 408, `/posts/${id}`);
    }
    if (error instanceof WordPressApiError || error instanceof WordPressAuthError) {
      throw error;
    }
    throw new WordPressApiError(`Failed to delete post: ${error.message}`, 500, `/posts/${id}`);
  } finally {
    clearTimeout(timer);
  }
}

const EN_WP_CATEGORIES = {
  NEWS: 58,
  BLOG: 61,
  OPINION: 60,
  FACT: 78,
  PERSONALITY: 81,
};

const NE_WP_CATEGORIES = {
  NEPALI_SAMANYA_SAMACHAR: 58,
  NEPALI_ADALAT_SAMACHAR: 56,
  NEPALI_MUKHYA_SAMACHAR: 58,
  NEPALI_NAJIRHARU: 57,
  NEPALI_AIN_KANUN: 64,
  NEPALI_BLOG_BICHAR: 61,
};

export function mapTypeToCategory(type: string, lang: 'en' | 'ne'): number[] {
  if (lang === 'ne') {
    const catId = (NE_WP_CATEGORIES as any)[type];
    if (!catId) throw new Error(`Unknown Nepali post type: ${type}`);
    return [catId];
  }
  const catId = (EN_WP_CATEGORIES as any)[type];
  if (!catId) throw new Error(`Unknown English post type: ${type}`);
  return [catId];
}

export function mapCategoryToType(categories: number[] | undefined, lang: 'en' | 'ne'): string {
  if (!categories || !Array.isArray(categories)) {
    return 'UNKNOWN';
  }
  if (lang === 'ne') {
    // Court news: अदालत (56), उच्च अदालत (68), सर्वोच्च अदालत (55), जिल्ला अदालत (69)
    if (categories.includes(56) || categories.includes(68) || categories.includes(55) || categories.includes(69)) return 'NEPALI_ADALAT_SAMACHAR';
    // Precedents: नजिर (57)
    if (categories.includes(57)) return 'NEPALI_NAJIRHARU';
    // Acts/Laws: ऐन/कानुन (64)
    if (categories.includes(64)) return 'NEPALI_AIN_KANUN';
    // Blog & Opinion: ब्लग (61), विचार (60)
    if (categories.includes(61) || categories.includes(60)) return 'NEPALI_BLOG_BICHAR';
    // General News: राष्ट्रिय (58), समसामयिक (65), हाइलाइट (63), अन्तर्राष्ट्रिय (66), अन्य (1)
    if (categories.includes(58) || categories.includes(65) || categories.includes(63) || categories.includes(66) || categories.includes(1)) return 'NEPALI_SAMANYA_SAMACHAR';
    return 'UNKNOWN';
  }
  if (categories.includes(60)) return 'OPINION';
  if (categories.includes(61)) return 'BLOG';
  if (categories.includes(78)) return 'FACT';
  if (categories.includes(81)) return 'PERSONALITY';
  if (categories.includes(58)) return 'NEWS';
  return 'UNKNOWN';
}
