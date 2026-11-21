import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StudyCurriculumSidebar from '@/components/study/StudyCurriculumSidebar';

describe('StudyCurriculumSidebar Component', () => {
  const mockUnits = [
    {
      id: 'unit-1',
      name: 'Unit 1',
      title: 'Introduction to Jurisprudence',
      resources: [
        { id: 'res-1', title: 'Definition and Nature of Law', type: 'LAW_NOTE' },
        { id: 'res-2', title: 'Schools of Legal Thought', type: 'LAW_NOTE' },
      ],
    },
    {
      id: 'unit-2',
      name: 'Unit 2',
      title: 'Landmark Precedents',
      resources: [
        { id: 'res-3', title: 'Kesavananda Bharati Doctrine', type: 'CASE_LAW' },
      ],
    },
  ];

  it('renders the compact single-screen header with subject, semester, and unit count', () => {
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
    expect(html).toContain('2 units');
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

  it('renders directly clickable unit pills formatted as Unit: It\'s Title without dropdown options', () => {
    const html = renderToStaticMarkup(
      <StudyCurriculumSidebar
        semesterName="Semester 1"
        subjectName="Jurisprudence"
        currentResourceId="res-1"
        units={mockUnits}
      />
    );

    // Formatted as "Unit: It's Title"
    expect(html).toContain('Unit 1: Introduction to Jurisprudence');
    expect(html).toContain('Unit 2: Landmark Precedents');

    // Units are directly clickable links to reading view
    expect(html).toContain('href="/read/res-1"');
    expect(html).toContain('href="/read/res-3"');

    // No accordion dropdown buttons or sub-topic lists
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('rotate-180');
  });

  it('applies the active blue styling (bg-accent text-white) to current reading unit and clickable style to others', () => {
    const html = renderToStaticMarkup(
      <StudyCurriculumSidebar
        semesterName="Semester 1"
        subjectName="Jurisprudence"
        currentResourceId="res-1"
        units={mockUnits}
      />
    );

    // Active unit has solid blue part styling
    expect(html).toContain('bg-accent text-white font-bold shadow-xs border border-accent');
    expect(html).toContain('aria-label="Current Unit"');

    // Inactive unit has clickable blue-tinted border styling
    expect(html).toContain('bg-accent/5 text-navy dark:text-white border border-accent/20');
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
