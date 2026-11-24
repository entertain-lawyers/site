import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MobileStudyOutlineDrawer from '../MobileStudyOutlineDrawer';

const MOCK_UNITS = [
  {
    id: 'unit-1',
    name: 'Unit 1: Introduction to Jurisprudence',
    title: 'Foundations of Law',
    resources: [
      { id: 'res-1', title: 'Natural Law Theory', type: 'LAW_NOTE' },
      { id: 'res-2', title: 'Legal Positivism Overview', type: 'LAW_NOTE' },
    ],
  },
  {
    id: 'unit-2',
    name: 'Unit 2: Landmark Prescribed Cases',
    title: 'Constitutional Precedents',
    resources: [
      { id: 'res-3', title: 'Marbury v. Madison Analysis', type: 'CASE_LAW' },
    ],
  },
];

describe('MobileStudyOutlineDrawer Component Suite', () => {
  it('renders mobile trigger button with accessible label and syllabus indicator', () => {
    const html = renderToStaticMarkup(
      <MobileStudyOutlineDrawer
        units={MOCK_UNITS}
        currentResourceId="res-1"
        currentUnitId="unit-1"
      />
    );

    expect(html).toContain('aria-label="Open syllabus outline navigator"');
    expect(html).toContain('Syllabus');
  });

  it('keeps drawer initially closed during SSR and static render to preserve clean DOM', () => {
    const html = renderToStaticMarkup(
      <MobileStudyOutlineDrawer
        units={MOCK_UNITS}
        currentResourceId="res-1"
        currentUnitId="unit-1"
      />
    );

    // Dialog is unmounted when closed
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('Natural Law Theory');
  });
});
