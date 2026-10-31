"use client";

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { articleFont } from './article-font';
import { sanitizeHtml } from '@/lib/sanitize';
import { AnimatePresence, Backdrop, m } from '@/components/motion/primitives';
import { springSmooth } from '@/lib/motion';

/**
 * Article body renderer.
 *
 * Legal posts frequently embed scans of court notices and orders as images.
 * Clicking any inline image opens it full-screen so readers can actually read
 * the document; linked images keep their normal link behaviour. The rest of
 * the body stays server-rendered HTML with the old-site reading typography.
 */
export default function ArticleBody({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName !== 'IMG') return;
      const img = target as HTMLImageElement;
      if (img.closest('a')) return;
      event.preventDefault();
      setZoomSrc(img.currentSrc || img.src);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (!zoomSrc) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomSrc(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [zoomSrc]);

  return (
    <>
      <div
        ref={containerRef}
        id="article-body"
        className={`article-body article-body--reading mt-7 ${articleFont.variable}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />

      <AnimatePresence>
      {zoomSrc && (
        <Backdrop
          key="article-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged article image"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-dark/95 p-4"
          onClick={() => setZoomSrc(null)}
        >
          <button
            type="button"
            autoFocus
            onClick={() => setZoomSrc(null)}
            aria-label="Close enlarged image"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          {/* Swipe the image up or down to dismiss it on touch screens. */}
          <m.img
            src={zoomSrc}
            alt=""
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={springSmooth}
            drag="y"
            dragSnapToOrigin
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 700) setZoomSrc(null);
            }}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl cursor-grab active:cursor-grabbing"
          />
        </Backdrop>
      )}
      </AnimatePresence>
    </>
  );
}
