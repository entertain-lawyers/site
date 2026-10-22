'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchResult } from '@/components/search/search-results';

/**
 * Live search: fires /api/search as the user types (no Enter needed) with a
 * short debounce so every keystroke still feels instant, and aborts the
 * in-flight request the moment the query changes so results never lag behind
 * the input. Returns null until there is something to show.
 */
export function useLiveSearch(query: string, enabled: boolean) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(query);

  useEffect(() => {
    if (!enabled) return;
    const q = query.trim();
    latest.current = q;

    const controller = new AbortController();
    const t = setTimeout(() => {
      // 1 char = too little to rank well, show a typing hint instead.
      if (q.length < 2) {
        setResult(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: SearchResult) => {
          // Ignore stale responses (user kept typing meanwhile).
          if (latest.current === data.query) {
            setResult(data);
          }
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') setResult(null);
        })
        .finally(() => {
          if (latest.current === q) setLoading(false);
        });
    }, 180);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, enabled]);

  return { result, loading };
}
