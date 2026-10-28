/**
 * Post preview handoff between the admin editor and /preview.
 *
 * sessionStorage is used instead of a server round-trip so previews render
 * the exact, unsaved draft the admin is looking at — no WordPress writes and
 * no DB rows. Keyed storage survives the editor client in the opener tab and
 * is copied into the preview tab opened via window.open.
 */
export const POST_PREVIEW_STORAGE_KEY = 'el-post-preview-draft';

/** Every post type the admin editor can select. */
export type PostType =
  | 'NEWS' | 'BLOG' | 'FACT' | 'PERSONALITY'
  | 'NEPALI_SAMANYA_SAMACHAR' | 'NEPALI_ADALAT_SAMACHAR' | 'NEPALI_MUKHYA_SAMACHAR'
  | 'NEPALI_NAJIRHARU' | 'NEPALI_AIN_KANUN' | 'NEPALI_BLOG_BICHAR';

export interface PostPreviewDraft {
  title: string;
  content: string;
  type: string;
  /** ISO string; defaults to now when the editor doesn't pass one. */
  createdAt: string;
  featuredImage?: string | null;
  /** Sidebar is fetched server-side on /preview — not needed in the draft. */
}

/** Stash the current editor state for the /preview tab. Client-only. */
export function writePostPreviewDraft(draft: {
  title: string;
  content: string;
  type: string;
  featuredImage?: string | null;
  createdAt?: string;
}): void {
  if (typeof window === 'undefined') return;
  const payload: PostPreviewDraft = {
    ...draft,
    createdAt: draft.createdAt || new Date().toISOString(),
  };
  try {
    window.sessionStorage.setItem(POST_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota/private-mode failures shouldn't block the editor — /preview will
    // fall back to its "no draft" empty state.
  }
}
