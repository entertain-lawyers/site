import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LazyMotion, domAnimation } from 'motion/react';
import Reactions from '../Reactions';

describe('Reactions component under LazyMotion strict mode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        counts: { happy: 0, laugh: 0, love: 0, shock: 0, sad: 0, angry: 0 },
        userReaction: null,
      }),
    }));
  });

  it('renders without throwing strict motion error inside LazyMotion', () => {
    expect(() => {
      renderToStaticMarkup(
        <LazyMotion features={domAnimation} strict>
          <Reactions postId="post-123" />
        </LazyMotion>
      );
    }).not.toThrow();
  });

  it('contains reaction buttons and labels', () => {
    const html = renderToStaticMarkup(
      <LazyMotion features={domAnimation} strict>
        <Reactions postId="post-123" />
      </LazyMotion>
    );

    expect(html).toContain('How did this make you feel?');
    expect(html).toContain('React with Happy');
    expect(html).toContain('React with Funny');
  });
});
