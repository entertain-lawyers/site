import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-pageflip', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-flipbook">{children}</div>
  ),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 5,
      getPage: vi.fn().mockResolvedValue({
        getViewport: () => ({ width: 800, height: 1100 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
      destroy: vi.fn(),
    }),
  })),
}));

import SecurePdfViewer from '@/components/SecurePdfViewer';

describe('SecurePdfViewer Component', () => {
  it('renders preparing pages loading state when document is initializing', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Confidential']}
      />
    );

    expect(html).toContain('Preparing pages…');
  });

  it('renders with Book Mode as sensible default when loaded', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Confidential', 'Licensed to User 123']}
        initialNumPages={5}
      />
    );

    // Mode buttons
    expect(html).toContain('Book Mode');
    expect(html).toContain('Single Page');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');

    // Zoom controls
    expect(html).toContain('Zoom Out');
    expect(html).toContain('Zoom In');
    expect(html).toContain('Reset Zoom');
    expect(html).toContain('100%');
  });

  it('supports initialMode="single" for Single Page Mode', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['User 123']}
        initialMode="single"
        initialNumPages={5}
      />
    );

    expect(html).toContain('Book Mode');
    expect(html).toContain('Single Page');
    expect(html).toContain('100%');
    expect(html).toContain('<canvas');
  });

  it('renders navigation controls for page browsing', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Test Watermark']}
        initialMode="single"
        initialNumPages={5}
      />
    );

    expect(html).toContain('aria-label="First page"');
    expect(html).toContain('aria-label="Previous page"');
    expect(html).toContain('aria-label="Next page"');
    expect(html).toContain('aria-label="Last page"');
    expect(html).toContain('aria-label="Go to page"');
  });
});
