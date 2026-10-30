import { describe, expect, it } from 'vitest';
import { slugify, slugifyWithFallback } from '@/lib/slug';

describe('slugify', () => {
  it('keeps the existing behaviour for plain English names', () => {
    expect(slugify('Ram Babu Das')).toBe('ram-babu-das');
    expect(slugify('  --Adv. Hari  K.C.-- ')).toBe('adv-hari-k-c');
  });

  it('romanizes Devanagari names instead of dropping them', () => {
    expect(slugify('राम बहादुर')).toBe('ram-bahadur');
    expect(slugify('श्री कृष्ण')).toBe('shri-krishn');
    expect(slugify('अधिवक्ता सीता')).toBe('adhivakta-sita');
  });

  it('handles mixed scripts and Devanagari digits as separators', () => {
    expect(slugify('Adv. राम ।')).toBe('adv-ram');
  });

  it('folds Latin accents', () => {
    expect(slugify('José Ñúñez')).toBe('jose-nunez');
  });

  it('returns an empty string when nothing can be romanized', () => {
    expect(slugify('李小龙')).toBe('');
    expect(slugify('!!!')).toBe('');
  });

  it('bounds the length without leaving a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('only ever produces [a-z0-9-]', () => {
    for (const input of ['राम बहादुर थापा', 'José', 'O\'Brien & Co', 'ज़मीन']) {
      expect(slugify(input)).toMatch(/^[a-z0-9-]*$/);
    }
  });
});

describe('slugifyWithFallback', () => {
  it('falls back to a prefixed random slug', () => {
    expect(slugifyWithFallback('李小龙', 'advocate')).toMatch(/^advocate-[0-9a-f]{6}$/);
    expect(slugifyWithFallback('Ram', 'advocate')).toBe('ram');
  });
});
