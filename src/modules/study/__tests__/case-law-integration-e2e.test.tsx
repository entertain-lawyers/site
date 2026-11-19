/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceType, ContentStatus, Role } from '@prisma/client';
import { renderToStaticMarkup } from 'react-dom/server';

const { mockPrisma } = vi.hoisted(() => {
  const resource = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
  const auditLog = { create: vi.fn() };
  const user = { findUnique: vi.fn() };
  const subject = { findMany: vi.fn(), findUnique: vi.fn() };
  const unit = { findMany: vi.fn(), findUnique: vi.fn() };
  const semester = { findMany: vi.fn(), findUnique: vi.fn() };

  return {
    mockPrisma: {
      user,
      resource,
      auditLog,
      subject,
      unit,
      semester,
      $transaction: vi.fn(async (fn: any) =>
        fn({ user, resource, auditLog, subject, unit, semester })
      ),
    },
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
  auth: vi.fn().mockResolvedValue({ user: { id: 'editor-1', role: Role.EDITOR } }),
}));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/content-authors', () => ({
  resolveLocalAuthor: vi.fn().mockResolvedValue({ id: 'editor-1', name: 'Editor Amrit', role: Role.EDITOR }),
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

import {
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
} from '@/modules/admin/admin-resource.actions';
import StudyPage from '@/app/study/page';
import { parseCaseLawCategory, encodeCaseClassification } from '@/lib/case-category';

const SEMESTER_ID = 'sem-4444';
const SUBJECT_ID = 'sub-family-law';
const UNIT_ID = 'unit-marriage-divorce';

describe('Case Law Integration & Unified Lifecycle E2E Review', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.user.findUnique.mockResolvedValue({ role: Role.EDITOR });

    mockPrisma.semester.findMany.mockResolvedValue([
      { id: SEMESTER_ID, name: '4th Semester', order: 4 },
    ]);
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: SUBJECT_ID, name: 'Family Law', order: 4, semesterId: SEMESTER_ID },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: UNIT_ID, name: 'Unit 1', title: 'Marriage and Divorce', subjectId: SUBJECT_ID, order: 1 },
    ]);

    mockPrisma.subject.findUnique.mockResolvedValue({
      id: SUBJECT_ID,
      name: 'Family Law',
      semesterId: SEMESTER_ID,
      semester: { id: SEMESTER_ID, name: '4th Semester', order: 4 },
    });
    mockPrisma.unit.findUnique.mockResolvedValue({
      id: UNIT_ID,
      name: 'Unit 1',
      subjectId: SUBJECT_ID,
      subject: {
        id: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        semester: { id: SEMESTER_ID, name: '4th Semester', order: 4 },
      },
    });
  });

  it('1. Editor classifies and creates a Case Law with Civil classification', async () => {
    const createdId = 'a0000000-0000-0000-0000-000000000101';
    mockPrisma.resource.create.mockResolvedValue({
      id: createdId,
      title: 'Keshav Prasad v. Sita Devi (2079)',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
      metaTitle: encodeCaseClassification({ caseLawCategory: 'CIVIL', caseCategory: 'NEW_CASE' }),
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
    });

    const result = await createResourceAction({
      title: 'Keshav Prasad v. Sita Devi (2079)',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
      caseLawCategory: 'CIVIL',
      caseCategory: 'NEW_CASE',
      isPremium: false,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.resource.create).toHaveBeenCalledTimes(1);

    const callArgs = mockPrisma.resource.create.mock.calls[0][0].data;
    expect(callArgs.type).toBe(ResourceType.CASE_LAW);
    expect(parseCaseLawCategory(callArgs.metaTitle)).toBe('CIVIL');
    expect(callArgs.semesterId).toBe(SEMESTER_ID);
    expect(callArgs.subjectId).toBe(SUBJECT_ID);
    expect(callArgs.unitId).toBe(UNIT_ID);
  });

  it('2. The exact same Case Law record appears in both curriculum view and Case Laws listing', async () => {
    const singleRecord = {
      id: 'a0000000-0000-0000-0000-000000000101',
      title: 'Keshav Prasad v. Sita Devi (2079)',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
      metaTitle: encodeCaseClassification({ caseLawCategory: 'CIVIL', caseCategory: 'NEW_CASE' }),
      isPremium: false,
      priceAmount: 0,
      currency: 'NPR',
      content: 'Landmark decision on marital property rights under the civil code.',
      unitId: UNIT_ID,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      author: null,
      createdBy: null,
    };

    mockPrisma.resource.findMany.mockResolvedValue([singleRecord]);

    // A. Curriculum Navigation View: 4th Semester → Family Law
    const curriculumPage = await StudyPage({
      searchParams: Promise.resolve({
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
      }),
    });
    const curriculumHtml = renderToStaticMarkup(curriculumPage);

    expect(curriculumHtml).toContain('Keshav Prasad v. Sita Devi (2079)');
    expect(curriculumHtml).toContain('data-case-law-category="CIVIL"');
    expect(curriculumHtml).toContain('data-case-category="NEW_CASE"');

    // B. Case Laws Listing View: /study?type=CASE_LAW&q=civil
    const caseLawsPage = await StudyPage({
      searchParams: Promise.resolve({
        type: 'CASE_LAW',
        q: 'civil',
      }),
    });
    const caseLawsHtml = renderToStaticMarkup(caseLawsPage);

    expect(caseLawsHtml).toContain('Keshav Prasad v. Sita Devi (2079)');
    expect(caseLawsHtml).toContain('data-case-law-category="CIVIL"');
  });

  it('3. Reclassifying from CIVIL to WRIT updates the same record and updates discoverability', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000101',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
      metaTitle: 'CIVIL:NEW_CASE',
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
    });

    mockPrisma.resource.update.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000101',
      title: 'Keshav Prasad v. Sita Devi (2079)',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
      metaTitle: 'WRIT:NEW_CASE',
    });

    const updateResult = await updateResourceAction({
      id: 'a0000000-0000-0000-0000-000000000101',
      title: 'Keshav Prasad v. Sita Devi (2079)',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
      caseLawCategory: 'WRIT',
      isPremium: false,
    });

    expect(updateResult.success).toBe(true);
    expect(mockPrisma.resource.update).toHaveBeenCalledTimes(1);

    const updateCallArgs = mockPrisma.resource.update.mock.calls[0][0].data;
    expect(parseCaseLawCategory(updateCallArgs.metaTitle)).toBe('WRIT');
  });

  it('4. Unpublishing (switching to DRAFT) hides the Case Law from public visibility', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000101',
      status: ContentStatus.PUBLISHED,
      type: ResourceType.CASE_LAW,
      metaTitle: 'WRIT:NEW_CASE',
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
    });

    mockPrisma.resource.update.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000101',
      title: 'Keshav Prasad v. Sita Devi (2079)',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.DRAFT,
    });

    const draftResult = await updateResourceAction({
      id: 'a0000000-0000-0000-0000-000000000101',
      title: 'Keshav Prasad v. Sita Devi (2079)',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.DRAFT,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
      isPremium: false,
    });

    expect(draftResult.success).toBe(true);

    // Public query returns empty array because DRAFT is not PUBLISHED
    mockPrisma.resource.findMany.mockResolvedValue([]);

    const page = await StudyPage({
      searchParams: Promise.resolve({
        type: 'CASE_LAW',
        q: 'writ',
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain('Keshav Prasad v. Sita Devi (2079)');
    expect(html).toContain('No cases found');
  });

  it('5. Enforces security boundary: Editor is blocked from creating LAW_NOTE or deleting resources with documents', async () => {
    // Attempt LAW_NOTE creation as Editor
    const lawNoteResult = await createResourceAction({
      title: 'Unauthorized Editor Law Note',
      type: ResourceType.LAW_NOTE,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
      isPremium: false,
    });
    expect(lawNoteResult.success).toBe(false);
    if (!lawNoteResult.success) {
      expect(lawNoteResult.error).toBe('Only admins can create law notes');
    }

    const testUuid = '123e4567-e89b-12d3-a456-426614174000';

    // Mock resource with document
    mockPrisma.resource.findUnique.mockResolvedValue({
      id: testUuid,
      documentId: 'doc-101',
      document: { id: 'doc-101', storageKey: 'documents/test.pdf', Publication: null },
      uploadIntents: [],
    });

    // Attempt Resource deletion as Editor
    const deleteResult = await deleteResourceAction({
      id: testUuid,
    });
    expect(deleteResult.success).toBe(false);
    if (!deleteResult.success) {
      expect(deleteResult.error).toBe('Forbidden: Only admins can delete resources with a document.');
    }
  });
});
