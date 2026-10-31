'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import { springSmooth } from '@/lib/motion';

const loadFeatures = () => import('./features').then((mod) => mod.default);

/**
 * App-wide motion setup.
 * - LazyMotion + `m` components keep the initial JS small; features load
 *   after hydration. `strict` makes any accidental full `motion.*` import fail
 *   loudly in development.
 * - reducedMotion="user" honours `prefers-reduced-motion`: transforms and
 *   layout animations are skipped, opacity fades remain.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={springSmooth}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
