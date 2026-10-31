import { describe, it, expect } from 'vitest';
import { staggerDelay, popoverVariants, dialogVariants } from '@/lib/motion';
import { hasClientNavigated, markClientNavigation } from '@/components/motion/navigation-state';

describe('staggerDelay', () => {
  it('staggers items within a row', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBeCloseTo(0.05);
    expect(staggerDelay(3)).toBeCloseTo(0.15);
  });

  it('wraps every row so long lists never wait on a growing delay', () => {
    expect(staggerDelay(4)).toBe(0);
    expect(staggerDelay(103, 3)).toBeCloseTo(staggerDelay(1, 3));
    for (let i = 0; i < 200; i++) expect(staggerDelay(i, 3)).toBeLessThan(0.15);
  });

  it('treats negative indexes as the first item', () => {
    expect(staggerDelay(-2)).toBe(0);
  });
});

describe('variants', () => {
  it('every enter variant ends fully visible and in place', () => {
    for (const v of [popoverVariants, dialogVariants]) {
      expect(v.show).toMatchObject({ opacity: 1 });
      expect(v.hidden).toMatchObject({ opacity: 0 });
    }
  });
});

describe('navigation-state', () => {
  it('starts false (first server-rendered load) and flips after a navigation', () => {
    expect(hasClientNavigated()).toBe(false);
    markClientNavigation();
    expect(hasClientNavigated()).toBe(true);
  });
});
