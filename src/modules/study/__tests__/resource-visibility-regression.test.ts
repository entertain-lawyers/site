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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('next/font/google', () => ({
  Roboto: () => ({ variable: 'font-roboto' }),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
}));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/modules/entitlements/entitlement.service', () => ({
  canAccessResource: vi.fn().mockResolvedValue(true),
  requiresSignIn: vi.fn().mockReturnValue(false),
  getAccessibleResourceIds: vi.fn(async (_uid: string | undefined, list: Array<{ id: string }>) => new Set(list.map((r) => r.id))),
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
import { encodeCaseClassification, parseCaseLawCategory, getCaseLawCategory } from '@/lib/case-category';

const SEMESTER_ID = 'sem-1111';
const SUBJECT_ID = 'sub-constitutional-law';
const UNIT_ID = 'unit-fundamental-rights';

describe('Resource Visibility Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.semester.findMany.mockResolvedValue([
      { id: SEMESTER_ID, name: '1st Semester', order: 1 },
    ]);
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: SUBJECT_ID, name: 'Constitutional Law', order: 1, semesterId: SEMESTER_ID },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: UNIT_ID, name: 'Unit 1', title: 'Fundamental Rights', subjectId: SUBJECT_ID, order: 1 },
    ]);
  });

  it('renders subject-level resources (unitId: null) when browsing a subject without a unit selected', async () => {
    // Regression check for Part 4 Bug: Previously, (!selectedUnitId && !searchQuery) hid all resources
    mockPrisma.resource.findMany.mockResolvedValue([
      {
        id: 'note-subject-level-1',
        title: 'Complete Constitutional Law Comprehensive Reference Note',
        type: ResourceType.LAW_NOTE,
        isPremium: false,
        priceAmount: 0,
        currency: 'NPR',
        content: 'Full semester syllabus notes covering all topics.',
        metaTitle: null,
        unitId: null, // Subject-level resource!
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        author: null,
        createdBy: null,
      },
    ]);

    const page = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
        // Notice: NO unit is selected!
      }),
    });

    const html = renderToStaticMarkup(page);

    // The subject-level resource MUST be visible now
    expect(html).toContain('Complete Constitutional Law Comprehensive Reference Note');
    expect(html).toContain('Law Notes');
  });

  it('renders Old Questions with target="_blank" and rel="noopener noreferrer"', async () => {
    // Regression check for Part 1: Old Questions must open in new tab
    mockPrisma.resource.findMany.mockResolvedValue([
      {
        id: 'old-q-1',
        title: 'Constitutional Law 2079 Board Exam Question Paper',
        type: ResourceType.OLD_QUESTION,
        isPremium: false,
        priceAmount: 0,
        currency: 'NPR',
        content: null,
        metaTitle: null,
        unitId: null,
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        author: null,
        createdBy: null,
      },
    ]);

    const page = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
      }),
    });

    const html = renderToStaticMarkup(page);

    expect(html).toContain('Constitutional Law 2079 Board Exam Question Paper');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('correctly discovers Case Laws by CaseLawCategory classification regardless of title keywords', async () => {
    // Regression check for Part 2 & Part 4:
    // A case categorized as CIVIL whose title does NOT include the word "civil"
    // must be discoverable when filtering for Civil Cases (caseLaw=civil or search "civil")
    const encodedMeta = encodeCaseClassification({ caseLawCategory: 'CIVIL', caseCategory: 'NEW_CASE' });

    mockPrisma.resource.findMany.mockResolvedValue([
      {
        id: 'case-landmark-1',
        title: 'Landmark Surrogacy & Reproductive Autonomy Precedent (2080)',
        type: ResourceType.CASE_LAW,
        isPremium: false,
        priceAmount: 0,
        currency: 'NPR',
        content: 'Full bench judgment on contract enforceability.',
        metaTitle: encodedMeta,
        unitId: null,
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        author: null,
        createdBy: null,
      },
    ]);

    // Querying with search q="civil" (or caseLaw landing redirect)
    const page = await StudyPage({
      searchParams: Promise.resolve({
        type: 'CASE_LAW',
        q: 'civil',
      }),
    });

    const html = renderToStaticMarkup(page);

    expect(html).toContain('Landmark Surrogacy &amp; Reproductive Autonomy Precedent (2080)');
    expect(html).toContain('data-case-law-category="CIVIL"');
  });

  it('correctly encodes and parses composite case classifications without schema migrations', () => {
    // Regression check for Part 2 and Part 3:
    // Storing caseLawCategory (CIVIL, CRIMINAL, WRIT) and caseCategory (NEW_CASE, OLD_CASE)
    const compositeMeta = encodeCaseClassification({ caseLawCategory: 'WRIT', caseCategory: 'NEW_CASE' });
    expect(compositeMeta).toBe('WRIT:NEW_CASE');

    expect(parseCaseLawCategory(compositeMeta)).toBe('WRIT');

    const resourceObj = { metaTitle: compositeMeta };
    expect(getCaseLawCategory(resourceObj)).toBe('WRIT');

    // Legacy format compatibility: plain 'NEW_CASE' or 'CIVIL'
    expect(getCaseLawCategory({ metaTitle: 'CIVIL' })).toBe('CIVIL');
    expect(getCaseLawCategory({ metaTitle: 'NEW_CASE' })).toBeNull();
  });
});
