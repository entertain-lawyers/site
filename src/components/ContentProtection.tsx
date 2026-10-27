'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Blocked-copy event reporting. Events are queued in memory and flushed in
 * small batches to /api/protection/log so one frustrated visitor cannot flood
 * the AccessLog table: each action type is recorded at most once per 30s,
 * batches go out at most every 10s, and the endpoint rate-limits per IP.
 */
const ACTION_COOLDOWN_MS = 30_000;
const FLUSH_INTERVAL_MS = 10_000;

const lastLoggedAt = new Map<string, number>();
const queue: { action: string; url: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushQueue() {
  flushTimer = null;
  if (queue.length === 0 || typeof navigator === 'undefined') return;
  const events = queue.splice(0, queue.length);
  try {
    fetch('/api/protection/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(() => {
      // Best-effort telemetry — never surface network failures to visitors.
    });
  } catch {
    // ignore
  }
}

function reportProtectionEvent(action: string) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const last = lastLoggedAt.get(action) || 0;
  if (now - last < ACTION_COOLDOWN_MS) return;
  lastLoggedAt.set(action, now);
  // Relative path only — the endpoint rejects absolute URLs.
  queue.push({ action, url: window.location.pathname + window.location.search });
  if (flushTimer === null) {
    flushTimer = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
  }
}

export default function ContentProtection() {
  const pathname = usePathname();

  useEffect(() => {
    // Completely bypass protection in admin routes
    if (pathname?.startsWith('/admin')) {
      document.body.classList.remove('protected-mode');
      return;
    }

    // Enable CSS protection
    document.body.classList.add('protected-mode');

    // Helper to determine if an element should be exempt from protection
    const isExempt = (target: EventTarget | null) => {
      if (!target) return false;
      
      const element = target as HTMLElement;
      const tag = element.tagName?.toLowerCase();
      
      // Allow interactions with form elements
      if (tag && ['input', 'textarea', 'select', 'button'].includes(tag)) {
        return true;
      }
      
      // Allow interactions with contenteditable elements
      if (element.isContentEditable) {
        return true;
      }

      // Check if element is inside an exempt container
      if (element.closest && (
          element.closest('input') || 
          element.closest('textarea') || 
          element.closest('select') || 
          element.closest('button') ||
          element.closest('[contenteditable="true"]')
      )) {
        return true;
      }
      
      return false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!isExempt(e.target)) {
        e.preventDefault();
        reportProtectionEvent('PROTECTION_CONTEXT_MENU_BLOCKED');
      }
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      if (!isExempt(e.target)) {
        e.preventDefault();
        reportProtectionEvent(e.type === 'cut' ? 'PROTECTION_CUT_BLOCKED' : 'PROTECTION_COPY_BLOCKED');
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (!isExempt(e.target)) {
        e.preventDefault();
        reportProtectionEvent('PROTECTION_DRAG_BLOCKED');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block specific shortcuts if Ctrl or Meta (Cmd) is pressed
      if (e.ctrlKey || e.metaKey) {
        if (isExempt(e.target)) return;

        const key = e.key.toLowerCase();
        // c: copy, x: cut, s: save, p: print, u: view source
        const keyActions: Record<string, string> = {
          c: 'PROTECTION_COPY_BLOCKED',
          x: 'PROTECTION_CUT_BLOCKED',
          s: 'PROTECTION_SAVE_BLOCKED',
          p: 'PROTECTION_PRINT_BLOCKED',
          u: 'PROTECTION_VIEW_SOURCE_BLOCKED',
        };
        const blockedAction = keyActions[key];
        if (blockedAction) {
          e.preventDefault();
          reportProtectionEvent(blockedAction);
        }
      }
    };

    // Attach global listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Flush pending events when the tab is hidden/closed so short visits
    // still reach the log (keepalive keeps the request alive past unload).
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushQueue();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleVisibility);

    // Cleanup — also drop any timers/listeners owned by this effect
    return () => {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      document.body.classList.remove('protected-mode');
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleVisibility);
    };
  }, [pathname]);

  return null;
}
