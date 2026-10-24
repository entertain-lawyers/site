import { describe, it, expect } from 'vitest';
import { expandQuery } from '../semantic';

describe('expandQuery', () => {
  it('maps everyday study words to the index vocabulary', () => {
    expect(expandQuery('past exam papers')).toBe('old question');
    expect(expandQuery('old questions')).toBe('old question');
    expect(expandQuery('law notes')).toBe('law note');
    expect(expandQuery('notes')).toBe('law note');
    expect(expandQuery('case laws')).toBe('case law');
  });

  it('maps pricing and team vocabulary', () => {
    expect(expandQuery('price of premium')).toBe('pricing of premium');
    expect(expandQuery('team members')).toBe('team');
    expect(expandQuery('researchers')).toBe('team');
  });

  it('drops question filler that never appears in titles', () => {
    expect(expandQuery('Who is Ram Babu Das?')).toBe('Ram Babu Das?');
    expect(expandQuery("Tell me about Sushma Acharya")).toBe('Sushma Acharya');
  });

  it('is safe on empty and already-expanded input', () => {
    expect(expandQuery('')).toBe('');
    expect(expandQuery('old question')).toBe('old question');
  });
});
