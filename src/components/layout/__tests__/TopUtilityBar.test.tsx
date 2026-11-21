import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TopUtilityBar from '@/components/layout/TopUtilityBar';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('TopUtilityBar Component', () => {
  const mockDict = {
    dateLabel: 'Date',
    nepali: 'NEPALI',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  beforeEach(() => {
    mockPathname = '/';
  });

  it('renders date, time and theme toggle on homepage', () => {
    mockPathname = '/';
    const html = renderToStaticMarkup(<TopUtilityBar locale="en" dict={mockDict} />);

    expect(html).not.toBe('');
    expect(html).toContain('aria-label="Switch to dark theme"');
    expect(html).toContain('NEPALI');
  });

  it('renders date, time and theme toggle on reading pages (/read/[resourceId])', () => {
    mockPathname = '/read/eb792a15-98bf-432f-bf3b-edc9724431d7';
    const html = renderToStaticMarkup(<TopUtilityBar locale="en" dict={mockDict} />);

    expect(html).not.toBe('');
    expect(html).toContain('aria-label="Switch to dark theme"');
    expect(html).toContain('NEPALI');
  });

  it('hides on /admin routes where admin panel has its own navigation', () => {
    mockPathname = '/admin/posts';
    const html = renderToStaticMarkup(<TopUtilityBar locale="en" dict={mockDict} />);

    expect(html).toBe('');
  });
});
