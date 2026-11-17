/**
 * Post preview handoff between the admin editor and /preview.
 *
 * localStorage (not sessionStorage) is used so an already-open preview tab
 * receives the next draft through the `storage` event — the editor can keep
 * editing while the preview stays open. No server round-trip, no WordPress
 * writes and no DB rows. The draft only ever lives in this browser.
 */
export const POST_PREVIEW_STORAGE_KEY = 'el-post-preview-draft';

/** Every post type the admin editor can select. */
export type PostType =
  | 'NEWS' | 'BLOG' | 'OPINION' | 'FACT' | 'PERSONALITY' | 'CASE_LAW'
  | 'NEPALI_SAMANYA_SAMACHAR' | 'NEPALI_ADALAT_SAMACHAR' | 'NEPALI_MUKHYA_SAMACHAR'
  | 'NEPALI_NAJIRHARU' | 'NEPALI_AIN_KANUN' | 'NEPALI_BLOG_BICHAR';

/** Content type discrimination for /preview rendering: 'POST' (WordPress editorial) or 'RESOURCE' (Prisma curriculum). */
export type PreviewContentType = 'POST' | 'RESOURCE';

export interface PostPreviewAuthor {
  id?: string;
  name: string;
  email?: string | null;
  image?: string | null;
  bio?: string | null;
  website?: string | null;
  role?: string | null;
}

export interface PostPreviewDraft {
  /** Explicit discrimination: 'RESOURCE' uses study reading view, 'POST' uses editorial view */
  contentType?: PreviewContentType;
  title: string;
  content: string;
  type: string;
  /** ISO string; defaults to now when the editor doesn't pass one. */
  createdAt: string;
  featuredImage?: string | null;
  caseCategory?: string | null;
  /** Admin edit URL, so "Back to Editor" returns to the post being edited. */
  editorUrl?: string;
  author?: PostPreviewAuthor | null;
  /** Sidebar is fetched server-side on /preview — not needed in the draft. */
}

/** Stash the current editor state for the /preview tab. Client-only. */
export function writePostPreviewDraft(draft: {
  contentType?: PreviewContentType;
  title: string;
  content: string;
  type: string;
  caseCategory?: string | null;
  featuredImage?: string | null;
  createdAt?: string;
  editorUrl?: string;
  author?: PostPreviewAuthor | null;
}): void {
  if (typeof window === 'undefined') return;
  const payload: PostPreviewDraft = {
    ...draft,
    contentType: draft.contentType || 'POST',
    createdAt: draft.createdAt || new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(POST_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota/private-mode failures shouldn't block the editor — /preview will
    // fall back to its "no draft" empty state.
  }
}

/**
 * Resolves whether a preview draft represents a curriculum study resource.
 * Explicit `contentType` ('RESOURCE' vs 'POST') is the primary discriminator.
 * If `contentType` is omitted (legacy localStorage drafts), URL and type heuristics serve as fallback.
 */
export function isStudyResourceDraft(draft: {
  contentType?: PreviewContentType;
  editorUrl?: string;
  type?: string;
}): boolean {
  if (draft.contentType !== undefined) {
    return draft.contentType === 'RESOURCE';
  }
  // Defensive legacy fallback for unexpired pre-migration drafts
  if (draft.editorUrl?.includes('study/resources')) {
    return true;
  }
  return [
    'LAW_NOTE',
    'CASE_LAW',
    'OLD_QUESTION',
    'OTHER',
    'Law Note',
    'Case Law',
    'Old Question',
    'Resource',
  ].includes(draft.type || '');
}
