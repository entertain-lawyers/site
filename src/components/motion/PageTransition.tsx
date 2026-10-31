'use client';

import { useEffect, useState } from 'react';
import { m } from 'motion/react';
import { hasClientNavigated, markClientNavigation } from './navigation-state';

/**
 * Fades the incoming page in on client-side navigation (used by the route
 * templates, which remount on every navigation).
 *
 * - The first server-rendered page is shown immediately (no LCP cost).
 * - Opacity only: a transform here would turn this wrapper into the
 *   containing block for every `position: fixed` descendant (dialogs,
 *   sticky toolbars) for the duration of the animation.
 */
export default function PageTransition({
  children,
  className = 'flex flex-col flex-grow min-w-0',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Read once per mount: false on the server and on the first hydration, so
  // the markup always matches.
  const [animateIn] = useState(hasClientNavigated);

  useEffect(() => {
    markClientNavigation();
  }, []);

  return (
    <m.div
      className={className}
      initial={animateIn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </m.div>
  );
}
