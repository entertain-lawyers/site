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
  options: WordPressQueryOptions = {},
  customHeaders?: Record<string, string>
): Promise<WordPressPaginatedResponse<T>> {
  const lang = options.lang || 'en';
  const baseUrl = getWordPressBaseUrl(lang);
  const timeoutMs = options.timeoutMs ?? 8000;

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const tags = options.tags || ['wordpress', `wordpress-${lang}`, `wordpress-${endpoint.split('/')[1] || 'general'}`];
  const revalidate = options.revalidate !== undefined ? options.revalidate : 3600;

  try {
    const fetchOptions: RequestInit & { next?: { tags?: string[]; revalidate?: number | false } } = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...customHeaders,
      },
      signal: controller.signal,
    };

    if (revalidate !== undefined || tags.length > 0) {
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
    if (error.name === 'AbortError') {
      throw new WordPressApiError(`Request to WordPress timed out after ${timeoutMs}ms`, 408, endpoint);
    }
    if (error instanceof WordPressApiError) {
      throw error;
    }
    throw new WordPressApiError(`Failed to fetch from WordPress API: ${error.message}`, 500, endpoint);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safely invalidates Next.js cache tags
 */
function invalidateCacheTags(lang: WordPressLanguage) {
  try {
    // @ts-ignore - Next.js 16.3 beta typings might incorrectly expect 2 arguments
    revalidateTag('wordpress');
    // @ts-ignore
    revalidateTag(`wordpress-${lang}`);
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
  return fetchWordPress<WordPressPost>('/posts', options);
}

/**
 * GET single post by slug
 */
export async function getWordPressPostBySlug(
  slug: string,
  lang: WordPressLanguage = 'en'
): Promise<WordPressPost | null> {
  const result = await fetchWordPress<WordPressPost>('/posts', { slug, lang, perPage: 1 });
  return result.data[0] || null;
}

/**
 * GET single post by ID
 */
export async function getWordPressPostById(
  id: number,
  lang: WordPressLanguage = 'en'
): Promise<WordPressPost | null> {
  try {
    const result = await fetchWordPress<WordPressPost>(`/posts/${id}`, { lang });
    return result.data[0] || null;
  } catch (error: any) {
    if (error instanceof WordPressApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
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
  lang: WordPressLanguage = 'en'
): Promise<WordPressMedia | null> {
  try {
    const result = await fetchWordPress<WordPressMedia>(`/media/${id}`, { lang });
    return result.data[0] || null;
  } catch (error: any) {
    if (error instanceof WordPressApiError && error.status === 404) {
      return null;
    }
    throw error;
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
  FACT: 78,
  OPINION: 61,
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
    if (categories.includes(56)) return 'NEPALI_ADALAT_SAMACHAR';
    if (categories.includes(57)) return 'NEPALI_NAJIRHARU';
    if (categories.includes(64)) return 'NEPALI_AIN_KANUN';
    if (categories.includes(61)) return 'NEPALI_BLOG_BICHAR';
    
    if (categories.includes(58)) return 'NEPALI_SAMANYA_SAMACHAR';
    return 'UNKNOWN';
  }
  if (categories.includes(61)) return 'BLOG';
  if (categories.includes(78)) return 'FACT';
  
  if (categories.includes(58)) return 'NEWS';
  return 'UNKNOWN';
}
