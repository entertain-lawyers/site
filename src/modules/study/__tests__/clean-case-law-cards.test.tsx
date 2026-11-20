/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ResourceType, ContentStatus, Role } from '@prisma/client';
import { renderToStaticMarkup } from 'react-dom/server';

const { mockPrisma } = vi.hoisted(() => {
  const resource = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  };
  const user = { findUnique: vi.fn() };
  const subject = { findMany: vi.fn(), findUnique: vi.fn() };
  const unit = { findMany: vi.fn(), findUnique: vi.fn() };
  const semester = { findMany: vi.fn(), findUnique: vi.fn() };

  return {
    mockPrisma: {
      user,
      resource,
      subject,
      unit,
      semester,
      $transaction: vi.fn(async (fn: any) =>
        fn({ user, resource, subject, unit, semester })
      ),
    },
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('next/font/google', () => ({
  Roboto: () => ({ variable: 'font-roboto' }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: 'en' }),
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } }),
}));

vi.mock('@/lib/content-authors', () => ({
  resolveLocalAuthor: vi.fn().mockResolvedValue({ id: 'admin-1', name: 'Entertain Lawyers', role: Role.ADMIN }),
}));

vi.mock('@/modules/entitlements/entitlement.service', () => ({
  canAccessResource: vi.fn().mockResolvedValue(true),
  requiresSignIn: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/i18n', () => ({
  getLocale: vi.fn().mockResolvedValue('en'),
  getDictionary: vi.fn(async () => ({
    studyMaterialsTitle: 'Study Materials',
    catLawNotes: 'Law Notes',
    catCaseLaws: 'Precedent Case Laws',
    catOldQuestions: 'Old Questions',
    catHistoricalFacts: 'Historical Facts',
    semester: 'Semester',
    subject: 'Subject',
    unit: 'Unit',
    allSemesters: 'All Semesters',
    allSubjects: 'All Subjects',
    allUnits: 'All Units',
    selectSemesterFirst: 'Select Semester First',
    selectSubjectFirst: 'Select Subject First',
    noUnitsAvailable: 'No Units Available',
    free: 'Free',
    premium: 'Premium',
    readMore: 'Read More',
  })),
}));

import StudyPage from '@/app/study/page';
import { ResourcesList } from '@/app/resources/ResourcesList';

describe('Clean Case Law Cards Verification', () => {
  const SEMESTER_ID = 'sem-7';
  const SUBJECT_ID = 'sub-fiscal';
  const UNIT_ID = 'unit-cases';

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.semester.findMany.mockResolvedValue([
      {
        id: SEMESTER_ID,
        name: '7th Semester',
        order: 7,
        subjects: [{ id: SUBJECT_ID, name: 'Fiscal Law', order: 1, units: [{ id: UNIT_ID, name: 'Unit 1: Cases', order: 1 }] }],
      },
    ]);

    mockPrisma.subject.findMany.mockResolvedValue([
      { id: SUBJECT_ID, name: 'Fiscal Law', order: 1, semesterId: SEMESTER_ID },
    ]);

    mockPrisma.unit.findMany.mockResolvedValue([
      { id: UNIT_ID, name: 'Unit 1: Cases', order: 1, subjectId: SUBJECT_ID },
    ]);
  });

  describe('StudyPage (/study)', () => {
    it('does NOT render semester, subject, or unit details on Case Law cards, and displays "Read Case"', async () => {
      const caseLawItem = {
        id: 'case-writ-1',
        title: 'Landmark Tax Exemption Writ Precedent',
        type: ResourceType.CASE_LAW,
        metaTitle: 'WRIT:NEW_CASE',
        content: 'Summary of the tax exemption writ decision.',
        isPremium: false,
        priceAmount: null,
        currency: 'NPR',
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        unitId: UNIT_ID,
        documentId: null,
        document: null,
        order: 1,
        featuredImage: null,
        updatedAt: new Date(),
        semester: { id: SEMESTER_ID, name: '7th Semester' },
        subject: { id: SUBJECT_ID, name: 'Fiscal Law', semester: { id: SEMESTER_ID, name: '7th Semester' } },
        unit: { id: UNIT_ID, name: 'Prescribed Cases', title: null },
        author: null,
        createdBy: null,
      };

      mockPrisma.resource.findMany.mockResolvedValue([caseLawItem]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          type: 'CASE_LAW',
          q: 'writ',
        }),
      });

      const html = renderToStaticMarkup(page);

      // Card Title & Link should exist
      expect(html).toContain('Landmark Tax Exemption Writ Precedent');

      // Semester, Subject, and Unit details MUST NOT appear on the case card
      expect(html).not.toContain('7th Semester');
      expect(html).not.toContain('Fiscal Law');
      expect(html).not.toContain('Prescribed Cases');

      // Action button MUST display "Read Case", NOT "Read Note"
      expect(html).toContain('Read Case');
      expect(html).not.toContain('Read Note');
    });

    it('retains semester, subject, and unit details on standard Law Note cards and displays "Read Note"', async () => {
      const lawNoteItem = {
        id: 'note-fiscal-1',
        title: 'Comprehensive Value Added Tax Guide',
        type: ResourceType.LAW_NOTE,
        metaTitle: null,
        content: 'In-depth notes on VAT in Nepal.',
        isPremium: false,
        priceAmount: null,
        currency: 'NPR',
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        unitId: UNIT_ID,
        documentId: null,
        document: null,
        order: 1,
        featuredImage: null,
        updatedAt: new Date(),
        semester: { id: SEMESTER_ID, name: '7th Semester' },
        subject: { id: SUBJECT_ID, name: 'Fiscal Law', semester: { id: SEMESTER_ID, name: '7th Semester' } },
        unit: { id: UNIT_ID, name: 'Unit 1: Overview', title: null },
        author: null,
        createdBy: null,
      };

      mockPrisma.resource.findMany.mockResolvedValue([lawNoteItem]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          type: 'LAW_NOTE',
          semester: SEMESTER_ID,
          subject: SUBJECT_ID,
          q: 'VAT',
        }),
      });

      const html = renderToStaticMarkup(page);

      // Card Title should exist
      expect(html).toContain('Comprehensive Value Added Tax Guide');

      // Semester, Subject, and Unit details SHOULD appear on Law Note cards
      expect(html).toContain('7th Semester');
      expect(html).toContain('Fiscal Law');
      expect(html).toContain('Unit 1: Overview');

      // Action button MUST display "Read Note"
      expect(html).toContain('Read Note');
      expect(html).not.toContain('Read Case');
    });
  });

  describe('ResourcesList (/resources)', () => {
    it('does NOT render semester or subject details on Case Law cards, and displays "Read Case"', async () => {
      const caseLaw = {
        id: 'case-writ-2',
        title: 'Supreme Court Mandamus Ruling',
        type: ResourceType.CASE_LAW,
        metaTitle: 'WRIT:OLD_CASE',
        isPremium: false,
        priceAmount: null,
        semester: { name: '7th Semester' },
        subject: { name: 'Fiscal Law', semester: { name: '7th Semester' } },
        author: null,
        createdBy: null,
      };

      mockPrisma.resource.findMany.mockResolvedValue([caseLaw]);

      const html = renderToStaticMarkup(
        await ResourcesList({
          pageNumber: 1,
          dict: {
            subject: 'Subject',
            semester: 'Semester',
            premium: 'Premium',
            free: 'Free',
            readMore: 'Read More',
          } as any,
        })
      );

      // Title must be present
      expect(html).toContain('Supreme Court Mandamus Ruling');

      // Semester and Subject MUST NOT appear on Case Law cards
      expect(html).not.toContain('7th Semester');
      expect(html).not.toContain('Fiscal Law');

      // Action button must display "Read Case"
      expect(html).toContain('Read Case');
      expect(html).not.toContain('Read More');
    });

    it('renders semester and subject details on regular resource cards, and displays "Read More"', async () => {
      const lawNote = {
        id: 'note-fiscal-2',
        title: 'Taxation Procedures in Nepal',
        type: ResourceType.LAW_NOTE,
        metaTitle: null,
        isPremium: false,
        priceAmount: null,
        semester: { name: '7th Semester' },
        subject: { name: 'Fiscal Law', semester: { name: '7th Semester' } },
        author: null,
        createdBy: null,
      };

      mockPrisma.resource.findMany.mockResolvedValue([lawNote]);

      const html = renderToStaticMarkup(
        await ResourcesList({
          pageNumber: 1,
          dict: {
            subject: 'Subject',
            semester: 'Semester',
            premium: 'Premium',
            free: 'Free',
            readMore: 'Read More',
          } as any,
        })
      );

      // Title must be present
      expect(html).toContain('Taxation Procedures in Nepal');

      // Semester and Subject SHOULD appear
      expect(html).toContain('7th Semester');
      expect(html).toContain('Fiscal Law');

      // Action button displays "Read More"
      expect(html).toContain('Read More');
      expect(html).not.toContain('Read Case');
    });
  });
});
