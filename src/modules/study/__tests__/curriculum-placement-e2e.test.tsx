/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentStatus, ResourceType, Role } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks for Auth, Entitlements, Prisma, Cache, and Next Navigation
// ---------------------------------------------------------------------------
const {
  mockPrismaResource,
  mockPrismaSubject,
  mockPrismaSemester,
  mockPrismaUnit,
  mockPrismaUser,
  mockPrismaAuditLog,
} = vi.hoisted(() => ({
  mockPrismaResource: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  mockPrismaSubject: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockPrismaSemester: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockPrismaUnit: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockPrismaUser: {
    findUnique: vi.fn(),
  },
  mockPrismaAuditLog: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));
vi.mock('@/lib/b2', () => ({ deleteObject: vi.fn() }));
vi.mock('@/lib/i18n', () => ({
  getDictionary: vi.fn(async () => ({
    home: 'Home',
    study: 'Study',
    semester: 'Semester',
    subject: 'Subject',
    unit: 'Unit',
    resources: 'Resources',
    free: 'Free',
    premium: 'Premium',
    readMore: 'Read More',
    catLawNotes: 'Law Notes',
    catCaseLaws: 'Case Laws',
    catOldQuestions: 'Old Questions',
    catHistoricalFacts: 'Historical Facts',
    studyMaterialsDesc: 'Browse all available study resources.',
    noResourcesFound: 'No resources found',
    resourcesComingSoon: 'Resources coming soon.',
  })),
}));
vi.mock('@/modules/entitlements/entitlement.service', () => ({
  canAccessResource: vi.fn().mockResolvedValue(false),
  requiresSignIn: vi.fn().mockReturnValue(false),
}));
vi.mock('@/lib/seo', () => ({
  serializeJsonLd: (data: any) => JSON.stringify(data),
  getSiteUrl: () => 'https://entertainlawyers.com',
}));
vi.mock('@/lib/csp', () => ({
  getScriptNonce: vi.fn().mockResolvedValue('test-nonce'),
}));
vi.mock('@/components/payments/CheckoutButtons', () => ({
  CheckoutButtons: () => null,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    resource: mockPrismaResource,
    subject: mockPrismaSubject,
    semester: mockPrismaSemester,
    unit: mockPrismaUnit,
    user: mockPrismaUser,
    auditLog: mockPrismaAuditLog,
    $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) =>
      fn({
        resource: mockPrismaResource,
        subject: mockPrismaSubject,
        unit: mockPrismaUnit,
        semester: mockPrismaSemester,
        user: mockPrismaUser,
        auditLog: mockPrismaAuditLog,
      })
    ),
  },
}));

import { auth } from '@/lib/auth';
import { createResourceAction, updateResourceAction } from '@/modules/admin/admin-resource.actions';
import ResourcePage from '@/app/resources/[id]/page';
import ResourcesPage from '@/app/resources/page';
import { ResourcesList } from '@/app/resources/ResourcesList';

const ADMIN_USER_ID = 'admin-e2e-uuid-001';
const SEMESTER_4_ID = 'sem-4444-4444-4444-444444444444';
const SEMESTER_5_ID = 'sem-5555-5555-5555-555555555555';
const FAMILY_LAW_SUBJECT_ID = 'sub-family-law-uuid-1111';
const CRIMINAL_LAW_SUBJECT_ID = 'sub-criminal-law-uuid-2222';
const PRESCRIBED_CASES_UNIT_ID = 'unit-prescribed-cases-uuid-3333';
const E2E_RESOURCE_ID = 'res-e2e-uuid-9999';

function mockAdmin() {
  (auth as any).mockResolvedValue({
    user: { id: ADMIN_USER_ID, role: Role.ADMIN },
  });
  mockPrismaUser.findUnique.mockResolvedValue({
    id: ADMIN_USER_ID,
    role: Role.ADMIN,
    name: 'Senior Editor',
  });
}

describe('End-to-End Content Placement Verification: Semester -> Subject -> Unit -> Resource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();

    // Default canonical relationship:
    // Family Law belongs to Semester 4
    mockPrismaSubject.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === FAMILY_LAW_SUBJECT_ID) {
        return { id: FAMILY_LAW_SUBJECT_ID, name: 'Family Law', semesterId: SEMESTER_4_ID };
      }
      if (where.id === CRIMINAL_LAW_SUBJECT_ID) {
        return { id: CRIMINAL_LAW_SUBJECT_ID, name: 'Criminal Law', semesterId: SEMESTER_5_ID };
      }
      return null;
    });

    // Prescribed Cases unit belongs to Family Law
    mockPrismaUnit.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === PRESCRIBED_CASES_UNIT_ID) {
        return { id: PRESCRIBED_CASES_UNIT_ID, name: 'Unit 1: Prescribed Cases', subjectId: FAMILY_LAW_SUBJECT_ID };
      }
      return null;
    });

    mockPrismaSemester.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === SEMESTER_4_ID) {
        return { id: SEMESTER_4_ID, name: 'Fourth Semester', order: 4 };
      }
      if (where.id === SEMESTER_5_ID) {
        return { id: SEMESTER_5_ID, name: 'Fifth Semester', order: 5 };
      }
      return null;
    });
  });

  // -------------------------------------------------------------------------
  // 1. Admin Creation: Explicit Placement vs Inferred Semester
  // -------------------------------------------------------------------------
  describe('1. Admin Resource Creation & Relational Integrity', () => {
    it('creates a resource with explicit Semester, Subject, and Unit and stores correct DB relationships', async () => {
      mockPrismaResource.create.mockResolvedValue({
        id: E2E_RESOURCE_ID,
        title: 'Landmark Divorce Jurisdiction Ruling 2026',
        type: ResourceType.CASE_LAW,
        semesterId: SEMESTER_4_ID,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        unitId: PRESCRIBED_CASES_UNIT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'Landmark Divorce Jurisdiction Ruling 2026',
        type: ResourceType.CASE_LAW,
        semesterId: SEMESTER_4_ID,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        unitId: PRESCRIBED_CASES_UNIT_ID,
        isPremium: false,
      });

      expect(res.success).toBe(true);
      expect(mockPrismaResource.create).toHaveBeenCalledTimes(1);
      const data = mockPrismaResource.create.mock.calls[0][0].data;
      expect(data.semesterId).toBe(SEMESTER_4_ID);
      expect(data.subjectId).toBe(FAMILY_LAW_SUBJECT_ID);
      expect(data.unitId).toBe(PRESCRIBED_CASES_UNIT_ID);
    });

    it('infers semesterId from the selected subject when semesterId is omitted', async () => {
      mockPrismaResource.create.mockResolvedValue({
        id: E2E_RESOURCE_ID,
        title: 'Inferred Semester Case Law',
        type: ResourceType.CASE_LAW,
        semesterId: SEMESTER_4_ID,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        unitId: null,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'Inferred Semester Case Law',
        type: ResourceType.CASE_LAW,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        // semesterId is omitted
        isPremium: false,
      });

      expect(res.success).toBe(true);
      const data = mockPrismaResource.create.mock.calls[0][0].data;
      expect(data.semesterId).toBe(SEMESTER_4_ID);
      expect(data.subjectId).toBe(FAMILY_LAW_SUBJECT_ID);
    });

    it('rejects creation when the selected unit belongs to a different subject', async () => {
      const res = await createResourceAction({
        title: 'Corrupt Placement Resource',
        type: ResourceType.LAW_NOTE,
        semesterId: SEMESTER_5_ID,
        subjectId: CRIMINAL_LAW_SUBJECT_ID, // Criminal Law
        unitId: PRESCRIBED_CASES_UNIT_ID,   // Unit belongs to Family Law!
        isPremium: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected unit does not belong to the selected subject/i);
      }
      expect(mockPrismaResource.create).not.toHaveBeenCalled();
    });

    it('rejects creation when the selected subject does not belong to the intended semester', async () => {
      const res = await createResourceAction({
        title: 'Cross-Semester Misplacement Resource',
        type: ResourceType.LAW_NOTE,
        semesterId: SEMESTER_5_ID,          // User selected 5th Semester
        subjectId: FAMILY_LAW_SUBJECT_ID,   // Subject belongs to 4th Semester!
        isPremium: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected subject does not belong to the selected semester/i);
      }
      expect(mockPrismaResource.create).not.toHaveBeenCalled();
    });

    it('enforces Old Questions organization (semester-only, rejection of subject/unit)', async () => {
      // Rejects Old Question with subject
      const withSubject = await createResourceAction({
        title: 'Old Question 2080',
        type: ResourceType.OLD_QUESTION,
        semesterId: SEMESTER_4_ID,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        isPremium: false,
      });
      expect(withSubject.success).toBe(false);
      if (!withSubject.success) {
        expect(withSubject.error).toMatch(/old questions cannot be assigned to a subject/i);
      }

      // Rejects Old Question with unit
      const withUnit = await createResourceAction({
        title: 'Old Question 2080',
        type: ResourceType.OLD_QUESTION,
        semesterId: SEMESTER_4_ID,
        unitId: PRESCRIBED_CASES_UNIT_ID,
        isPremium: false,
      });
      expect(withUnit.success).toBe(false);
      if (!withUnit.success) {
        expect(withUnit.error).toMatch(/old questions cannot be assigned to a unit/i);
      }

      // Valid Old Question (semester only)
      mockPrismaResource.create.mockResolvedValue({
        id: E2E_RESOURCE_ID,
        title: 'Old Question 2080 Semester 4',
        type: ResourceType.OLD_QUESTION,
        semesterId: SEMESTER_4_ID,
        subjectId: null,
        unitId: null,
        status: ContentStatus.PUBLISHED,
      });

      const validOq = await createResourceAction({
        title: 'Old Question 2080 Semester 4',
        type: ResourceType.OLD_QUESTION,
        semesterId: SEMESTER_4_ID,
        isPremium: false,
      });
      expect(validOq.success).toBe(true);
      const data = mockPrismaResource.create.mock.calls[0][0].data;
      expect(data.semesterId).toBe(SEMESTER_4_ID);
      expect(data.subjectId).toBeNull();
      expect(data.unitId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Admin Editing: Relocation, Unit Clearing, and Semester Clearing
  // -------------------------------------------------------------------------
  describe('2. Admin Resource Editing & Relational Updates', () => {
    it('updates an existing resource to relocate to a new semester, subject, and unit', async () => {
      mockPrismaResource.update.mockResolvedValue({
        id: E2E_RESOURCE_ID,
        title: 'Criminal Procedure Note',
        type: ResourceType.LAW_NOTE,
        semesterId: SEMESTER_5_ID,
        subjectId: CRIMINAL_LAW_SUBJECT_ID,
        unitId: null,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: E2E_RESOURCE_ID,
        title: 'Criminal Procedure Note',
        type: ResourceType.LAW_NOTE,
        semesterId: SEMESTER_5_ID,
        subjectId: CRIMINAL_LAW_SUBJECT_ID,
        unitId: null,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      const updateData = mockPrismaResource.update.mock.calls[0][0].data;
      expect(updateData.semesterId).toBe(SEMESTER_5_ID);
      expect(updateData.subjectId).toBe(CRIMINAL_LAW_SUBJECT_ID);
      expect(updateData.unitId).toBeNull();
    });

    it('clears unit selection when unitId is null on update', async () => {
      mockPrismaResource.update.mockResolvedValue({
        id: E2E_RESOURCE_ID,
        title: 'Detached Unit Note',
        type: ResourceType.LAW_NOTE,
        semesterId: SEMESTER_4_ID,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        unitId: null,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: E2E_RESOURCE_ID,
        title: 'Detached Unit Note',
        type: ResourceType.LAW_NOTE,
        semesterId: SEMESTER_4_ID,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        unitId: null, // user cleared unit
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      const updateData = mockPrismaResource.update.mock.calls[0][0].data;
      expect(updateData.unitId).toBeNull();
    });

    it('rejects editing when unit does not belong to the updated subject', async () => {
      const res = await updateResourceAction({
        id: E2E_RESOURCE_ID,
        title: 'Illegally Relocated Unit',
        type: ResourceType.LAW_NOTE,
        semesterId: SEMESTER_5_ID,
        subjectId: CRIMINAL_LAW_SUBJECT_ID,
        unitId: PRESCRIBED_CASES_UNIT_ID, // Unit belongs to Family Law, not Criminal Law!
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected unit does not belong to the selected subject/i);
      }
      expect(mockPrismaResource.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Public Website Display & Placement Verification
  // -------------------------------------------------------------------------
  describe('3. Public Website Display & Breadcrumbs Placement', () => {
    it('retrieves and displays the exact resource under the intended semester, subject, and unit on /resources/[id]', async () => {
      mockPrismaResource.findUnique.mockResolvedValue({
        id: E2E_RESOURCE_ID,
        title: 'Supreme Court Family Law Precedent #42',
        status: 'PUBLISHED',
        type: ResourceType.CASE_LAW,
        subjectId: FAMILY_LAW_SUBJECT_ID,
        unitId: PRESCRIBED_CASES_UNIT_ID,
        semesterId: SEMESTER_4_ID,
        isPremium: false,
        priceAmount: null,
        currency: 'NPR',
        documentId: null,
        content: '<p>Jurisdiction under Section 14 of the Civil Code 2074.</p>',
        featuredImage: 'https://images.entertainlawyers.com/precedent.jpg',
        featuredImageId: 101,
        author: {
          id: ADMIN_USER_ID,
          name: 'Advocate Prakash Sharma',
          email: 'prakash@entertainlawyers.com',
          image: '/authors/prakash.jpg',
          bio: 'Specialist in Family and Property Law.',
          role: 'ADMIN',
          website: 'https://prakash.law.np',
        },
        createdBy: null,
        semester: {
          id: SEMESTER_4_ID,
          name: 'Fourth Semester',
        },
        subject: {
          id: FAMILY_LAW_SUBJECT_ID,
          name: 'Family Law',
          semesterId: SEMESTER_4_ID,
          semester: {
            id: SEMESTER_4_ID,
            name: 'Fourth Semester',
          },
        },
        unit: {
          id: PRESCRIBED_CASES_UNIT_ID,
          name: 'Unit 1: Prescribed Cases',
        },
      });

      mockPrismaResource.findMany.mockResolvedValue([]);

      const element = await ResourcePage({
        params: Promise.resolve({ id: E2E_RESOURCE_ID }),
      });

      expect(element).toBeDefined();

      // Find JSON-LD Breadcrumb script
      const jsonLdScript = (element as any).props.children.find(
        (child: any) => child && child.props && child.props.type === 'application/ld+json'
      );
      expect(jsonLdScript).toBeDefined();
      const parsedLd = JSON.parse(jsonLdScript.props.dangerouslySetInnerHTML.__html);
      const items = parsedLd.itemListElement;

      // Verify exact hierarchical placement:
      // Home -> Case Laws -> Fourth Semester -> Family Law -> Unit 1: Prescribed Cases -> Title
      expect(items[0].name).toBe('Home');
      expect(items[1].name).toBe('Case Laws');
      expect(items[2].name).toBe('Fourth Semester');
      expect(items[2].item).toBe(`https://entertainlawyers.com/semesters/${SEMESTER_4_ID}`);
      expect(items[3].name).toBe('Family Law');
      expect(items[3].item).toBe(
        `https://entertainlawyers.com/study?type=CASE_LAW&semester=${SEMESTER_4_ID}&subject=${FAMILY_LAW_SUBJECT_ID}`
      );
      expect(items[4].name).toBe('Unit 1: Prescribed Cases');
      expect(items[4].item).toBe(
        `https://entertainlawyers.com/study?type=CASE_LAW&semester=${SEMESTER_4_ID}&subject=${FAMILY_LAW_SUBJECT_ID}&unit=${PRESCRIBED_CASES_UNIT_ID}`
      );
      expect(items[5].name).toBe('Supreme Court Family Law Precedent #42');
      expect(items[5].item).toBe(`https://entertainlawyers.com/resources/${E2E_RESOURCE_ID}`);
    });

    it('safely renders Old Questions without subject on /resources/[id] without broken links', async () => {
      mockPrismaResource.findUnique.mockResolvedValue({
        id: E2E_RESOURCE_ID,
        title: '2080 BALLB 4th Semester Old Questions',
        status: 'PUBLISHED',
        type: ResourceType.OLD_QUESTION,
        subjectId: null,
        unitId: null,
        semesterId: SEMESTER_4_ID,
        isPremium: false,
        priceAmount: null,
        currency: 'NPR',
        documentId: null,
        content: '<p>Examination Question Paper 2080.</p>',
        featuredImage: null,
        featuredImageId: null,
        author: {
          id: ADMIN_USER_ID,
          name: 'Academic Department',
          email: 'exams@entertainlawyers.com',
          image: null,
          bio: 'Exam board materials.',
          role: 'ADMIN',
          website: null,
        },
        createdBy: null,
        semester: {
          id: SEMESTER_4_ID,
          name: 'Fourth Semester',
        },
        subject: null, // Old questions have no subject
        unit: null,
      });

      mockPrismaResource.findMany.mockResolvedValue([]);

      const element = await ResourcePage({
        params: Promise.resolve({ id: E2E_RESOURCE_ID }),
      });

      expect(element).toBeDefined();

      const jsonLdScript = (element as any).props.children.find(
        (child: any) => child && child.props && child.props.type === 'application/ld+json'
      );
      const parsedLd = JSON.parse(jsonLdScript.props.dangerouslySetInnerHTML.__html);
      const items = parsedLd.itemListElement;

      // Home -> Old Questions -> Fourth Semester -> Title (NO subject or unit link)
      expect(items.length).toBe(4);
      expect(items[0].name).toBe('Home');
      expect(items[1].name).toBe('Old Questions');
      expect(items[2].name).toBe('Fourth Semester');
      expect(items[2].item).toBe(`https://entertainlawyers.com/study?type=OLD_QUESTION&semester=${SEMESTER_4_ID}`);
      expect(items[3].name).toBe('2080 BALLB 4th Semester Old Questions');

      // Verify no broken undefined links exist
      for (const item of items) {
        expect(item.item).not.toContain('undefined');
        expect(item.item).not.toContain('null');
      }
    });

    it('displays the direct semester name for Old Questions on the public /resources list page', async () => {
      mockPrismaResource.count.mockResolvedValue(1);
      mockPrismaResource.findMany.mockResolvedValue([
        {
          id: E2E_RESOURCE_ID,
          title: '2080 BALLB 4th Semester Exam Paper',
          isPremium: false,
          semester: { name: 'Fourth Semester' },
          subject: null,
          author: null,
          createdBy: { name: 'Admin Staff', image: null, bio: null, role: 'ADMIN' },
        },
      ]);

      const pageElement = await ResourcesPage({
        searchParams: Promise.resolve({ page: '1' }),
      });
      expect(pageElement).toBeDefined();

      const dict = await (await import('@/lib/i18n')).getDictionary();
      const listElement = await ResourcesList({
        pageNumber: 1,
        dict,
      });

      expect(listElement).toBeDefined();
      expect(mockPrismaResource.findMany).toHaveBeenCalledTimes(1);
      const selectArgs = mockPrismaResource.findMany.mock.calls[0][0].select;
      expect(selectArgs.semester).toBeDefined();

      const { renderToStaticMarkup } = await import('react-dom/server');
      const renderedHtml = renderToStaticMarkup(listElement);
      expect(renderedHtml).toContain('Fourth Semester');
      expect(renderedHtml).toContain('2080 BALLB 4th Semester Exam Paper');
    });
  });
});
