'use client';

import { useLayoutEffect, useRef } from 'react';
import { AnimatePresence, m, type HTMLMotionProps } from 'motion/react';
import {
  alertVariants,
  backdropVariants,
  buttonHover,
  buttonTap,
  cardHover,
  cardTap,
  dialogVariants,
  flyoutVariants,
  popoverVariants,
  staggerDelay,
} from '@/lib/motion';
import { hasClientNavigated } from './navigation-state';

export { AnimatePresence, m };

type RevealTag = 'div' | 'section' | 'article' | 'li' | 'header' | 'aside';

type RevealProps = {
  as?: RevealTag;
  className?: string;
  children?: React.ReactNode;
  /** Seconds to wait once in view. */
  delay?: number;
  /** Position in a list/grid; turned into a wrapped stagger delay. */
  index?: number;
  /** Items per row used to wrap the stagger (defaults to 4). */
  perRow?: number;
  /** Adds the shared hover-lift / press feedback for interactive cards. */
  lift?: boolean;
  id?: string;
  style?: React.CSSProperties;
};

const REVEAL_OFFSET = '0 18px';
// A soft ease-out with no overshoot, matching the feel of the UI springs.
const REVEAL_TIMING = { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

/**
 * Fades and lifts its content into place when it scrolls into view.
 *
 * Server HTML is always fully visible: no blank sections without JavaScript,
 * for crawlers, in print, or while a slow phone is still hydrating. On the
 * client, only content that starts below the fold (or any content after a
 * client-side navigation) is hidden — before paint — and then revealed.
 *
 * The reveal runs on the native Web Animations API and the CSS `translate`
 * property: it works before Motion's lazily loaded features arrive, and it
 * never fights the `transform` that Motion's hover lift writes.
 */
export function Reveal({ as = 'div', className, children, delay, index, perRow, lift, id, style }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const resolvedDelay = delay ?? (index !== undefined ? staggerDelay(index, perRow) : 0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const belowFold = el.getBoundingClientRect().top > window.innerHeight * 0.92;
    if (!belowFold && !hasClientNavigated()) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.style.opacity = '0';
    if (!reduce) el.style.translate = REVEAL_OFFSET;

    const reveal = () => {
      const keyframes: Keyframe[] = reduce
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, translate: REVEAL_OFFSET }, { opacity: 1, translate: '0 0' }];
      const animation = el.animate(keyframes, {
        ...REVEAL_TIMING,
        duration: reduce ? 200 : REVEAL_TIMING.duration,
        delay: resolvedDelay * 1000,
        fill: 'backwards',
      });
      el.style.opacity = '';
      el.style.translate = '';
      return animation;
    };

    let animation: Animation | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          animation = reveal();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      animation?.cancel();
      el.style.opacity = '';
      el.style.translate = '';
    };
    // Runs once per mount; the delay is fixed for an element's position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (lift) {
    const Tag = m[as] as typeof m.div;
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        data-reveal=""
        id={id}
        style={style}
        className={className}
        whileHover={cardHover}
        whileTap={cardTap}
      >
        {children}
      </Tag>
    );
  }

  const Tag = as as 'div';
  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} data-reveal="" id={id} style={style} className={className}>
      {children}
    </Tag>
  );
}

/** Interactive card wrapper: hover lift + press feedback, no reveal. */
export function Lift({ className, children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <m.div className={className} whileHover={cardHover} whileTap={cardTap} {...rest}>
      {children}
    </m.div>
  );
}

/**
 * Inline wrapper that gives any button or link (including next/link) the
 * shared press feedback. Use on the element's parent so the child keeps its
 * own semantics and styles.
 */
export function Press({
  className = 'inline-flex',
  children,
  hover = true,
  ...rest
}: HTMLMotionProps<'span'> & { hover?: boolean }) {
  return (
    <m.span className={className} whileHover={hover ? buttonHover : undefined} whileTap={buttonTap} {...rest}>
      {children}
    </m.span>
  );
}

/** <button> with the shared hover / press feedback. */
export function MotionButton({ children, ...rest }: HTMLMotionProps<'button'>) {
  return (
    <m.button whileHover={rest.disabled ? undefined : buttonHover} whileTap={rest.disabled ? undefined : buttonTap} {...rest}>
      {children}
    </m.button>
  );
}

const collapseTransition = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const };

/**
 * Height-animated disclosure panel. It stays mounted (and `inert` while
 * closed) so collapsed answers remain in the HTML for search engines and
 * keep their scroll/selection state.
 */
export function Collapse({
  open,
  children,
  className,
  ...rest
}: { open: boolean; children: React.ReactNode; className?: string } & Omit<HTMLMotionProps<'div'>, 'animate' | 'initial'>) {
  return (
    <m.div
      initial={false}
      animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
      transition={collapseTransition}
      style={{ overflow: 'hidden' }}
      inert={!open}
      className={className}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/** Dropdown / popover panel. Render inside <AnimatePresence>. */
export function PopoverPanel({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <m.div variants={popoverVariants} initial="hidden" animate="show" exit="hidden" style={{ transformOrigin: 'top' }} {...rest}>
      {children}
    </m.div>
  );
}

/** Side fly-out submenu panel. Render inside <AnimatePresence>. */
export function FlyoutPanel({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <m.div variants={flyoutVariants} initial="hidden" animate="show" exit="hidden" {...rest}>
      {children}
    </m.div>
  );
}

/** Scrim behind a dialog or drawer. Render inside <AnimatePresence>. */
export function Backdrop({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <m.div variants={backdropVariants} initial="hidden" animate="show" exit="hidden" {...rest}>
      {children}
    </m.div>
  );
}

/** Centered dialog panel. Render inside <AnimatePresence>. */
export function DialogPanel({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <m.div variants={dialogVariants} initial="hidden" animate="show" exit="hidden" {...rest}>
      {children}
    </m.div>
  );
}

/**
 * Inline alert / banner that expands into place and collapses away, so the
 * content below slides instead of jumping. Render inside <AnimatePresence>.
 */
export function Appear({ children, style, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <m.div
      variants={alertVariants}
      initial="hidden"
      animate="show"
      exit="hidden"
      style={{ overflow: 'hidden', ...style }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/**
 * Swaps between children keyed by `id` with a quick cross-fade — for icon
 * toggles (menu ⇄ close) and small state changes (idle ⇄ loading ⇄ done).
 */
export function SwapFade({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span
        key={id}
        className={className}
        initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      >
        {children}
      </m.span>
    </AnimatePresence>
  );
}
