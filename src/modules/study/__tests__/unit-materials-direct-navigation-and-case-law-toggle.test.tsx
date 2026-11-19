/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResourceType, ContentStatus } from '@prisma/client';
import StudyCardNavigator from '@/components/study/StudyCardNavigator';
import { AdminResourceForm } from '@/components/admin/AdminResourceForm';
import {
  encodeCaseClassification,
  parseCaseCategory,
  parseCaseLawCategory,
  getCaseCategory,
  getCaseLawCategory,
  isPrescribedCasesUnit,
} from '@/lib/case-category';
import PrescribedCasesView, { PrescribedCaseItem } from '@/components/study/PrescribedCasesView';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/modules/admin/admin-resource.actions', () => ({
  createResourceAction: vi.fn(),
  updateResourceAction: vi.fn(),
  deleteResourceAction: vi.fn(),
}));

vi.mock('@/modules/admin/admin-document.actions', () => ({
  initiateDocumentUpload: vi.fn(),
  confirmDocumentUpload: vi.fn(),
}));

vi.mock('@/lib/post-preview', () => ({
  writePostPreviewDraft: vi.fn(),
}));

describe('Unit Materials Visibility & Direct Unit Navigation Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('semester=sem-1&subject=sub-company-law');
  });

  describe('1. Unit Cards Material Count & Subtitle Display in StudyCardNavigator', () => {
    it('displays single resource title as subtitle and links directly to /resources/[id] when unit has exactly 1 material', () => {
      const units = [
        {
          id: 'unit-1',
          name: 'Unit 1',
          title: 'Introduction to Company Law',
          resourceCount: 1,
          singleResourceId: 'res-cashflow-ai-101',
          singleResourceTitle: 'CashFlow_AI Corporate Financial Planning Note',
        },
      ];

      const html = renderToStaticMarkup(
        <StudyCardNavigator
          semesters={[{ id: 'sem-1', name: '1st Semester', order: 1 }]}
          subjects={[{ id: 'sub-company-law', name: 'Company Law', order: 1 }]}
          units={units}
          selectedSemesterId="sem-1"
          selectedSubjectId="sub-company-law"
        />
      );

      // Verify that "No Materials Yet" is NOT displayed
      expect(html).not.toContain('No Materials Yet');

      // Verify that the actual resource title is displayed as the subtitle
      expect(html).toContain('CashFlow_AI Corporate Financial Planning Note');

      // Verify that the link points directly to the resource reader, bypassing intermediate unit view
      expect(html).toContain('href="/resources/res-cashflow-ai-101"');
    });

    it('displays "X Materials Available" and links to unit drill-down when unit has multiple materials', () => {
      const units = [
        {
          id: 'unit-2',
          name: 'Unit 2',
          title: 'Directors & Corporate Governance',
          resourceCount: 3,
          singleResourceId: null,
          singleResourceTitle: null,
        },
      ];

      const html = renderToStaticMarkup(
        <StudyCardNavigator
          semesters={[{ id: 'sem-1', name: '1st Semester', order: 1 }]}
          subjects={[{ id: 'sub-company-law', name: 'Company Law', order: 1 }]}
          units={units}
          selectedSemesterId="sem-1"
          selectedSubjectId="sub-company-law"
        />
      );

      // Verify "3 Materials Available" subtitle
      expect(html).toContain('3 Materials Available');

      // Verify it links to unit view
      expect(html).toContain('unit=unit-2');
    });

    it('displays "No Materials Yet" when unit has 0 published resources', () => {
      const units = [
        {
          id: 'unit-3',
          name: 'Unit 3',
          title: null,
          resourceCount: 0,
          singleResourceId: null,
          singleResourceTitle: null,
        },
      ];

      const html = renderToStaticMarkup(
        <StudyCardNavigator
          semesters={[{ id: 'sem-1', name: '1st Semester', order: 1 }]}
          subjects={[{ id: 'sub-company-law', name: 'Company Law', order: 1 }]}
          units={units}
          selectedSemesterId="sem-1"
          selectedSubjectId="sub-company-law"
        />
      );

      expect(html).toContain('No Materials Yet');
      expect(html).toContain('unit=unit-3');
    });

    it('displays "X New • Y Old Cases" subtitle for Prescribed Cases unit card', () => {
      const units = [
        {
          id: 'virtual-unit-cases',
          name: 'Prescribed Cases',
          title: 'Landmark Precedents',
          resourceCount: 5,
          newCaseCount: 2,
          oldCaseCount: 3,
        },
      ];

      const html = renderToStaticMarkup(
        <StudyCardNavigator
          semesters={[{ id: 'sem-1', name: '1st Semester', order: 1 }]}
          subjects={[{ id: 'sub-company-law', name: 'Company Law', order: 1 }]}
          units={units}
          selectedSemesterId="sem-1"
          selectedSubjectId="sub-company-law"
        />
      );

      expect(html).toContain('2 New • 3 Old Cases');
      expect(html).toContain('unit=virtual-unit-cases');
    });
  });

  describe('2. AdminResourceForm: Optional "Also publish in Case Laws?" setting', () => {
    const semesters = [{ id: 'sem-1', name: '1st Semester' }];
    const subjects = [{ id: 'sub-1', name: 'Constitutional Law', semesterId: 'sem-1' }];
    const units = [{ id: 'unit-cases', name: 'Prescribed Cases', subjectId: 'sub-1' }];

    it('defaults "Also publish in Case Laws?" to OFF (unchecked) when creating a Case Law', () => {
      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects}
          units={units}
          canManageLawTypes={true}
          initialType={ResourceType.CASE_LAW}
        />
      );

      // Verify Case Category is rendered
      expect(html).toContain('Case Category');
      expect(html).toContain('New Case');
      expect(html).toContain('Old Case');

      // Verify "Also publish in Case Laws?" toggle exists and is NOT checked by default
      expect(html).toContain('Also publish in Case Laws?');
      expect(html).toContain('id="alsoPublishInCaseLaws"');

      // Since it is default OFF, Case Law Classification (Civil, Criminal, Writ) should NOT be rendered
      expect(html).not.toContain('data-testid="case-law-category-section"');
    });

    it('correctly initializes "Also publish in Case Laws?" as ON when editing a resource that has a case law classification', () => {
      const existingResource = {
        id: 'res-case-1',
        title: 'Landmark Civil Case on Property',
        content: '<p>Content</p>',
        description: 'Summary',
        semesterId: 'sem-1',
        subjectId: 'sub-1',
        unitId: 'unit-cases',
        type: ResourceType.CASE_LAW,
        isPremium: false,
        priceAmount: 0,
        status: ContentStatus.PUBLISHED,
        authorId: null,
        hasDocument: false,
        caseCategory: 'NEW_CASE' as const,
        caseLawCategory: 'CIVIL' as const,
        metaTitle: 'CIVIL:NEW_CASE',
      };

      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects}
          units={units}
          canManageLawTypes={true}
          resource={existingResource}
        />
      );

      // Verify "Also publish in Case Laws?" checkbox is rendered as checked
      expect(html).toContain('id="alsoPublishInCaseLaws"');
      expect(html).toContain('checked=""');

      // Verify Case Law Classification section is rendered with Civil selected
      expect(html).toContain('data-testid="case-law-category-section"');
      expect(html).toContain('Civil Cases');
      expect(html).toContain('Criminal Cases');
      expect(html).toContain('Writ Cases');
    });
  });

  describe('3. Classification Encoding & Compatibility Helpers', () => {
    it('encodes only Case Category when Case Law Classification is null (Also publish in Case Laws = OFF)', () => {
      const encoded = encodeCaseClassification({
        caseCategory: 'NEW_CASE',
        caseLawCategory: null,
      });

      expect(encoded).toBe('NEW_CASE');
      expect(parseCaseCategory(encoded)).toBe('NEW_CASE');
      expect(parseCaseLawCategory(encoded)).toBe(null);
      expect(getCaseCategory({ metaTitle: encoded })).toBe('NEW_CASE');
      expect(getCaseLawCategory({ metaTitle: encoded })).toBe(null);
    });

    it('encodes composite string when both Case Law Classification and Case Category are active (Also publish in Case Laws = ON)', () => {
      const encoded = encodeCaseClassification({
        caseCategory: 'OLD_CASE',
        caseLawCategory: 'CRIMINAL',
      });

      expect(encoded).toBe('CRIMINAL:OLD_CASE');
      expect(parseCaseCategory(encoded)).toBe('OLD_CASE');
      expect(parseCaseLawCategory(encoded)).toBe('CRIMINAL');
      expect(getCaseCategory({ metaTitle: encoded })).toBe('OLD_CASE');
      expect(getCaseLawCategory({ metaTitle: encoded })).toBe('CRIMINAL');
    });

    it('gracefully parses legacy unclassified cases with only Case Law classification', () => {
      const encoded = 'WRIT';
      expect(parseCaseLawCategory(encoded)).toBe('WRIT');
      expect(parseCaseCategory(encoded)).toBe(null);
      expect(getCaseLawCategory({ metaTitle: encoded })).toBe('WRIT');
      expect(getCaseCategory({ metaTitle: encoded })).toBe(null);
    });
  });

  describe('4. Prescribed Cases Filtering & Search Integration', () => {
    const testCases: PrescribedCaseItem[] = [
      {
        id: 'case-new-civil',
        title: 'Case No. 079-CI-001: Supreme Court Civil Landmark on Inheritance',
        content: 'Property partition decree and female coparcenary rights.',
        metaTitle: 'CIVIL:NEW_CASE',
        metaDesc: 'Partition and coparcenary summary',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
        canAccess: true,
      },
      {
        id: 'case-old-criminal',
        title: 'Case No. 045-CR-012: Full Bench Criminal Precedent on Self Defense',
        content: 'Private defense principles in penal jurisprudence.',
        metaTitle: 'CRIMINAL:OLD_CASE',
        metaDesc: 'Self defense doctrine',
        documentId: null,
        isPremium: true,
        priceAmount: 25000,
        canAccess: false,
      },
      {
        id: 'case-legacy-unclassified',
        title: 'Constitutional Writ 2058: Right to Information and Transparency',
        content: 'Fundamental rights petition under Article 27.',
        metaTitle: 'WRIT', // Legacy unclassified for New/Old
        metaDesc: 'Right to information precedent',
        documentId: null,
        isPremium: false,
        priceAmount: 0,
        canAccess: true,
      },
    ];

    it('includes all cases including legacy unclassified cases when viewing All Cases', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={testCases}
          unitName="Prescribed Cases"
          unitTitle="Curriculum Case Laws"
          initialCategory="ALL"
        />
      );

      // Verify all 3 cases appear under All Cases
      expect(html).toContain('All Cases (3)');
      expect(html).toContain('New Cases (1)');
      expect(html).toContain('Old Cases (1)');

      expect(html).toContain('Case No. 079-CI-001');
      expect(html).toContain('Case No. 045-CR-012');
      expect(html).toContain('Constitutional Writ 2058');
    });

    it('filters strictly to New Cases when NEW_CASE filter is selected', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={testCases}
          unitName="Prescribed Cases"
          unitTitle="Curriculum Case Laws"
          initialCategory="NEW_CASE"
        />
      );

      expect(html).toContain('Case No. 079-CI-001');
      expect(html).not.toContain('Case No. 045-CR-012');
      expect(html).not.toContain('Constitutional Writ 2058');
    });

    it('filters strictly to Old Cases when OLD_CASE filter is selected', () => {
      const html = renderToStaticMarkup(
        <PrescribedCasesView
          cases={testCases}
          unitName="Prescribed Cases"
          unitTitle="Curriculum Case Laws"
          initialCategory="OLD_CASE"
        />
      );

      expect(html).toContain('Case No. 045-CR-012');
      expect(html).not.toContain('Case No. 079-CI-001');
      expect(html).not.toContain('Constitutional Writ 2058');
    });
  });
});
