'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * First-party page-view tracker. Sends one PAGE_VIEW event to
 * /api/analytics/view per pathname per browsing session (sessionStorage
 * dedupe) — no cookies, no third parties, no fingerprinting. Skipped on
 * /admin routes so the team's own dashboard work never skews traffic stats.
 *
 * Volume stays bounded end-to-end: client dedupe + server rate limit + a
 * single small POST per navigation.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    // Neutral panels (login, dashboard) are still public pages — count them.

    try {
      const key = `av:${pathname}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Storage unavailable (private mode quirks) → still count this view.
    }

    try {
      fetch('/api/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PAGE_VIEW', url: pathname }),
        keepalive: true,
      }).catch(() => {
        // Telemetry must never disturb the visitor.
      });
    } catch {
      // ignore
    }
  }, [pathname]);

  return null;
}
