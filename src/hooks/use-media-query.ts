import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query. `serverValue` is used on the server and
 * during hydration so the first client render matches the server markup;
 * the real value takes over right after.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
