import { describe, it, expect } from 'vitest';
import { typingChunks, sseEvent } from '../stream';

describe('typingChunks', () => {
  it('reassembles the original reply exactly', () => {
    const text = 'Ram Babu Das is our Head of Website.\n\nHe teaches criminal law.';
    const chunks = typingChunks(text);
    expect(chunks.map((c) => c.text).join('')).toBe(text);
    expect(chunks[0].delayMs).toBe(0);
  });

  it('returns nothing for an empty reply', () => {
    expect(typingChunks('   \n ')).toEqual([]);
  });

  it('keeps long replies inside the typing budget', () => {
    const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
    const chunks = typingChunks(text, { maxDurationMs: 1200 });
    const total = chunks.reduce((sum, chunk) => sum + chunk.delayMs, 0);
    expect(chunks.length).toBeLessThanOrEqual(60);
    expect(total).toBeLessThanOrEqual(1200);
    expect(chunks.map((c) => c.text).join('')).toBe(text);
  });

  it('streams very short replies in one frame', () => {
    expect(typingChunks('Yes.')).toHaveLength(1);
  });
});

describe('sseEvent', () => {
  it('formats a server-sent event frame', () => {
    expect(sseEvent('delta', { text: 'hi' })).toBe('event: delta\ndata: {"text":"hi"}\n\n');
  });
});
