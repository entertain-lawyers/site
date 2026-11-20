import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PrescribedCasesView, { PrescribedCaseItem } from '@/components/study/PrescribedCasesView';

const MOCK_CASES: PrescribedCaseItem[] = [
  {
    id: 'case-1',
    title: 'Rita Khadka v. Government of Nepal (2080)',
    content: 'Landmark decision on reproductive rights and surrogacy contracts.',
    metaTitle: 'NEW_CASE:CIVIL',
    metaDesc: 'Surrogacy rights landmark case',
    documentId: 'doc-1',
    isPremium: false,
    priceAmount: 0,
    author: {
      name: 'Advocate Sharma',
      image: null,
      bio: 'Constitutional law expert',
      role: 'Contributor',
      website: null,
      email: null,
    },
    canAccess: true,
  },
  {
    id: 'case-2',
    title: 'Annapurna v. State (2034) Full Bench',
    content: 'Historic ruling on coparcenary property and daughter inheritance rights.',
    metaTitle: 'OLD_CASE:CIVIL',
    metaDesc: 'Property inheritance partition landmark',
    documentId: 'doc-2',
    isPremium: true,
    priceAmount: 50000,
    author: {
      name: 'Senior Advocate Bhattarai',
      image: null,
      bio: 'Civil litigation specialist',
      role: 'Contributor',
      website: null,
      email: null,
    },
    canAccess: false,
  },
  {
    id: 'case-3',
    title: 'State v. Ram Bahadur Thapa (2045) Homicide Precedent',
    content: 'Criminal jurisprudence on grave and sudden provocation.',
    metaTitle: 'CRIMINAL', // Unclassified for New/Old (legacy) but has Criminal Case Law category
    metaDesc: 'Provocation doctrine in criminal homicide',
    documentId: null,
    isPremium: false,
    priceAmount: 0,
    author: null,
    canAccess: true,
  },
];

describe('PrescribedCasesView Component', () => {
  it('renders all cases by default under All Cases view (including legacy unclassified)', () => {
    const html = renderToStaticMarkup(
      <PrescribedCasesView
        cases={MOCK_CASES}
        unitName="Prescribed Cases"
        unitTitle="Landmark Prescribed Cases"
        subjectName="Family Law"
        semesterName="4th Semester"
      />
    );

    // Header information
    expect(html).toContain('Prescribed Cases');
    expect(html).toContain('Landmark Prescribed Cases');
    expect(html).toContain('Family Law');
    expect(html).toContain('4th Semester');
    expect(html).toContain('Total: <strong class="text-navy dark:text-white">3</strong> Cases');

    // Filter pills and dropdown options with counts
    expect(html).toContain('All Cases (3)');
    expect(html).toContain('New Syllabus (1)');
    expect(html).toContain('Old Syllabus (1)');
    expect(html).toContain('Short list: All');
    expect(html).toContain('New Syllabus</option>');
    expect(html).toContain('Old Syllabus</option>');

    // All 3 cases are rendered
    expect(html).toContain('Rita Khadka v. Government of Nepal (2080)');
    expect(html).toContain('Annapurna v. State (2034) Full Bench');
    expect(html).toContain('State v. Ram Bahadur Thapa (2045) Homicide Precedent');

    // Badges
    expect(html).toContain('data-case-category="NEW_CASE"');
    expect(html).toContain('data-case-category="OLD_CASE"');
    expect(html).toContain('data-case-law-category="CIVIL"');
    expect(html).toContain('data-case-law-category="CRIMINAL"');

    // Access indicators
    expect(html).toContain('Free');
    expect(html).toContain('Premium (Rs. 500)');
  });

  it('renders ONLY New Cases when initialCategory is NEW_CASE', () => {
    const html = renderToStaticMarkup(
      <PrescribedCasesView
        cases={MOCK_CASES}
        unitName="Prescribed Cases"
        unitTitle="Landmark Prescribed Cases"
        initialCategory="NEW_CASE"
      />
    );

    expect(html).toContain('Rita Khadka v. Government of Nepal (2080)');
    expect(html).toContain('data-case-category="NEW_CASE"');

    // Old Case and unclassified cases should NOT be rendered
    expect(html).not.toContain('Annapurna v. State (2034) Full Bench');
    expect(html).not.toContain('State v. Ram Bahadur Thapa (2045) Homicide Precedent');
  });

  it('renders ONLY Old Cases when initialCategory is OLD_CASE', () => {
    const html = renderToStaticMarkup(
      <PrescribedCasesView
        cases={MOCK_CASES}
        unitName="Prescribed Cases"
        unitTitle="Landmark Prescribed Cases"
        initialCategory="OLD_CASE"
      />
    );

    expect(html).toContain('Annapurna v. State (2034) Full Bench');
    expect(html).toContain('data-case-category="OLD_CASE"');

    // New Case and unclassified cases should NOT be rendered
    expect(html).not.toContain('Rita Khadka v. Government of Nepal (2080)');
    expect(html).not.toContain('State v. Ram Bahadur Thapa (2045) Homicide Precedent');
  });

  it('orders cases by syllabus order, not alphabetically', () => {
    const ordered: PrescribedCaseItem[] = [
      { ...MOCK_CASES[0], id: 'c-z', title: 'Zulu v. State (2081)', order: 1 },
      { ...MOCK_CASES[1], id: 'c-a', title: 'Alpha v. State (2082)', order: 2 },
      { ...MOCK_CASES[2], id: 'c-m', title: 'Mike v. State (2080)', order: 3 },
    ];

    const html = renderToStaticMarkup(
      <PrescribedCasesView cases={ordered} unitName="Prescribed Cases" unitTitle="Landmark Prescribed Cases" />
    );

    // Left column holds items 1 and 3, right column item 2, so DOM order is Zulu, Mike, Alpha.
    const positions = ['Zulu v. State (2081)', 'Mike v. State (2080)', 'Alpha v. State (2082)'].map((title) =>
      html.indexOf(title)
    );
    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).not.toContain('Alphabetical Order');
  });

  it('renders clean empty state with Reset Filters button when no cases match', () => {
    const html = renderToStaticMarkup(
      <PrescribedCasesView
        cases={[]}
        unitName="Prescribed Cases"
        unitTitle="Landmark Prescribed Cases"
      />
    );

    expect(html).toContain('No prescribed cases found');
    expect(html).toContain('Reset Filters');
  });
});
