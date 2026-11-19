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

const SEMESTER_ID = 'sem-4444';
const SUBJECT_ID = 'sub-family-law';
const PRESCRIBED_UNIT_ID = 'unit-prescribed-cases';
const UNRELATED_UNIT_ID = 'unit-unrelated-notes';

describe('Prescribed Cases Independent Verification Suite', () => {
  const mockCases = [
    {
      id: 'case-new-1',
      title: 'Rita Khadka v. Government of Nepal (2080)',
      type: ResourceType.CASE_LAW,
      status: 'PUBLISHED',
      isPremium: false,
      priceAmount: 0,
      currency: 'NPR',
      content: 'Commercial surrogacy contract ruling.',
      metaTitle: 'NEW_CASE:CIVIL',
      unitId: PRESCRIBED_UNIT_ID,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      author: null,
      createdBy: null,
    },
    {
      id: 'case-old-1',
      title: 'Annapurna v. State (2034) Partition Precedent',
      type: ResourceType.CASE_LAW,
      status: 'PUBLISHED',
      isPremium: false,
      priceAmount: 0,
      currency: 'NPR',
      content: 'Ancestral property coparcenary division.',
      metaTitle: 'OLD_CASE:CIVIL',
      unitId: PRESCRIBED_UNIT_ID,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      author: null,
      createdBy: null,
    },
    {
      id: 'case-legacy-unclassified',
      title: 'Historic Landmark Case 2028 (Unclassified)',
      type: ResourceType.CASE_LAW,
      status: 'PUBLISHED',
      isPremium: false,
      priceAmount: 0,
      currency: 'NPR',
      content: 'Historical precedent with no New or Old case tag.',
      metaTitle: null, // Legacy unclassified case!
      unitId: PRESCRIBED_UNIT_ID,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      author: null,
      createdBy: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.semester.findMany.mockResolvedValue([
      { id: SEMESTER_ID, name: '4th Semester', order: 4 },
    ]);
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: SUBJECT_ID, name: 'Family Law', order: 4, semesterId: SEMESTER_ID },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: PRESCRIBED_UNIT_ID, name: 'Prescribed Cases', title: 'Landmark Precedents', subjectId: SUBJECT_ID, order: 99 },
      { id: UNRELATED_UNIT_ID, name: 'Unit 1', title: 'Introductory Notes', subjectId: SUBJECT_ID, order: 1 },
    ]);
  });

  it('1. Confirms mandatory 2-card entry screen is removed and All Cases renders by default', async () => {
    mockPrisma.resource.findMany.mockResolvedValue(mockCases);

    const page = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
        unit: PRESCRIBED_UNIT_ID,
      }),
    });

    const html = renderToStaticMarkup(page);

    // Old 2-card navigation barrier is completely absent
    expect(html).not.toContain('Select Case Classification');
    expect(html).not.toContain('data-testid="prescribed-case-option-new"');
    expect(html).not.toContain('data-testid="prescribed-case-option-old"');

    // Acts & Laws style header and search are present
    expect(html).toContain('Prescribed Cases');
    expect(html).toContain('Landmark Precedents');
    expect(html).toContain('placeholder="Search case name, number, or summary..."');

    // All cases are visible by default, INCLUDING legacy unclassified
    expect(html).toContain('Rita Khadka v. Government of Nepal (2080)');
    expect(html).toContain('Annapurna v. State (2034) Partition Precedent');
    expect(html).toContain('Historic Landmark Case 2028 (Unclassified)');

    // Filter pill count shows All Cases (3)
    expect(html).toContain('All Cases (3)');
    expect(html).toContain('New Cases (1)');
    expect(html).toContain('Old Cases (1)');
  });

  it('2. Legacy unclassified cases remain visible in All Cases and are excluded from specific New/Old filters', async () => {
    mockPrisma.resource.findMany.mockResolvedValue(mockCases);

    // Filter New Cases
    const newPage = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
        unit: PRESCRIBED_UNIT_ID,
        caseCategory: 'NEW_CASE',
      }),
    });
    const newHtml = renderToStaticMarkup(newPage);

    expect(newHtml).toContain('Rita Khadka v. Government of Nepal (2080)');
    expect(newHtml).not.toContain('Historic Landmark Case 2028 (Unclassified)');
    expect(newHtml).not.toContain('Annapurna v. State (2034) Partition Precedent');

    // Filter Old Cases
    const oldPage = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
        unit: PRESCRIBED_UNIT_ID,
        caseCategory: 'OLD_CASE',
      }),
    });
    const oldHtml = renderToStaticMarkup(oldPage);

    expect(oldHtml).toContain('Annapurna v. State (2034) Partition Precedent');
    expect(oldHtml).not.toContain('Historic Landmark Case 2028 (Unclassified)');
    expect(oldHtml).not.toContain('Rita Khadka v. Government of Nepal (2080)');
  });

  it('3. Guarantees no resources from unrelated units or subjects leak into the Prescribed Cases view', async () => {
    const leakAttempt = [
      ...mockCases,
      {
        id: 'unrelated-law-note',
        title: 'Unrelated Law Note from Unit 1',
        type: ResourceType.LAW_NOTE,
        status: 'PUBLISHED',
        isPremium: false,
        priceAmount: 0,
        currency: 'NPR',
        content: 'Should not be in prescribed cases.',
        metaTitle: null,
        unitId: UNRELATED_UNIT_ID, // Different unit!
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        author: null,
        createdBy: null,
      },
    ];

    mockPrisma.resource.findMany.mockResolvedValue(leakAttempt);

    const page = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
        unit: PRESCRIBED_UNIT_ID,
      }),
    });

    const html = renderToStaticMarkup(page);

    // The unrelated law note MUST NOT be rendered inside Prescribed Cases
    expect(html).not.toContain('Unrelated Law Note from Unit 1');
  });
});
