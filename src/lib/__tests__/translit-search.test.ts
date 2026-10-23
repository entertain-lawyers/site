import { describe, it, expect } from 'vitest';
import { romanize, searchMatches, searchScore } from '../translit-search';

/**
 * Global search relevance + transliteration. The matcher is deliberately
 * strict: a result must share a real word with the query, in either script.
 * These tests pin both directions of the roman ↔ Devanagari bridge and the
 * "no junk" cases that motivated the rewrite.
 */
describe('transliteration-aware search matching', () => {
  describe('roman ↔ Devanagari', () => {
    it('matches a Devanagari title from a Roman query', () => {
      expect(searchMatches('अदालती दस्तुर', 'adalati dastur')).toBe(true);
      expect(searchMatches('सम्झौता कानून', 'samjhauta')).toBe(true);
      expect(searchMatches('मानवअधिकारको उल्लङ्घन', 'manabadhikar')).toBe(true);
    });

    it('matches a Latin title from a Devanagari query', () => {
      expect(searchMatches('Contract Law Case: Sitaram Kedia', 'कन्ट्रयाक्ट')).toBe(true);
      expect(searchMatches('Court Fee Structure', 'कोर्ट')).toBe(true);
    });

    it('folds common romanization variants (c/q→k, v→b, au→o)', () => {
      expect(searchMatches('Court Fee Structure', 'kort fee')).toBe(true);
      expect(searchMatches('सम्झौता कानून', 'samjhota')).toBe(true);
      expect(searchMatches('विवाह सम्बन्धी कानून', 'bibaha')).toBe(true);
    });
  });

  describe('word forms', () => {
    it('folds plurals and a dropped final "a"', () => {
      expect(searchMatches('Company Law Case: X', 'companies')).toBe(true);
      expect(searchMatches('Contract Law Case: X', 'contracts')).toBe(true);
      expect(searchMatches('सम्झौता कानून', 'samjhaut')).toBe(true);
    });

    it('matches while the user is still typing a word', () => {
      expect(searchMatches('अदालती दस्तुर', 'adala')).toBe(true);
    });

    it('matches spaced queries against a compounded (sandhi) title word', () => {
      expect(searchMatches('मृत्युदण्ड: न्याय कि मानवअधिकारको उल्लङ्घन ?', 'मानव अधिकार')).toBe(true);
    });
  });

  describe('no junk results', () => {
    const unrelated = [
      'यौन दुर्व्यवहार केवल शारीरिक स्पर्श मात्र होइन, अपशब्द प्रयोग गर्नु पनि यौन दुर्व्यवहार अन्तर्गत पर्न सक्छ',
      'तिमी बलत्कारीलाई फाँसीको सजाएको माग गरी, किन ताक्छौ आफ्नै चेलीबेटी माथि',
      'थाहा के हो थाहा छ?',
      'सरकार फेरियो, तर देशको अवस्था फेरिएन -आरती साह',
    ];

    it('does not match long unrelated Devanagari titles', () => {
      for (const title of unrelated) {
        expect(searchMatches(title, 'contract')).toBe(false);
        expect(searchMatches(title, 'company registration')).toBe(false);
      }
    });

    it('rejects near-misses that only share a consonant skeleton', () => {
      expect(searchMatches('Gunraj Upadhyaya vs Shyam Shamsher', 'shram')).toBe(false);
      expect(searchMatches('Shivnath Shah Kanu v. Vishwanath Shah Kanu', 'kanun')).toBe(false);
    });

    it('requires whole words, not mid-word substrings', () => {
      expect(searchMatches('First thing PNC taught me', 'fir')).toBe(false);
      expect(searchMatches('The Right to Protest', 'rig')).toBe(false);
    });

    it('returns 0 for empty input', () => {
      expect(searchScore('', 'contract')).toBe(0);
      expect(searchScore('Contract Law', '')).toBe(0);
    });
  });

  describe('romanize', () => {
    it('normalizes Devanagari to a comparable roman key', () => {
      expect(romanize('मानव अधिकार')).toBe('manaba adhikara');
      expect(romanize('कानून')).toBe('kanuna');
    });

    it('folds Latin loanword spellings like their Devanagari forms', () => {
      expect(searchMatches('Court Fee Structure', 'कोर्ट')).toBe(true);
      expect(searchMatches('विवाह सम्बन्धी कानून', 'bibaha')).toBe(true);
    });
  });
});
