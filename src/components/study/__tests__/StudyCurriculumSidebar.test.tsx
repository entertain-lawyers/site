import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StudyCurriculumSidebar from '@/components/study/StudyCurriculumSidebar';

describe('StudyCurriculumSidebar Component', () => {
  const mockUnits = [
    {
      id: 'unit-1',
      name: 'Unit 1: Introduction to Jurisprudence',
      resources: [
        { id: 'res-1', title: 'Definition and Nature of Law', type: 'LAW_NOTE' },
        { id: 'res-2', title: 'Schools of Legal Thought', type: 'LAW_NOTE' },
      ],
    },
    {
      id: 'unit-2',
      name: 'Unit 2: Landmark Precedents',
      resources: [
        { id: 'res-3', title: 'Kesavananda Bharati Doctrine', type: 'CASE_LAW' },
      ],
    },
  ];

  it('renders the compact single-screen header with subject, semester, and topic count', () => {
    const html = renderToStaticMarkup(
      <StudyCurriculumSidebar
        semesterName="Semester 1"
        subjectName="Jurisprudence"
        currentResourceId="res-1"
        units={mockUnits}
      />
    );

    expect(html).toContain('Syllabus Navigator');
    expect(html).toContain('Semester 1');
    expect(html).toContain('Jurisprudence');
    expect(html).toContain('3 topics');
    expect(html).toContain('max-h-[calc(100vh-7rem)]');
  });

  it('renders Next in Syllabus pill pointing to the next sequential topic', () => {
    const html = renderToStaticMarkup(
      <StudyCurriculumSidebar
        semesterName="Semester 1"
        subjectName="Jurisprudence"
        currentResourceId="res-1"
        units={mockUnits}
      />
    );

    expect(html).toContain('Next in Syllabus');
    expect(html).toContain('Schools of Legal Thought');
    expect(html).toContain('href="/read/res-2"');
  });

  it('renders Previous topic navigation pill when active resource is later in sequence', () => {
    const html = renderToStaticMarkup(
      <StudyCurriculumSidebar
        semesterName="Semester 1"
        subjectName="Jurisprudence"
        currentResourceId="res-2"
        units={mockUnits}
      />
    );

    expect(html).toContain('Prev: Definition and Nature of Law');
    expect(html).toContain('href="/read/res-1"');
    expect(html).toContain('Next in Syllabus');
    expect(html).toContain('Kesavananda Bharati Doctrine');
  });

  it('expands only the active unit by default to keep vertical height minimal', () => {
    const html = renderToStaticMarkup(
      <StudyCurriculumSidebar
        semesterName="Semester 1"
        subjectName="Jurisprudence"
        currentResourceId="res-1"
        units={mockUnits}
      />
    );

    // Active resource res-1 in Unit 1 is rendered inside the expanded unit
    expect(html).toContain('Definition and Nature of Law');
    expect(html).toContain('Schools of Legal Thought');

    // Unit 2 is not expanded initially so Kesavananda Bharati Doctrine is not rendered
    expect(html).not.toContain('Kesavananda Bharati Doctrine');
  });

  it('renders compact footer link to /study', () => {
    const html = renderToStaticMarkup(
      <StudyCurriculumSidebar
        semesterName="Semester 1"
        subjectName="Jurisprudence"
        currentResourceId="res-1"
        units={mockUnits}
      />
    );

    expect(html).toContain('href="/study"');
    expect(html).toContain('All Subjects &amp; Syllabus →');
  });
});
