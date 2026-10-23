"use client";

import { useEffect, useState } from 'react';

/**
 * Thin gold reading-progress line pinned to the top of the viewport.
 * Tracks the article element so the bar reflects how much of the story is
 * left, not the whole page (footer/sidebar don't count). Purely decorative:
 * hidden from assistive tech and disabled for reduced-motion users.
 */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const start = window.scrollY + rect.top;
      const range = target.offsetHeight - window.innerHeight;
      // Short stories fit on one screen — a progress bar adds nothing.
      if (range < 200) {
        setProgress(0);
        return;
      }
      const scrolled = window.scrollY - start;
      setProgress(Math.min(100, Math.max(0, (scrolled / range) * 100)));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] motion-reduce:hidden"
    >
      <div
        className="h-full bg-gold shadow-[0_0_8px_rgba(201,162,39,0.55)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
