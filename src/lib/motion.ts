import type { Transition, Variants } from 'motion/react';

/**
 * Shared motion language for the whole site. Every animated surface pulls its
 * timing from here so transitions stay consistent: short, spring-based and
 * subtle. Motion's <MotionConfig reducedMotion="user"> (see MotionProvider)
 * drops transform animations for visitors who ask for reduced motion, so
 * these presets never need their own reduced-motion branches.
 */

/** Snappy UI spring: buttons, menus, popovers, toggles. */
export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 };

/** Default spring for cards, panels and dialogs. */
export const springSmooth: Transition = { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 };

/** Opacity-only fades are not physical; keep them short and eased. */
export const fadeTransition: Transition = { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] };

/** Hover lift for interactive cards. */
export const cardHover = { y: -4, transition: springSnappy };
/** Press feedback for cards. */
export const cardTap = { scale: 0.985, transition: springSnappy };
/** Hover / press feedback for buttons and CTAs. */
export const buttonHover = { scale: 1.03, transition: springSnappy };
export const buttonTap = { scale: 0.96, transition: springSnappy };

/** Dropdowns, menus and popovers that hang from a trigger. */
export const popoverVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } },
  show: { opacity: 1, y: 0, scale: 1, transition: springSnappy },
};

/** Fly-out submenus that open to the side of their parent item. */
export const flyoutVariants: Variants = {
  hidden: { opacity: 0, x: -6, transition: { duration: 0.1 } },
  show: { opacity: 1, x: 0, transition: springSnappy },
};

/** Full-screen scrims behind dialogs and drawers. */
export const backdropVariants: Variants = {
  hidden: { opacity: 0, transition: fadeTransition },
  show: { opacity: 1, transition: fadeTransition },
};

/** Centered dialog panels. */
export const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.14 } },
  show: { opacity: 1, scale: 1, y: 0, transition: springSmooth },
};

/** Status messages, inline alerts and success states. */
export const alertVariants: Variants = {
  hidden: { opacity: 0, y: -4, height: 0 },
  show: { opacity: 1, y: 0, height: 'auto', transition: springSmooth },
};

/**
 * Stagger delay for an item in a list or grid. Wraps every few items so a
 * long list reveals row by row as it scrolls in instead of waiting on a
 * delay that grows with the list.
 */
export function staggerDelay(index: number, perRow = 4, step = 0.05): number {
  return (Math.max(0, index) % perRow) * step;
}
