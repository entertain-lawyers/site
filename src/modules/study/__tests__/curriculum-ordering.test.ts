import { describe, it, expect } from 'vitest';
import {
  SYLLABUS_CONFIG,
  getAuthoritativeSemester,
  findAuthoritativeSubject,
  isAuthoritativeSubject,
  sortSubjectsByCurriculum,
  normalizeSubjectName,
} from '@/lib/syllabus-config';

describe('Authoritative Law Notes Curriculum & Ordering', () => {
  describe('Semester Chronology & Completeness', () => {
    it('contains exactly 10 semesters in chronological order (1 to 10)', () => {
      expect(SYLLABUS_CONFIG.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(SYLLABUS_CONFIG[i].order).toBe(i + 1);
      }
    });

    it('has expected total subject counts per semester matching the client syllabus', () => {
      const expectedCounts = [8, 8, 7, 7, 10, 10, 10, 10, 9, 4];
      const actualCounts = SYLLABUS_CONFIG.map((s) => s.subjects.length);
      expect(actualCounts).toEqual(expectedCounts);
      expect(actualCounts.reduce((a, b) => a + b, 0)).toBe(83);
    });
  });

  describe('Subject Ordering & Naming Fidelity', () => {
    it('verifies Semester 1 subjects match client order and exact names', () => {
      const sem1 = getAuthoritativeSemester(1);
      expect(sem1).toBeDefined();
      expect(sem1!.subjects.map((s) => s.name)).toEqual([
        'Legal Method',
        'Legal Nepali - I',
        'Alternative English (for Foreigners in Lieu of Legal Nepali)',
        'Legal English - I',
        'Political Theory',
        'Nepali History',
        'Sociology',
        'Economics - I',
      ]);
      // Verify orders are 1..8 sequentially
      sem1!.subjects.forEach((s, idx) => expect(s.order).toBe(idx + 1));
    });

    it('verifies Semester 2 subjects match client order and exact names', () => {
      const sem2 = getAuthoritativeSemester(2);
      expect(sem2).toBeDefined();
      expect(sem2!.subjects.map((s) => s.name)).toEqual([
        'Jurisprudence - I',
        'Legal Nepali - II',
        'Alternative English (for Foreigners in Lieu of Legal Nepali)',
        'Legal English - II',
        'Political Thoughts',
        'Global History',
        'Anthropology',
        'Economics - II',
      ]);
    });

    it('verifies Semester 3 subjects and Prescribed Cases metadata', () => {
      const sem3 = getAuthoritativeSemester(3);
      expect(sem3).toBeDefined();
      expect(sem3!.subjects.map((s) => s.name)).toEqual([
        'Jurisprudence - II',
        'Constitutional Law - I',
        'International Relations and Diplomacy',
        'Criminal Law - I',
        'Public International Law - I',
        'Property Law',
        'Comparative Law',
      ]);

      const criminalLaw = sem3!.subjects.find((s) => s.name === 'Criminal Law - I');
      expect(criminalLaw?.hasPrescribedCases).toBe(true);
      expect(criminalLaw?.unitEnd).toBe(7);

      const propertyLaw = sem3!.subjects.find((s) => s.name === 'Property Law');
      expect(propertyLaw?.hasPrescribedCases).toBe(true);
      expect(propertyLaw?.unitEnd).toBe(13);
    });

    it('verifies Semester 10 exact naming, especially Clinical Law-III (Placement) without space', () => {
      const sem10 = getAuthoritativeSemester(10);
      expect(sem10).toBeDefined();
      expect(sem10!.subjects.map((s) => s.name)).toEqual([
        'Clinical Law-III (Placement)',
        'Social Work and Social Welfare Law',
        'Professional Ethics and Lawyering Skills',
        'Dissertation',
      ]);
      // Explicit check on exact string
      expect(sem10!.subjects[0].name).toBe('Clinical Law-III (Placement)');
    });
  });

  describe('Legacy Subject Exclusion', () => {
    it('correctly identifies legacy subjects as not authoritative', () => {
      const legacySubjectsSem1 = ['English-I', 'Legal Methods', 'Political Science-I', 'Sub1'];
      for (const leg of legacySubjectsSem1) {
        expect(isAuthoritativeSubject(1, leg)).toBe(false);
      }

      const legacySubjectsSem2 = ['English-II', 'Introduction to Law and Legal System', 'Nepali', 'Political Science-II'];
      for (const leg of legacySubjectsSem2) {
        expect(isAuthoritativeSubject(2, leg)).toBe(false);
      }

      const legacySubjectsSem3 = ['Family Law-I', 'Law of Tort'];
      for (const leg of legacySubjectsSem3) {
        expect(isAuthoritativeSubject(3, leg)).toBe(false);
      }

      const legacySubjectsSem5 = ['Company Law', 'Labor Law', 'Law of Evidence'];
      for (const leg of legacySubjectsSem5) {
        expect(isAuthoritativeSubject(5, leg)).toBe(false);
      }
    });

    it('correctly identifies authoritative subjects across semesters', () => {
      expect(isAuthoritativeSubject(1, 'Legal Method')).toBe(true);
      expect(isAuthoritativeSubject(1, 'Economics - I')).toBe(true);
      expect(isAuthoritativeSubject(5, 'Securities Law')).toBe(true);
      expect(isAuthoritativeSubject(7, 'Clinical Law - I: Alternative Dispute Resolution')).toBe(true);
      expect(isAuthoritativeSubject(8, 'Clinical Law - II (Conveyancing)')).toBe(true);
      expect(isAuthoritativeSubject(10, 'Clinical Law-III (Placement)')).toBe(true);
    });
  });

  describe('Curriculum Sorting Utility', () => {
    it('sorts subjects by client-specified curriculum order, not alphabetically', () => {
      // Shuffled Semester 1 subjects
      const shuffled = [
        { name: 'Sociology' }, // order 7
        { name: 'Economics - I' }, // order 8
        { name: 'Alternative English (for Foreigners in Lieu of Legal Nepali)' }, // order 3
        { name: 'Legal Method' }, // order 1
        { name: 'Political Theory' }, // order 5
        { name: 'Legal Nepali - I' }, // order 2
        { name: 'Nepali History' }, // order 6
        { name: 'Legal English - I' }, // order 4
      ];

      const sorted = sortSubjectsByCurriculum(1, shuffled);
      expect(sorted.map((s) => s.name)).toEqual([
        'Legal Method',
        'Legal Nepali - I',
        'Alternative English (for Foreigners in Lieu of Legal Nepali)',
        'Legal English - I',
        'Political Theory',
        'Nepali History',
        'Sociology',
        'Economics - I',
      ]);
    });

    it('handles normalized variations cleanly while preserving order', () => {
      // In case DB has slight variations before sync, it matches and orders properly
      const subjectsWithVariations = [
        { name: 'Economics-I' }, // variant
        { name: 'Legal Method' },
      ];
      const sorted = sortSubjectsByCurriculum(1, subjectsWithVariations);
      expect(sorted[0].name).toBe('Legal Method');
      expect(sorted[1].name).toBe('Economics-I');
    });
  });

  describe('Canonical Semesters Filtering', () => {
    it('filters out non-canonical duplicate labels like "S1"', () => {
      const mockDbSemesters = [
        { id: '1', name: '1st Semester', order: 1 },
        { id: '2', name: 'S1', order: 1 },
        { id: '3', name: 'S1', order: 1 },
        { id: '4', name: '2nd Semester', order: 2 },
        { id: '5', name: '3rd Semester', order: 3 },
      ];

      const canonicalOnly = mockDbSemesters
        .filter((s) => s.name.toLowerCase().includes('semester'))
        .sort((a, b) => a.order - b.order);

      expect(canonicalOnly.length).toBe(3);
      expect(canonicalOnly.map((s) => s.name)).toEqual([
        '1st Semester',
        '2nd Semester',
        '3rd Semester',
      ]);
      expect(canonicalOnly.some((s) => s.name === 'S1')).toBe(false);
    });
  });
});
