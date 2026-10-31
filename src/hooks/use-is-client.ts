import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * True only in the browser after hydration. Safe for gating portals and other
 * client-only output: the server and the hydrating client both see `false`,
 * so the markup always matches.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
