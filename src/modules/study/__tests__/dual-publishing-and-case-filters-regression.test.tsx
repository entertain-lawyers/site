/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
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

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/content-authors', () => ({
  resolveLocalAuthor: vi.fn().mockResolvedValue({ id: 'admin-1', name: 'Admin Amrit', role: Role.ADMIN }),
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
  })),
}));

vi.mock('@/components/editor/RichTextEditor', () => ({
  default: function DummyEditor({ value, onChange, placeholder }: any) {
    return (
      <div data-testid="rich-text-editor">
        <textarea
          data-testid="rich-editor-textarea"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)}
        />
      </div>
    );
  },
}));

import { createResourceAction, updateResourceAction } from '@/modules/admin/admin-resource.actions';
import {
  parseCaseCategory,
  parseCaseLawCategory,
  encodeCaseClassification,
  getCaseCategory,
  getCaseLawCategory,
} from '@/lib/case-category';
import PrescribedCasesView, { PrescribedCaseItem } from '@/components/study/PrescribedCasesView';
import { AdminResourceForm } from '@/components/admin/AdminResourceForm';
import StudyPage from '@/app/study/page';

const SEMESTER_ID = 'b0000000-0000-0000-0000-000000000001';
const SUBJECT_ID = 'b0000000-0000-0000-0000-000000000002';
const UNIT_ID = 'b0000000-0000-0000-0000-000000000003';

describe('Admin Study Resources Dual Publishing & Case Filters Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });

    mockPrisma.subject.findUnique.mockResolvedValue({
      id: SUBJECT_ID,
      name: 'Constitutional Law',
      semesterId: SEMESTER_ID,
    });
    mockPrisma.unit.findUnique.mockResolvedValue({
      id: UNIT_ID,
      name: 'Prescribed Cases',
      subjectId: SUBJECT_ID,
    });
    mockPrisma.semester.findMany.mockResolvedValue([{ id: SEMESTER_ID, name: '1st Semester' }]);
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: SUBJECT_ID, name: 'Constitutional Law', semesterId: SEMESTER_ID },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: UNIT_ID, name: 'Prescribed Cases', subjectId: SUBJECT_ID },
    ]);
  });

  // 1. Creating a Law Note with Case Laws placement disabled
  it('1. Creating a Law Note with Case Laws placement disabled creates a clean Law Note with metaTitle: null', async () => {
    mockPrisma.resource.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'law-note-only',
        ...data,
      })
    );

    const res = await createResourceAction({
      title: 'Constitutional Principles of Nepal 2072',
      content: '<p>Comprehensive lecture notes on constitutionalism.</p>',
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      type: ResourceType.LAW_NOTE,
      caseLawCategory: null,
      caseCategory: null,
      isPremium: false,
      status: ContentStatus.PUBLISHED,
    });

    expect(res.success).toBe(true);
    expect(mockPrisma.resource.create).toHaveBeenCalledTimes(1);
    const createData = mockPrisma.resource.create.mock.calls[0][0].data;
    expect(createData.type).toBe(ResourceType.LAW_NOTE);
    expect(createData.metaTitle).toBe(null);
  });

  // 2. Creating a Law Note with Case Laws placement enabled
  it('2. Creating a Law Note with Case Laws placement enabled saves composite classification in metaTitle', async () => {
    mockPrisma.resource.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'law-note-dual',
        ...data,
      })
    );

    const res = await createResourceAction({
      title: 'Marbury v. Madison & Nepal Precedent Study',
      content: '<p>Prescribed note with case law doctrine.</p>',
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      type: ResourceType.LAW_NOTE,
      caseLawCategory: 'CIVIL',
      caseCategory: 'NEW_CASE',
      isPremium: false,
      status: ContentStatus.PUBLISHED,
    });

    expect(res.success).toBe(true);
    expect(mockPrisma.resource.create).toHaveBeenCalledTimes(1);
    const createData = mockPrisma.resource.create.mock.calls[0][0].data;
    expect(createData.type).toBe(ResourceType.LAW_NOTE);
    expect(createData.metaTitle).toBe('CIVIL:NEW_CASE');
    expect(parseCaseLawCategory(createData.metaTitle)).toBe('CIVIL');
    expect(parseCaseCategory(createData.metaTitle)).toBe('NEW_CASE');
  });

  // 3. Confirming both placements use the same underlying Resource record
  it('3. Confirming both placements use the same underlying Resource record with zero duplication', async () => {
    const singleDualRecord = {
      id: 'dual-rec-100',
      title: 'Landmark Right to Privacy Precedent',
      type: ResourceType.LAW_NOTE,
      metaTitle: 'WRIT:NEW_CASE',
      content: 'Constitutional bench ruling on privacy as fundamental right.',
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
      semester: { id: SEMESTER_ID, name: '1st Semester' },
      subject: { id: SUBJECT_ID, name: 'Constitutional Law', semester: { id: SEMESTER_ID, name: '1st Semester' } },
      unit: { id: UNIT_ID, name: 'Prescribed Cases', title: null },
      author: null,
      createdBy: null,
    };

    mockPrisma.resource.findMany.mockResolvedValue([singleDualRecord]);

    // A. Query under Law Notes
    const lawNotesPage = await StudyPage({
      searchParams: Promise.resolve({
        type: 'LAW_NOTE',
        semester: SEMESTER_ID,
        subject: SUBJECT_ID,
      }),
    });
    const lawNotesHtml = renderToStaticMarkup(lawNotesPage);
    expect(lawNotesHtml).toContain('Landmark Right to Privacy Precedent');
    expect(lawNotesHtml).toContain('dual-rec-100');

    // B. Query under Case Laws (/study?type=CASE_LAW)
    const caseLawsPage = await StudyPage({
      searchParams: Promise.resolve({
        type: 'CASE_LAW',
        q: 'privacy',
      }),
    });
    const caseLawsHtml = renderToStaticMarkup(caseLawsPage);
    expect(caseLawsHtml).toContain('Landmark Right to Privacy Precedent');
    expect(caseLawsHtml).toContain('dual-rec-100');
    expect(caseLawsHtml).toContain('data-case-law-category="WRIT"');
  });

  // 4. Editing an existing dual-published record
  it('4. Editing an existing dual-published record keeps both placements synchronized', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({
      id: 'dual-rec-100',
      type: ResourceType.LAW_NOTE,
      status: ContentStatus.PUBLISHED,
      metaTitle: 'CIVIL:NEW_CASE',
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
    });

    mockPrisma.resource.update.mockResolvedValue({
      id: 'dual-rec-100',
      title: 'Updated Privacy Doctrine & Injunctions',
      type: ResourceType.LAW_NOTE,
      status: ContentStatus.PUBLISHED,
      metaTitle: 'WRIT:BOTH_CASES',
      content: '<p>Updated and expanded syllabus notes.</p>',
    });

    const updateRes = await updateResourceAction({
      id: 'dual-rec-100',
      title: 'Updated Privacy Doctrine & Injunctions',
      type: ResourceType.LAW_NOTE,
      content: '<p>Updated and expanded syllabus notes.</p>',
      status: ContentStatus.PUBLISHED,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
      caseLawCategory: 'WRIT',
      caseCategory: 'BOTH_CASES',
      isPremium: false,
    });

    expect(updateRes.success).toBe(true);
    expect(mockPrisma.resource.update).toHaveBeenCalledTimes(1);
    const updateData = mockPrisma.resource.update.mock.calls[0][0].data;
    expect(updateData.title).toBe('Updated Privacy Doctrine & Injunctions');
    expect(updateData.metaTitle).toBe('WRIT:BOTH_CASES');
    expect(parseCaseLawCategory(updateData.metaTitle)).toBe('WRIT');
    expect(parseCaseCategory(updateData.metaTitle)).toBe('BOTH_CASES');
  });

  // 5. Removing the optional Case Laws placement
  it('5. Removing the optional Case Laws placement clears metaTitle without deleting or altering the Law Note', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({
      id: 'dual-rec-100',
      type: ResourceType.LAW_NOTE,
      status: ContentStatus.PUBLISHED,
      metaTitle: 'WRIT:BOTH_CASES',
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: UNIT_ID,
    });

    mockPrisma.resource.update.mockResolvedValue({
      id: 'dual-rec-100',
      title: 'Pure Law Note without Case Laws placement',
      type: ResourceType.LAW_NOTE,
      status: ContentStatus.PUBLISHED,
      metaTitle: null,
    });

    const removeRes = await updateResourceAction({
      id: 'dual-rec-100',
      title: 'Pure Law Note without Case Laws placement',
      type: ResourceType.LAW_NOTE,
      status: ContentStatus.PUBLISHED,
      semesterId: SEMESTER_ID,
      subjectId: SUBJECT_ID,
      unitId: null,
      caseLawCategory: null,
      caseCategory: null,
      isPremium: false,
    });

    expect(removeRes.success).toBe(true);
    const updateData = mockPrisma.resource.update.mock.calls[0][0].data;
    expect(updateData.metaTitle).toBe(null);
  });

  // 6. New, Old, Both, and All filter behavior
  describe('6. New, Old, Both, and All filter behavior in PrescribedCasesView', () => {
    const testCases: PrescribedCaseItem[] = [
      {
        id: 'case-new-1',
        title: 'New Case Alpha (2080)',
        content: 'Recent ruling',
        metaTitle: 'CIVIL:NEW_CASE',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
      },
      {
        id: 'case-old-1',
        title: 'Old Case Beta (2035)',
        content: 'Historical landmark',
        metaTitle: 'CRIMINAL:OLD_CASE',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
      },
      {
        id: 'case-both-1',
        title: 'Both Case Gamma (2065)',
        content: 'Active precedent in old & new syllabus',
        metaTitle: 'WRIT:BOTH_CASES',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
      },
      {
        id: 'case-legacy-1',
        title: 'Legacy Case Delta (2040)',
        content: 'Unclassified judgment',
        metaTitle: null,
        documentId: null,
        isPremium: false,
        priceAmount: 0,
      },
    ];

    it('All Cases filter displays every eligible case exactly once', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={testCases}
          unitName="Prescribed Cases"
          initialCategory="ALL"
        />
      );

      expect(html).toContain('New Case Alpha');
      expect(html).toContain('Old Case Beta');
      expect(html).toContain('Both Case Gamma');
      expect(html).toContain('Legacy Case Delta');
    });

    it('New Cases filter displays New Cases + Both Cases, excluding Old and unclassified', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={testCases}
          unitName="Prescribed Cases"
          initialCategory="NEW_CASE"
        />
      );

      expect(html).toContain('New Case Alpha');
      expect(html).toContain('Both Case Gamma');
      expect(html).not.toContain('Old Case Beta');
      expect(html).not.toContain('Legacy Case Delta');
    });

    it('Old Cases filter displays Old Cases + Both Cases, excluding New and unclassified', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={testCases}
          unitName="Prescribed Cases"
          initialCategory="OLD_CASE"
        />
      );

      expect(html).toContain('Old Case Beta');
      expect(html).toContain('Both Case Gamma');
      expect(html).not.toContain('New Case Alpha');
      expect(html).not.toContain('Legacy Case Delta');
    });

    it('Both Cases filter displays ONLY Both Cases', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={testCases}
          unitName="Prescribed Cases"
          initialCategory="BOTH_CASES"
        />
      );

      expect(html).toContain('Both Case Gamma');
      expect(html).not.toContain('New Case Alpha');
      expect(html).not.toContain('Old Case Beta');
      expect(html).not.toContain('Legacy Case Delta');
    });
  });

  // 7. Legacy classifications
  it('7. Robustly parses legacy classifications and variations without crashing or misclassification', () => {
    // Delimiter variations
    expect(parseCaseCategory('CIVIL:NEW')).toBe('NEW_CASE');
    expect(parseCaseCategory('CIVIL:OLD')).toBe('OLD_CASE');
    expect(parseCaseCategory('WRIT:BOTH')).toBe('BOTH_CASES');
    expect(parseCaseCategory('BOTH:WRIT')).toBe('BOTH_CASES');
    expect(parseCaseCategory('CRIMINAL:NEW_CASE')).toBe('NEW_CASE');
    expect(parseCaseCategory('CIVIL_NEW')).toBe('NEW_CASE');
    expect(parseCaseCategory('CIVIL/OLD')).toBe('OLD_CASE');

    // Case law categories
    expect(parseCaseLawCategory('CIVIL:NEW')).toBe('CIVIL');
    expect(parseCaseLawCategory('CRIMINAL:OLD')).toBe('CRIMINAL');
    expect(parseCaseLawCategory('WRIT:BOTH')).toBe('WRIT');
    expect(parseCaseLawCategory('BOTH:WRIT')).toBe('WRIT');

    // Bare strings
    expect(parseCaseCategory('CIVIL')).toBe(null);
    expect(parseCaseCategory('WRIT')).toBe(null);
    expect(parseCaseCategory('CRIMINAL')).toBe(null);
    expect(parseCaseCategory('NEW')).toBe('NEW_CASE');
    expect(parseCaseCategory('OLD')).toBe('OLD_CASE');
    expect(parseCaseCategory('BOTH')).toBe('BOTH_CASES');
  });

  // 8. Civil, Criminal, and Writ combinations with New, Old, and Both
  it('8. Supports all 9 Civil, Criminal, and Writ combinations with New, Old, and Both', () => {
    const combinations: Array<{ law: 'CIVIL' | 'CRIMINAL' | 'WRIT'; timeline: 'NEW_CASE' | 'OLD_CASE' | 'BOTH_CASES' }> = [
      { law: 'CIVIL', timeline: 'NEW_CASE' },
      { law: 'CIVIL', timeline: 'OLD_CASE' },
      { law: 'CIVIL', timeline: 'BOTH_CASES' },
      { law: 'CRIMINAL', timeline: 'NEW_CASE' },
      { law: 'CRIMINAL', timeline: 'OLD_CASE' },
      { law: 'CRIMINAL', timeline: 'BOTH_CASES' },
      { law: 'WRIT', timeline: 'NEW_CASE' },
      { law: 'WRIT', timeline: 'OLD_CASE' },
      { law: 'WRIT', timeline: 'BOTH_CASES' },
    ];

    for (const { law, timeline } of combinations) {
      const encoded = encodeCaseClassification({ caseLawCategory: law, caseCategory: timeline });
      expect(encoded).toBe(`${law}:${timeline}`);
      expect(parseCaseLawCategory(encoded)).toBe(law);
      expect(parseCaseCategory(encoded)).toBe(timeline);
      expect(getCaseLawCategory({ metaTitle: encoded })).toBe(law);
      expect(getCaseCategory({ metaTitle: encoded })).toBe(timeline);
    }
  });

  // 9. Search combined with every filter
  describe('9. Search combined with every filter in PrescribedCasesView', () => {
    const searchCases: PrescribedCaseItem[] = [
      {
        id: 'c1',
        title: 'Keshav Prasad v. Nepal Government (Contract Breach)',
        content: 'Civil dispute on contract damages',
        metaTitle: 'CIVIL:NEW_CASE',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
      },
      {
        id: 'c2',
        title: 'Keshav Prasad v. District Court (Habeas Corpus)',
        content: 'Constitutional detention challenge',
        metaTitle: 'WRIT:BOTH_CASES',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
      },
      {
        id: 'c3',
        title: 'State v. Sita Ram (Homicide Evidence)',
        content: 'Criminal penal proceedings',
        metaTitle: 'CRIMINAL:OLD_CASE',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
      },
    ];

    it('renders matching search results under ALL filter', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={searchCases}
          unitName="Prescribed Cases"
          initialCategory="ALL"
        />
      );
      expect(html).toContain('Keshav Prasad v. Nepal Government');
      expect(html).toContain('Keshav Prasad v. District Court');
      expect(html).toContain('State v. Sita Ram');
    });

    it('under NEW_CASE filter, only shows New + Both matching cases', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={searchCases}
          unitName="Prescribed Cases"
          initialCategory="NEW_CASE"
        />
      );
      expect(html).toContain('Keshav Prasad v. Nepal Government'); // NEW
      expect(html).toContain('Keshav Prasad v. District Court'); // BOTH
      expect(html).not.toContain('State v. Sita Ram'); // OLD
    });

    it('under BOTH_CASES filter, only shows Both Cases', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={searchCases}
          unitName="Prescribed Cases"
          initialCategory="BOTH_CASES"
        />
      );
      expect(html).toContain('Keshav Prasad v. District Court');
      expect(html).not.toContain('Keshav Prasad v. Nepal Government');
      expect(html).not.toContain('State v. Sita Ram');
    });
  });

  // 10. Correct unit counts without double-counting
  it('10. Prescribed Cases unit card counts Both Cases in New and Old, but counts once in total', () => {
    const rawCases = [
      { id: '1', type: ResourceType.CASE_LAW, metaTitle: 'CIVIL:NEW_CASE' },
      { id: '2', type: ResourceType.CASE_LAW, metaTitle: 'CRIMINAL:OLD_CASE' },
      { id: '3', type: ResourceType.CASE_LAW, metaTitle: 'WRIT:BOTH_CASES' },
      // Dual-published Law Note
      { id: '4', type: ResourceType.LAW_NOTE, metaTitle: 'CIVIL:BOTH_CASES' },
    ];

    // Total count: all 4 cases exactly once
    const totalCount = rawCases.length;
    expect(totalCount).toBe(4);

    // New case count: NEW_CASE + BOTH_CASES
    const newCount = rawCases.filter((c) => {
      const cat = getCaseCategory(c);
      return cat === 'NEW_CASE' || cat === 'BOTH_CASES';
    }).length;
    expect(newCount).toBe(3); // 1, 3, 4

    // Old case count: OLD_CASE + BOTH_CASES
    const oldCount = rawCases.filter((c) => {
      const cat = getCaseCategory(c);
      return cat === 'OLD_CASE' || cat === 'BOTH_CASES';
    }).length;
    expect(oldCount).toBe(3); // 2, 3, 4

    // Both case count
    const bothCount = rawCases.filter((c) => getCaseCategory(c) === 'BOTH_CASES').length;
    expect(bothCount).toBe(2); // 3, 4
  });

  // 11. Admin form validation and submission
  describe('11. AdminResourceForm validation and dual-publishing workflow', () => {
    const semesters = [{ id: SEMESTER_ID, name: '1st Semester' }];
    const subjects = [{ id: SUBJECT_ID, name: 'Constitutional Law', semesterId: SEMESTER_ID }];
    const units = [{ id: UNIT_ID, name: 'General Unit 1', subjectId: SUBJECT_ID }];

    it('renders "Also publish in Case Laws?" for Law Notes', () => {
      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects}
          units={units}
          canManageLawTypes={true}
          initialType={ResourceType.LAW_NOTE}
        />
      );

      expect(html).toContain('Also publish in Case Laws?');
      expect(html).toContain('id="alsoPublishInCaseLaws"');
      // Case Law Classification section is hidden when unchecked
      expect(html).not.toContain('data-testid="case-law-category-section"');
    });

    it('renders Case Law Classification when editing an existing dual-published Law Note', () => {
      const existingDualLawNote = {
        id: 'res-dual-note-1',
        title: 'Dual Published Constitutional Doctrine',
        content: '<p>Content</p>',
        description: 'Summary',
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        unitId: UNIT_ID,
        type: ResourceType.LAW_NOTE,
        isPremium: false,
        priceAmount: 0,
        status: ContentStatus.PUBLISHED,
        authorId: null,
        hasDocument: false,
        caseCategory: 'BOTH_CASES' as const,
        caseLawCategory: 'CIVIL' as const,
        metaTitle: 'CIVIL:BOTH_CASES',
      };

      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects}
          units={units}
          canManageLawTypes={true}
          resource={existingDualLawNote}
        />
      );

      expect(html).toContain('Also publish in Case Laws?');
      expect(html).toContain('checked=""');
      expect(html).toContain('data-testid="case-law-category-section"');
      expect(html).toContain('Civil Cases');
      expect(html).toContain('Case Law Timeline Filter');
      expect(html).toContain('Both');
    });
  });

  // 12. Responsive rendering of the Write sidebar
  describe('12. Responsive rendering and polish of the Write sidebar', () => {
    const semesters = [{ id: SEMESTER_ID, name: '1st Semester' }];
    const subjects = [{ id: SUBJECT_ID, name: 'Constitutional Law', semesterId: SEMESTER_ID }];
    const units = [{ id: UNIT_ID, name: 'Unit 1', subjectId: SUBJECT_ID }];

    it('renders polished mode switch cards with Upload PDF and Write Note', () => {
      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects}
          units={units}
          canManageLawTypes={true}
          initialType={ResourceType.LAW_NOTE}
        />
      );

      expect(html).toContain('Choose Publishing Mode');
      expect(html).toContain('Upload PDF Document');
      expect(html).toContain('Write Online Note');
      expect(html).toContain('Attach a downloadable syllabus');
      expect(html).toContain('Draft rich-text notes with English &amp; Nepali fonts');
    });

    it('renders polished metadata sidebar with structured Title card and Publishing Actions in Write mode', () => {
      const existingWrittenNote = {
        id: 'written-note-1',
        title: 'Landmark Judicial Review Law Note',
        content: '<p>Detailed written analysis of review power.</p>',
        description: null,
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        unitId: UNIT_ID,
        type: ResourceType.LAW_NOTE,
        isPremium: false,
        priceAmount: null,
        status: ContentStatus.PUBLISHED,
        authorId: null,
        hasDocument: false,
        metaTitle: null,
      };

      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects}
          units={units}
          canManageLawTypes={true}
          resource={existingWrittenNote}
        />
      );

      // Verify the Write mode layout
      expect(html).toContain('resource-note-layout');
      expect(html).toContain('resource-metadata-sidebar');

      // Verify polished Title card
      expect(html).toContain('Resource Title');
      expect(html).toContain('Landmark Judicial Review Law Note');

      // Verify Publishing Actions card
      expect(html).toContain('Publishing Actions');
      expect(html).toContain('Save &amp; Publish');
      expect(html).toContain('Save Draft');
      expect(html).toContain('Preview');

      // Verify sidebar section cards with icons
      expect(html).toContain('Classification');
      expect(html).toContain('Semester &amp; Subject');
      expect(html).toContain('Access &amp; Visibility');
      expect(html).toContain('Authorship');
      expect(html).toContain('Media');
    });
  });
});
