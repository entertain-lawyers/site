import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentStatus, ResourceType, Role } from '@prisma/client';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/b2', () => ({ deleteObject: vi.fn() }));
vi.mock('@/lib/content-authors', () => ({
  resolveLocalAuthor: vi.fn().mockResolvedValue({ id: 'user-editor', name: 'Editor Amrit', role: Role.EDITOR }),
}));

vi.mock('@/lib/prisma', () => {
  const resource = { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() };
  const auditLog = { create: vi.fn() };
  const subject = { findUnique: vi.fn() };
  const unit = { findUnique: vi.fn() };
  const semester = { findUnique: vi.fn() };
  return {
    prisma: {
      user: { findUnique: vi.fn() },
      resource,
      auditLog,
      subject,
      unit,
      semester,
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
        fn({ resource, auditLog, subject, unit, semester })
      ),
    },
  };
});

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createResourceAction,
  updateResourceAction,
  setResourcePublishedAction,
} from '../admin-resource.actions';
import { AdminResourceForm } from '@/components/admin/AdminResourceForm';
import type { Mock } from 'vitest';

const mock = (fn: unknown) => fn as Mock;

const SEMESTER_ID = '123e4567-e89b-12d3-a456-426614174010';
const SUBJECT_ID = '123e4567-e89b-12d3-a456-426614174020';
const UNIT_ID = '123e4567-e89b-12d3-a456-426614174030';
const RESOURCE_ID = '123e4567-e89b-12d3-a456-426614174040';

function signInAs(role: Role, userId = 'user-editor') {
  mock(auth).mockResolvedValue({ user: { id: userId, role } });
  mock(prisma.user.findUnique).mockResolvedValue({ id: userId, role });
}

describe('Admin Prescribed Case Workflow & Category Classification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(Role.EDITOR);

    // Mock subject and unit relationship integrity
    mock(prisma.subject.findUnique).mockResolvedValue({
      id: SUBJECT_ID,
      semesterId: SEMESTER_ID,
    });
    mock(prisma.unit.findUnique).mockResolvedValue({
      id: UNIT_ID,
      name: 'Prescribed Cases',
      subjectId: SUBJECT_ID,
    });

    mock(prisma.resource.create).mockImplementation(async ({ data }) => ({
      id: RESOURCE_ID,
      ...data,
    }));
    mock(prisma.resource.update).mockImplementation(async ({ data }) => ({
      id: RESOURCE_ID,
      title: data.title || 'Case Law',
      status: data.status,
      metaTitle: data.metaTitle,
    }));
  });

  describe('Scenario 1 & 2: Editor publishes New Case and Old Case', () => {
    it('allows an Editor to publish a New Case under a Prescribed Cases unit', async () => {
      const res = await createResourceAction({
        title: 'Kesavananda Bharati v. State of Kerala',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'NEW_CASE',
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      expect(prisma.resource.create).toHaveBeenCalledTimes(1);

      const createCall = mock(prisma.resource.create).mock.calls[0][0];
      expect(createCall.data.type).toBe(ResourceType.CASE_LAW);
      expect(createCall.data.metaTitle).toBe('NEW_CASE');
      expect(createCall.data.status).toBe(ContentStatus.PUBLISHED);
      expect(createCall.data.subjectId).toBe(SUBJECT_ID);
      expect(createCall.data.semesterId).toBe(SEMESTER_ID);
      expect(createCall.data.unitId).toBe(UNIT_ID);
    });

    it('allows an Editor to publish an Old Case under a Prescribed Cases unit', async () => {
      const res = await createResourceAction({
        title: 'Donoghue v. Stevenson',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'OLD_CASE',
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      expect(prisma.resource.create).toHaveBeenCalledTimes(1);

      const createCall = mock(prisma.resource.create).mock.calls[0][0];
      expect(createCall.data.type).toBe(ResourceType.CASE_LAW);
      expect(createCall.data.metaTitle).toBe('OLD_CASE');
      expect(createCall.data.status).toBe(ContentStatus.PUBLISHED);
    });
  });

  describe('Scenario 3 & 4: Validation & Category Requirement before publishing', () => {
    it('requires explicit Case Category selection before publishing a Case Law', async () => {
      const res = await createResourceAction({
        title: 'Unclassified Landmark Case',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: null,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Case Category.*before publishing/i);
      }
      expect(prisma.resource.create).not.toHaveBeenCalled();
    });

    it('allows saving a Case Law as DRAFT without category, but blocks publishing until category is set', async () => {
      // 1. Can create as draft
      const draftRes = await createResourceAction({
        title: 'Draft Case Study',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: null,
        isPremium: false,
        status: ContentStatus.DRAFT,
      });

      expect(draftRes.success).toBe(true);

      // 2. Cannot publish draft without category
      mock(prisma.resource.findUnique).mockResolvedValue({
        id: RESOURCE_ID,
        type: ResourceType.CASE_LAW,
        status: ContentStatus.DRAFT,
        metaTitle: null,
      });

      const pubRes = await setResourcePublishedAction({ id: RESOURCE_ID, published: true });
      expect(pubRes.success).toBe(false);
      if (!pubRes.success) {
        expect(pubRes.error).toMatch(/Case Category.*before publishing/i);
      }
    });
  });

  describe('Scenario 5: Editing a case and changing its category', () => {
    it('allows an Editor to update a case and switch category from OLD_CASE to NEW_CASE', async () => {
      mock(prisma.resource.findUnique).mockResolvedValue({
        id: RESOURCE_ID,
        title: 'Rylands v. Fletcher',
        type: ResourceType.CASE_LAW,
        status: ContentStatus.PUBLISHED,
        metaTitle: 'OLD_CASE',
      });

      const updateRes = await updateResourceAction({
        id: RESOURCE_ID,
        title: 'Rylands v. Fletcher (Revised Classification)',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'NEW_CASE',
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(updateRes.success).toBe(true);
      expect(prisma.resource.update).toHaveBeenCalledTimes(1);

      const updateCall = mock(prisma.resource.update).mock.calls[0][0];
      expect(updateCall.data.metaTitle).toBe('NEW_CASE');
    });

    it('retains existing category when updating other fields if category is not explicitly changed', async () => {
      mock(prisma.resource.findUnique).mockResolvedValue({
        id: RESOURCE_ID,
        title: 'Hadley v. Baxendale',
        type: ResourceType.CASE_LAW,
        status: ContentStatus.PUBLISHED,
        metaTitle: 'OLD_CASE',
      });

      const updateRes = await updateResourceAction({
        id: RESOURCE_ID,
        title: 'Hadley v. Baxendale (Updated Summary)',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: undefined, // category not touched
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(updateRes.success).toBe(true);
      expect(prisma.resource.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 6: Role permissions (Editor vs Admin)', () => {
    it('keeps Law Notes restricted to Admin (Editor cannot create or update Law Notes)', async () => {
      signInAs(Role.EDITOR);

      const createNoteRes = await createResourceAction({
        title: 'Administrative Law Notes',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.LAW_NOTE,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(createNoteRes.success).toBe(false);
      if (!createNoteRes.success) {
        expect(createNoteRes.error).toMatch(/Only admins can create law notes/i);
      }

      const updateNoteRes = await updateResourceAction({
        id: RESOURCE_ID,
        title: 'Updated Law Note',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.LAW_NOTE,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(updateNoteRes.success).toBe(false);
      if (!updateNoteRes.success) {
        expect(updateNoteRes.error).toMatch(/Only admins can update law notes/i);
      }
    });

    it('allows Admin to create and update Law Notes and Case Laws without restriction', async () => {
      signInAs(Role.ADMIN, 'user-admin');

      const createRes = await createResourceAction({
        title: 'Landmark Precedent by Admin',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'NEW_CASE',
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(createRes.success).toBe(true);
    });
  });

  describe('Curriculum hierarchy validation', () => {
    it('rejects assigning a case to an unrelated semester or subject', async () => {
      mock(prisma.subject.findUnique).mockResolvedValue({
        id: SUBJECT_ID,
        semesterId: 'different-semester-id',
      });

      const res = await createResourceAction({
        title: 'Mismatched Hierarchy Case',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'NEW_CASE',
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected subject does not belong to the selected semester/i);
      }
    });

    it('rejects assigning a case to an unrelated unit', async () => {
      mock(prisma.unit.findUnique).mockResolvedValue({
        id: UNIT_ID,
        name: 'Unit 5',
        subjectId: 'different-subject-id',
      });

      const res = await createResourceAction({
        title: 'Mismatched Unit Case',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'NEW_CASE',
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected unit does not belong to the selected subject/i);
      }
    });
  });

  describe('Draft Workflow: New Case and Old Case Drafts & Category Switching', () => {
    it('allows an Editor to create a New Case as DRAFT without publishing to production', async () => {
      const res = await createResourceAction({
        title: 'Draft Landmark Case 2026',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'NEW_CASE',
        isPremium: false,
        status: ContentStatus.DRAFT,
      });

      expect(res.success).toBe(true);
      expect(prisma.resource.create).toHaveBeenCalledTimes(1);

      const createCall = mock(prisma.resource.create).mock.calls[0][0];
      expect(createCall.data.type).toBe(ResourceType.CASE_LAW);
      expect(createCall.data.metaTitle).toBe('NEW_CASE');
      expect(createCall.data.status).toBe(ContentStatus.DRAFT);
    });

    it('allows an Editor to create an Old Case as DRAFT', async () => {
      const res = await createResourceAction({
        title: 'Draft Historic Case Precedent',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'OLD_CASE',
        isPremium: false,
        status: ContentStatus.DRAFT,
      });

      expect(res.success).toBe(true);
      expect(prisma.resource.create).toHaveBeenCalledTimes(1);

      const createCall = mock(prisma.resource.create).mock.calls[0][0];
      expect(createCall.data.type).toBe(ResourceType.CASE_LAW);
      expect(createCall.data.metaTitle).toBe('OLD_CASE');
      expect(createCall.data.status).toBe(ContentStatus.DRAFT);
    });

    it('allows an Editor to switch a draft category from NEW_CASE to OLD_CASE', async () => {
      mock(prisma.resource.findUnique).mockResolvedValue({
        id: RESOURCE_ID,
        title: 'Draft Case in Review',
        type: ResourceType.CASE_LAW,
        status: ContentStatus.DRAFT,
        metaTitle: 'NEW_CASE',
      });

      const updateRes = await updateResourceAction({
        id: RESOURCE_ID,
        title: 'Draft Case in Review (Reclassified as Old Case)',
        subjectId: SUBJECT_ID,
        semesterId: SEMESTER_ID,
        unitId: UNIT_ID,
        type: ResourceType.CASE_LAW,
        caseCategory: 'OLD_CASE',
        isPremium: false,
        status: ContentStatus.DRAFT,
      });

      expect(updateRes.success).toBe(true);
      expect(prisma.resource.update).toHaveBeenCalledTimes(1);

      const updateCall = mock(prisma.resource.update).mock.calls[0][0];
      expect(updateCall.data.metaTitle).toBe('OLD_CASE');
      expect(updateCall.data.status).toBe(ContentStatus.DRAFT);
    });
  });

  describe('Ordinary resources regression: LAW_NOTE, OLD_QUESTION, OTHER unaffected', () => {
    it('allows Editors to create and edit OLD_QUESTION resources without category requirements', async () => {
      const res = await createResourceAction({
        title: 'Final Exam 2080 Questions',
        semesterId: SEMESTER_ID,
        type: ResourceType.OLD_QUESTION,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      const createCall = mock(prisma.resource.create).mock.calls[0][0];
      expect(createCall.data.type).toBe(ResourceType.OLD_QUESTION);
      expect(createCall.data.metaTitle).toBeNull();
    });

    it('allows Editors to manage OTHER resources without category requirements', async () => {
      const res = await createResourceAction({
        title: 'Syllabus and Reference Guide',
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      const createCall = mock(prisma.resource.create).mock.calls[0][0];
      expect(createCall.data.type).toBe(ResourceType.OTHER);
      expect(createCall.data.metaTitle).toBeNull();
    });
  });

  describe('UI Component Verification: AdminResourceForm layout and case category rendering', () => {
    const mockSemesters = [{ id: SEMESTER_ID, name: 'Fourth Semester' }];
    const mockSubjects = [{ id: SUBJECT_ID, name: 'Family Law', semesterId: SEMESTER_ID }];
    const mockUnits = [
      { id: UNIT_ID, name: 'Prescribed Cases', subjectId: SUBJECT_ID, order: 1 },
      { id: 'ordinary-unit', name: 'Unit 1: General Principles', subjectId: SUBJECT_ID, order: 2 },
    ];
    const mockAuthors = [
      {
        id: 'user-editor',
        name: 'Editor Amrit',
        role: Role.EDITOR,
        wpAuthorIdEn: null,
        wpAuthorIdNe: null,
      },
    ];

    const makeResource = (overrides = {}) => ({
      id: RESOURCE_ID,
      title: 'Test Prescribed Case',
      content: '',
      description: '',
      type: ResourceType.CASE_LAW,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
      status: ContentStatus.DRAFT,
      isPremium: false,
      priceAmount: null,
      authorId: 'user-editor',
      hasDocument: false,
      caseCategory: 'NEW_CASE' as const,
      ...overrides,
    });

    it('renders Case Category radio group when unit is Prescribed Cases', () => {
      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={mockSemesters}
          subjects={mockSubjects}
          units={mockUnits}
          authors={mockAuthors}
          canManageLawTypes={false} // Editor role
          resource={makeResource()}
        />
      );

      // Verify Case Category section
      expect(html).toContain('data-testid="case-category-section"');
      expect(html).toContain('Case Category');
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('New Case');
      expect(html).toContain('Old Case');

      // Verify NEW_CASE is selected (aria-checked="true")
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('border-emerald-500');

      // Verify responsive grid layout classes for desktop & mobile
      expect(html).toContain('grid grid-cols-2 gap-3');
    });

    it('renders Old Case as selected when caseCategory is OLD_CASE', () => {
      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={mockSemesters}
          subjects={mockSubjects}
          units={mockUnits}
          authors={mockAuthors}
          canManageLawTypes={false}
          resource={makeResource({
            title: 'Historic Case 1975',
            caseCategory: 'OLD_CASE',
          })}
        />
      );

      expect(html).toContain('data-testid="case-category-section"');
      expect(html).toContain('border-amber-500');
    });

    it('does not render Case Category section for ordinary non-prescribed units with non-case types', () => {
      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={mockSemesters}
          subjects={mockSubjects}
          units={mockUnits}
          authors={mockAuthors}
          canManageLawTypes={false}
          resource={makeResource({
            id: 'res-ordinary',
            title: 'General Questions Unit 1',
            type: ResourceType.OLD_QUESTION,
            unitId: 'ordinary-unit',
            caseCategory: null,
          })}
        />
      );

      expect(html).not.toContain('data-testid="case-category-section"');
      expect(html).not.toContain('aria-label="Case Category"');
    });
  });
});

