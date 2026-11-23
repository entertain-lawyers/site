/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceType } from '@prisma/client';
import { renderToStaticMarkup } from 'react-dom/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    semester: { findMany: vi.fn(), findUnique: vi.fn() },
    subject: { findMany: vi.fn(), findUnique: vi.fn() },
    unit: { findMany: vi.fn(), findUnique: vi.fn() },
    resource: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/study/materials',
  notFound: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('next/font/google', () => ({
  Roboto: () => ({ variable: 'font-roboto' }),
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'test-admin', role: 'ADMIN' } }),
}));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/modules/entitlements/entitlement.service', () => ({
  canAccessResource: vi.fn().mockResolvedValue(true),
  requiresSignIn: vi.fn().mockReturnValue(false),
}));
vi.mock('@/lib/i18n', () => ({
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
  })),
}));

import StudyPage from '@/app/study/page';

const SEMESTER_4_ID = 'sem-4444-4444';
const FAMILY_LAW_ID = 'sub-family-law-1111';
const UNIT_1_ID = 'unit-1-id';
const UNIT_2_MULTI_ID = 'unit-2-multi-id';
const UNIT_EMPTY_ID = 'unit-empty-id';
const PRESCRIBED_CASES_UNIT_ID = 'unit-prescribed-cases-id';

describe('Prescribed Cases & Direct Unit Navigation Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.semester.findMany.mockResolvedValue([
      { id: SEMESTER_4_ID, name: '4th Semester', order: 4 },
    ]);

    mockPrisma.subject.findMany.mockResolvedValue([
      { id: FAMILY_LAW_ID, name: 'Family Law', order: 4, semesterId: SEMESTER_4_ID },
    ]);

    mockPrisma.unit.findMany.mockResolvedValue([
      {
        id: UNIT_1_ID,
        name: 'Unit 1',
        title: 'Introduction to Family Law',
        subjectId: FAMILY_LAW_ID,
        order: 1,
      },
      {
        id: UNIT_2_MULTI_ID,
        name: 'Unit 2',
        title: 'Marriage & Divorce',
        subjectId: FAMILY_LAW_ID,
        order: 2,
      },
      {
        id: UNIT_EMPTY_ID,
        name: 'Unit 3',
        title: 'Adoption Law',
        subjectId: FAMILY_LAW_ID,
        order: 3,
      },
      {
        id: PRESCRIBED_CASES_UNIT_ID,
        name: 'Prescribed Cases',
        title: 'Landmark Precedents',
        subjectId: FAMILY_LAW_ID,
        order: 8,
      },
    ]);
  });

  describe('1. Direct Unit Navigation (Ordinary Units)', () => {
    it('directly renders unit content (UnitDirectContentView) when an ordinary unit is selected', async () => {
      // Mock 1 single note for Unit 1
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'res-note-1',
          title: 'Comprehensive Guide to Family Law Concept and Evolution',
          type: ResourceType.LAW_NOTE,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: '<p>Direct unit reading body: Marriage as a sacrament in Nepali legal jurisprudence.</p>',
          documentId: null,
          document: null,
          metaTitle: null,
          order: 1,
          featuredImage: null,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          unitId: UNIT_1_ID,
          author: { name: 'Prof. Sharma', image: null, bio: null, role: 'ADMIN' },
          createdBy: { name: 'Prof. Sharma', image: null, bio: null, role: 'ADMIN' },
        },
      ]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: UNIT_1_ID,
        }),
      });

      const html = renderToStaticMarkup(page);

      // Verify that the actual content rendered directly without an intermediate card listing page
      expect(html).toContain('Comprehensive Guide to Family Law Concept and Evolution');
      expect(html).toContain('Marriage as a sacrament in Nepali legal jurisprudence');
      expect(html).toContain('Unit 1');
      expect(html).toContain('Introduction to Family Law');
      expect(html).toContain('Prof. Sharma');
    });

    it('renders multiple resources directly in the unit view with switching tabs', async () => {
      // Mock 2 resources for Unit 2
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'res-note-2a',
          title: 'Part 1: Solemnization of Marriage under Civil Code 2074',
          type: ResourceType.LAW_NOTE,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: '<p>Conditions for valid marriage in Nepal.</p>',
          documentId: null,
          document: null,
          metaTitle: null,
          order: 1,
          featuredImage: null,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          unitId: UNIT_2_MULTI_ID,
          author: { name: 'Editorial Team', image: null, bio: null, role: 'ADMIN' },
          createdBy: { name: 'Editorial Team', image: null, bio: null, role: 'ADMIN' },
        },
        {
          id: 'res-note-2b',
          title: 'Part 2: Dissolution of Marriage & Alimony Procedures',
          type: ResourceType.LAW_NOTE,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: '<p>Grounds for divorce by husband and wife.</p>',
          documentId: null,
          document: null,
          metaTitle: null,
          order: 2,
          featuredImage: null,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          unitId: UNIT_2_MULTI_ID,
          author: { name: 'Editorial Team', image: null, bio: null, role: 'ADMIN' },
          createdBy: { name: 'Editorial Team', image: null, bio: null, role: 'ADMIN' },
        },
      ]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: UNIT_2_MULTI_ID,
        }),
      });

      const html = renderToStaticMarkup(page);

      // Verify both materials are surfaced directly in the unit view
      expect(html).toContain('Part 1: Solemnization of Marriage under Civil Code 2074');
      expect(html).toContain('Part 2: Dissolution of Marriage &amp; Alimony Procedures');
      expect(html).toContain('Unit 2');
      expect(html).toContain('Marriage &amp; Divorce');
    });

    it('renders clean empty state when an ordinary unit has no resources', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: UNIT_EMPTY_ID,
        }),
      });

      const html = renderToStaticMarkup(page);

      expect(html).toContain('No Notes Published for Unit 3');
      expect(html).toContain('Study materials and curriculum notes for Unit 3 are currently being compiled');
    });
  });

  describe('2. Prescribed Cases: Study → Semester → Subject → Prescribed Cases → New Case / Old Case', () => {
    it('displays all prescribed cases by default without requiring New Case or Old Case selection first', async () => {
      // Mock New Cases and Old Cases for Prescribed Cases unit
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'case-new-1',
          title: 'Rita Khadka v. Government of Nepal (2080) — Surrogacy Precedent',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: 'Supreme court ruling on commercial surrogacy.',
          metaTitle: 'NEW_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          author: null,
          createdBy: null,
        },
        {
          id: 'case-old-1',
          title: 'Annapurna v. State (2034) — Partition of Property & Inheritance Rights',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: 'Historic 5-judge full bench precedent.',
          metaTitle: 'OLD_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          author: null,
          createdBy: null,
        },
      ]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: PRESCRIBED_CASES_UNIT_ID,
          // No caseCategory provided!
        }),
      });

      const html = renderToStaticMarkup(page);

      // Verify that the redesign displays all applicable cases by default (no 2-card barrier)
      expect(html).not.toContain('Select Case Classification');
      expect(html).toContain('Prescribed Cases');
      expect(html).toContain('All Cases');
      expect(html).toContain('New Cases');
      expect(html).toContain('Old Cases');

      // Both New and Old cases are rendered immediately by default
      expect(html).toContain('Rita Khadka v. Government of Nepal');
      expect(html).toContain('Annapurna v. State');
      expect(html).toContain('data-case-category="NEW_CASE"');
      expect(html).toContain('data-case-category="OLD_CASE"');
    });

    it('renders ONLY New Cases when caseCategory=NEW_CASE is selected in URL', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'case-new-1',
          title: 'Rita Khadka v. Government of Nepal (2080) — Surrogacy Precedent',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: 'Supreme court ruling on commercial surrogacy.',
          metaTitle: 'NEW_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          author: null,
          createdBy: null,
        },
        {
          id: 'case-old-1',
          title: 'Annapurna v. State (2034) — Partition of Property & Inheritance Rights',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: 'Historic 5-judge full bench precedent.',
          metaTitle: 'OLD_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          author: null,
          createdBy: null,
        },
      ]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: PRESCRIBED_CASES_UNIT_ID,
          caseCategory: 'NEW_CASE',
        }),
      });

      const html = renderToStaticMarkup(page);

      // Verify New Case is rendered with its badge
      expect(html).toContain('Rita Khadka v. Government of Nepal');
      expect(html).toContain('data-case-category="NEW_CASE"');

      // Verify Old Case is NOT rendered
      expect(html).not.toContain('Annapurna v. State');
    });

    it('renders ONLY Old Cases when caseCategory=OLD_CASE is selected in URL', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'case-new-1',
          title: 'Rita Khadka v. Government of Nepal (2080) — Surrogacy Precedent',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: 'Supreme court ruling on commercial surrogacy.',
          metaTitle: 'NEW_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          author: null,
          createdBy: null,
        },
        {
          id: 'case-old-1',
          title: 'Annapurna v. State (2034) — Partition of Property & Inheritance Rights',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          priceAmount: 0,
          currency: 'NPR',
          content: 'Historic 5-judge full bench precedent.',
          metaTitle: 'OLD_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
          author: null,
          createdBy: null,
        },
      ]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: PRESCRIBED_CASES_UNIT_ID,
          caseCategory: 'OLD_CASE',
        }),
      });

      const html = renderToStaticMarkup(page);

      // Verify Old Case is rendered with its badge
      expect(html).toContain('Annapurna v. State');
      expect(html).toContain('data-case-category="OLD_CASE"');

      // Verify New Case is NOT rendered
      expect(html).not.toContain('Rita Khadka v. Government of Nepal');
    });

    it('preserves category on direct URL navigation and renders clean empty state when no cases exist in that category', async () => {
      // Mock only 1 new case in DB, zero old cases
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'case-new-1',
          title: 'Recent Judgment 2081',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          metaTitle: 'NEW_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
        },
      ]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: PRESCRIBED_CASES_UNIT_ID,
          caseCategory: 'OLD_CASE',
        }),
      });

      const html = renderToStaticMarkup(page);

      expect(html).toContain('No prescribed cases found');
      expect(html).toContain('There are no cases published in this category yet.');
      expect(html).toContain('Reset Filters');
    });

    it('ensures cases from another subject or semester never leak into the current results', async () => {
      // findMany should be called with filters scoping strictly to current semester, subject, and unit
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'case-valid',
          title: 'Valid Family Law Case',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          metaTitle: 'NEW_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
        },
      ]);

      await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: PRESCRIBED_CASES_UNIT_ID,
          caseCategory: 'NEW_CASE',
        }),
      });

      expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
            OR: [
              { semesterId: SEMESTER_4_ID },
              { subject: { semesterId: SEMESTER_4_ID } },
            ],
            subjectId: FAMILY_LAW_ID,
            unitId: PRESCRIBED_CASES_UNIT_ID,
          }),
        })
      );
    });

    it('preserves free and paid access indicators on case cards', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'case-free',
          title: 'Free Landmark Case',
          type: ResourceType.CASE_LAW,
          isPremium: false,
          metaTitle: 'NEW_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
        },
        {
          id: 'case-premium',
          title: 'Premium Precedent Analysis',
          type: ResourceType.CASE_LAW,
          isPremium: true,
          priceAmount: 49900,
          metaTitle: 'NEW_CASE',
          unitId: PRESCRIBED_CASES_UNIT_ID,
          semesterId: SEMESTER_4_ID,
          subjectId: FAMILY_LAW_ID,
        },
      ]);

      const page = await StudyPage({
        searchParams: Promise.resolve({
          semester: SEMESTER_4_ID,
          subject: FAMILY_LAW_ID,
          unit: PRESCRIBED_CASES_UNIT_ID,
          caseCategory: 'NEW_CASE',
        }),
      });

      const html = renderToStaticMarkup(page);

      expect(html).toContain('Free');
      expect(html).toContain('Premium');
      expect(html).toContain('499');
    });
  });
});

