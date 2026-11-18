'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { X, Megaphone, ArrowRight } from 'lucide-react';
import type { AnnouncementRecord } from '@/lib/announcements';
import { AnimatePresence, Backdrop, DialogPanel } from '@/components/motion/primitives';

interface AnnouncementModalProps {
  announcement: AnnouncementRecord | null;
}

/**
 * Storage key generator. Incorporates both announcement ID and updatedAt timestamp so
 * updates made by administrators cause the new content to appear even if a prior version
 * was dismissed.
 */
export function getDismissalStorageKey(announcement: Pick<AnnouncementRecord, 'id' | 'updatedAt'>): string {
  const version = new Date(announcement.updatedAt).getTime() || announcement.updatedAt;
  return `el_announcement_${announcement.id}_${version}`;
}

const noopSubscribe = () => () => {};

export default function AnnouncementModal({ announcement }: AnnouncementModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const [userDismissed, setUserDismissed] = useState(false);

  const storageKey = announcement ? getDismissalStorageKey(announcement) : '';

  // Read dismissal state from client storage with useSyncExternalStore to avoid hydration mismatch
  const isPreviouslyDismissed = useSyncExternalStore(
    typeof window !== 'undefined'
      ? (cb) => {
          window.addEventListener('storage', cb);
          return () => window.removeEventListener('storage', cb);
        }
      : noopSubscribe,
    () => {
      if (!storageKey) return false;
      try {
        return window.localStorage.getItem(storageKey) === 'dismissed';
      } catch {
        return false;
      }
    },
    () => true // On server, don't show until hydrated on client
  );

  const isOpen = Boolean(announcement) && !isPreviouslyDismissed && !userDismissed;

  const handleDismiss = useCallback(() => {
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, 'dismissed');
      } catch {
        // Fallback silently if localStorage is restricted
      }
    }
    setUserDismissed(true);

    // Restore focus to previous element for accessibility
    setTimeout(() => {
      previouslyFocusedElement.current?.focus();
    }, 50);
  }, [storageKey]);

  // Handle Escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previouslyFocusedElement.current = document.activeElement;
    }

    const timer = setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 60);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleDismiss]);

  if (!announcement) {
    return null;
  }

  // Format message lines and paragraphs
  const paragraphs = announcement.message.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <AnimatePresence>
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
          aria-describedby="announcement-modal-message"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Subtle overlay backdrop */}
          <Backdrop
            onClick={handleDismiss}
            aria-hidden="true"
            className="fixed inset-0 bg-navy-dark/60 backdrop-blur-xs transition-opacity"
          />

          {/* Centered modal panel */}
          <DialogPanel
            ref={modalRef}
            className="relative w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-surface dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close announcement"
              className="absolute top-4 right-4 rounded-xl p-2 text-text-muted hover:text-navy dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Icon Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 dark:bg-accent/20 text-accent">
                <Megaphone className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent">Notice</span>
            </div>

            {/* Title */}
            <h2
              id="announcement-modal-title"
              className="text-xl sm:text-2xl font-black text-navy dark:text-white tracking-tight leading-snug"
            >
              {announcement.title}
            </h2>

            {/* Message Body */}
            <div
              id="announcement-modal-message"
              className="mt-4 space-y-3 text-sm sm:text-base text-text-secondary dark:text-zinc-300 leading-relaxed font-medium"
            >
              {paragraphs.map((p, idx) => {
                const trimmed = p.trim();
                const isSignOff =
                  trimmed.startsWith('—') ||
                  trimmed.startsWith('-') ||
                  trimmed.includes('Team Entertain Lawyers');

                if (isSignOff) {
                  return (
                    <p
                      key={idx}
                      className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 text-xs sm:text-sm font-bold text-navy dark:text-white"
                    >
                      {trimmed.replace(/\*\*/g, '')}
                    </p>
                  );
                }

                return (
                  <p key={idx} className="whitespace-pre-line">
                    {trimmed}
                  </p>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
              {announcement.linkUrl && announcement.linkText ? (
                <Link
                  href={announcement.linkUrl}
                  onClick={handleDismiss}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-5 py-2.5 text-sm font-bold text-navy dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span>{announcement.linkText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}

              <button
                ref={primaryButtonRef}
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                I Understand
              </button>
            </div>
          </DialogPanel>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
