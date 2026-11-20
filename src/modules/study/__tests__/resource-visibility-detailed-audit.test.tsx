/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceType, ContentStatus } from '@prisma/client';
import { renderToStaticMarkup } from 'react-dom/server';

const { mockPrisma, revalidatePathMock, revalidateTagMock } = vi.hoisted(() => {
  const resource = { findMany: vi.fn(), findUnique: vi.fn() };
  const subject = { findMany: vi.fn(), findUnique: vi.fn() };
  const unit = { findMany: vi.fn(), findUnique: vi.fn() };
  const semester = { findMany: vi.fn(), findUnique: vi.fn() };
  return {
    mockPrisma: { resource, subject, unit, semester },
    revalidatePathMock: vi.fn(),
    revalidateTagMock: vi.fn(),
  };
});

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
  auth: vi.fn().mockResolvedValue({ user: { id: 'test-user', role: 'ADMIN' } }),
}));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
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
    subjects: 'Subjects',
    unitsAndResources: 'Units and Resources',
    backToSemesters: 'Back to Semesters',
    study: 'Study',
    noResourcesFound: 'No resources found',
  })),
}));

import StudyPage from '@/app/study/page';
import SemesterPage from '@/app/semesters/[id]/page';

const SEMESTER_4_ID = 'sem-4444';
const SEMESTER_10_ID = 'sem-1010';

const SUB_PROC_I_ID = 'sub-procedural-law-1';
const SUB_PROC_II_ID = 'sub-procedural-law-2';

describe('Resource Visibility Detailed Audit & Cross-Navigation Parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.subject.findMany.mockReset();
    mockPrisma.unit.findMany.mockReset();
    mockPrisma.resource.findMany.mockReset();

    mockPrisma.semester.findMany.mockResolvedValue([
      { id: SEMESTER_4_ID, name: '4th Semester', order: 4 },
      { id: SEMESTER_10_ID, name: '10th Semester', order: 10 },
    ]);
  });

  it('1. Prevents incorrect matching between similarly named subjects (Procedural Law I vs II)', async () => {
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: SUB_PROC_I_ID, name: 'Procedural Law - I', order: 1, semesterId: SEMESTER_4_ID },
      { id: SUB_PROC_II_ID, name: 'Procedural Law - II', order: 2, semesterId: SEMESTER_4_ID },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([]);

    // Resource belongs strictly to Procedural Law - I
    mockPrisma.resource.findMany.mockResolvedValue([
      {
        id: 'proc-1-note',
        title: 'Civil Court Pleadings and Jurisdiction Note (Procedural I)',
        type: ResourceType.LAW_NOTE,
        status: ContentStatus.PUBLISHED,
        isPremium: false,
        priceAmount: 0,
        currency: 'NPR',
        content: 'Procedural Law I syllabus content.',
        metaTitle: null,
        unitId: null,
        semesterId: SEMESTER_4_ID,
        subjectId: SUB_PROC_I_ID,
        author: null,
        createdBy: null,
      },
    ]);

    // Query Study with subject = Procedural Law - I
    const pageI = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_4_ID,
        subject: SUB_PROC_I_ID,
      }),
    });
    const htmlI = renderToStaticMarkup(pageI);
    expect(htmlI).toContain('Civil Court Pleadings and Jurisdiction Note (Procedural I)');

    // Query Study with subject = Procedural Law - II
    mockPrisma.resource.findMany.mockResolvedValue([]);
    const pageII = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_4_ID,
        subject: SUB_PROC_II_ID,
      }),
    });
    const htmlII = renderToStaticMarkup(pageII);
    expect(htmlII).not.toContain('Civil Court Pleadings and Jurisdiction Note (Procedural I)');
    expect(htmlII).toContain('No resources found');
  });

  it('2. Compares Browse Semester (/semesters/[id]) and Study (/study) for subject-level resources', async () => {
    const subjectNote = {
      id: 'family-law-overview',
      title: 'Family Law Complete Comprehensive Curriculum Guide',
      type: ResourceType.LAW_NOTE,
      status: ContentStatus.PUBLISHED,
      isPremium: false,
      priceAmount: 0,
      currency: 'NPR',
      content: 'Complete subject syllabus guide.',
      metaTitle: null,
      unitId: null, // Subject-level resource!
      semesterId: SEMESTER_4_ID,
      subjectId: 'sub-family',
      author: null,
      createdBy: null,
    };

    // 1. Study Page: /study?semester=sem-4444&subject=sub-family
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: 'sub-family', name: 'Family Law', order: 4, semesterId: SEMESTER_4_ID },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([]);
    mockPrisma.resource.findMany.mockResolvedValue([subjectNote]);

    const studyPage = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_4_ID,
        subject: 'sub-family',
      }),
    });
    const studyHtml = renderToStaticMarkup(studyPage);
    expect(studyHtml).toContain('Family Law Complete Comprehensive Curriculum Guide');

    // 2. Browse Semester Page: /semesters/sem-4444
    mockPrisma.semester.findUnique.mockResolvedValue({
      id: SEMESTER_4_ID,
      name: '4th Semester',
      order: 4,
      subjects: [
        {
          id: 'sub-family',
          name: 'Family Law',
          order: 4,
          units: [],
          resources: [subjectNote],
        },
      ],
    });

    const semesterPage = await SemesterPage({
      params: Promise.resolve({ id: SEMESTER_4_ID }),
    });
    const semesterHtml = renderToStaticMarkup(semesterPage);
    expect(semesterHtml).toContain('Family Law Complete Comprehensive Curriculum Guide');
  });

  it('3. Guarantees draft resources remain completely hidden publicly on both /study and /semesters/[id]', async () => {
    // DB returns only published resources (drafts are excluded by status: 'PUBLISHED')
    mockPrisma.resource.findMany.mockResolvedValue([]);

    const studyPage = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_4_ID,
        subject: 'sub-family',
      }),
    });
    const studyHtml = renderToStaticMarkup(studyPage);
    expect(studyHtml).not.toContain('Secret Unpublished Draft Material');
    expect(studyHtml).toContain('No resources found');

    mockPrisma.semester.findUnique.mockResolvedValue({
      id: SEMESTER_4_ID,
      name: '4th Semester',
      order: 4,
      subjects: [
        {
          id: 'sub-family',
          name: 'Family Law',
          order: 4,
          units: [],
          resources: [], // Draft excluded by where: { status: 'PUBLISHED' }
        },
      ],
    });

    const semesterPage = await SemesterPage({
      params: Promise.resolve({ id: SEMESTER_4_ID }),
    });
    const semesterHtml = renderToStaticMarkup(semesterPage);
    expect(semesterHtml).not.toContain('Secret Unpublished Draft Material');
  });
});
