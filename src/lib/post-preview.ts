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
  /** Admin edit URL, so "Back to Editor" returns to the post being edited. */
  editorUrl?: string;
  /** Sidebar is fetched server-side on /preview — not needed in the draft. */
}

/** Stash the current editor state for the /preview tab. Client-only. */
export function writePostPreviewDraft(draft: {
  title: string;
  content: string;
  type: string;
  featuredImage?: string | null;
  createdAt?: string;
  editorUrl?: string;
}): void {
  if (typeof window === 'undefined') return;
  const payload: PostPreviewDraft = {
    ...draft,
    createdAt: draft.createdAt || new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(POST_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota/private-mode failures shouldn't block the editor — /preview will
    // fall back to its "no draft" empty state.
  }
}
