import { describe, it, expect } from 'vitest';
import { searchMatches } from '@/lib/translit-search';
import { ResourceType } from '@prisma/client';

describe('Study Filter & Search Consistency', () => {
  describe('Resource Type Filters', () => {
    it('supports all canonical resource types', () => {
      const types = Object.values(ResourceType);
      expect(types).toContain('LAW_NOTE');
      expect(types).toContain('CASE_LAW');
      expect(types).toContain('OLD_QUESTION');
      expect(types).toContain('OTHER');
    });

    it('correctly maps search queries to resource titles across languages and formats', () => {
      const titles = [
        'Contract Law Case: Damodar Ropways and Construction Company v. Ministry of Finance, NKP (4th Semester new)',
        'BALLB 4th Semester  Old Questions Based on New Course/Syllabus',
        'Socio-Economic Crime: DhanKumari Sitaula V. Government of Nepal, NKP (6th semester)',
        'कानून तथा न्याय प्रणाली',
      ];

      // Exact case
      expect(searchMatches(titles[0], 'Damodar')).toBe(true);
      // Case insensitive
      expect(searchMatches(titles[0], 'damodar')).toBe(true);
      // Old questions
      expect(searchMatches(titles[1], 'Old Questions')).toBe(true);
      // Semester query
      expect(searchMatches(titles[1], '4th Semester')).toBe(true);
      // Transliterated / Devanagari query matching
      expect(searchMatches(titles[3], 'kanun')).toBe(true);
    });
  });

  describe('Curriculum Navigation & Search Consistency', () => {
    it('ensures old questions and subject case laws match expected patterns', () => {
      const oldQuestionTitle = 'BALLB 4th Semester Old Questions Based on New Course/Syllabus';
      const cleanTitle = oldQuestionTitle.toLowerCase().replace(/[-_]/g, ' ');

      expect(cleanTitle.includes('old question')).toBe(true);
      expect(cleanTitle.includes('4th sem') || cleanTitle.includes('4 semester')).toBe(true);

      const caseLawTitle = 'Contract Law Case: Sitaram Kedia vs. Ministry of Forests Babarmahal, NKP (4th Semester)';
      expect(caseLawTitle.toLowerCase().includes('contract law')).toBe(true);
    });
  });
});
