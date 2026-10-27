/** Shared definitions for content-protection activity tracking. */

/** DB action strings logged by ContentProtection → /api/protection/log. */
export const PROTECTION_ACTIONS = [
  'PROTECTION_COPY_BLOCKED',
  'PROTECTION_CUT_BLOCKED',
  'PROTECTION_SAVE_BLOCKED',
  'PROTECTION_PRINT_BLOCKED',
  'PROTECTION_VIEW_SOURCE_BLOCKED',
  'PROTECTION_CONTEXT_MENU_BLOCKED',
  'PROTECTION_DRAG_BLOCKED',
] as const;

export type ProtectionAction = (typeof PROTECTION_ACTIONS)[number];

/** Human labels for the dashboard widgets and the Protection Center. */
export const PROTECTION_LABELS: Record<string, string> = {
  PROTECTION_COPY_BLOCKED: 'Copy shortcuts (Ctrl+C)',
  PROTECTION_CUT_BLOCKED: 'Cut (Ctrl+X)',
  PROTECTION_SAVE_BLOCKED: 'Save page (Ctrl+S)',
  PROTECTION_PRINT_BLOCKED: 'Print (Ctrl+P)',
  PROTECTION_VIEW_SOURCE_BLOCKED: 'View source (Ctrl+U)',
  PROTECTION_CONTEXT_MENU_BLOCKED: 'Right-click menu',
  PROTECTION_DRAG_BLOCKED: 'Drag & drop selection',
};

export const PROTECTION_ACTION_PREFIX = 'PROTECTION_';

/** "Last 30 days" window start for the Protection Center charts. */
export function protectionSince(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Bucket access-event timestamps into `days` daily counts (oldest → newest),
 * relative to `now`. Kept out of components so server-render calculations
 * never call impure clock reads inline.
 */
export function dailyAttemptBuckets(
  createdAts: Date[],
  days: number,
  now: Date
): [string, number][] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const createdAt of createdAts) {
    const key = createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets.entries());
}
