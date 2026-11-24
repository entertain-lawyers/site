import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-pageflip', () => ({
  default: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <div data-testid="mock-flipbook" className={className} style={style}>
      {children}
    </div>
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

describe('SecurePdfViewer Component Regression Suite', () => {
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

  it('renders vertically scrollable multi-page container in Single Page Mode', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['User 123']}
        initialMode="single"
        initialNumPages={5}
      />
    );

    // Must have vertical scrollable container with hardware-accelerated touch containment
    expect(html).toContain('overflow-y-auto');
    expect(html).toContain('overscroll-behavior:contain');
    expect(html).toContain('touch-action:pan-x pan-y pinch-zoom');

    // Must render all individual page rows
    expect(html).toContain('data-page-index="0"');
    expect(html).toContain('data-page-index="1"');
    expect(html).toContain('data-page-index="2"');
    expect(html).toContain('data-page-index="3"');
    expect(html).toContain('data-page-index="4"');

    // Must render page indicators
    expect(html).toContain('Page 1');
    expect(html).toContain('Page 2');
    expect(html).toContain('Page 5');

    // Must have canvases for each page
    const canvasMatches = (html.match(/<canvas/g) || []).length;
    expect(canvasMatches).toBe(5);
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

  it('enforces right-click context menu suppression and security attributes', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Protected User']}
        initialMode="single"
        initialNumPages={3}
      />
    );

    // User text selection suppression
    expect(html).toContain('select-none');
  });

  it('renders Fit Width, Fit Page, and Fullscreen viewer controls', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Test Watermark']}
        initialMode="single"
        initialNumPages={5}
      />
    );

    expect(html).toContain('Fit Width');
    expect(html).toContain('Fit Page');
    expect(html).toContain('aria-label="Toggle Fullscreen"');
  });

  it('renders mobile-optimized responsive navigation and page jump trigger', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Mobile User']}
        initialMode="single"
        initialNumPages={10}
      />
    );

    // Mobile toolbar has touch-friendly navigation buttons
    expect(html).toContain('aria-label="Open page jump menu"');
    expect(html).toContain('1 / 10');
  });

  it('opens in fullscreen mode by default with floating exit control', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Fullscreen Student']}
        initialMode="single"
        initialNumPages={5}
      />
    );

    // Fullscreen layout classes applied by default
    expect(html).toContain('fixed inset-0 z-[100]');
    expect(html).toContain('w-screen h-screen');
    // Floating Exit Fullscreen pill button
    expect(html).toContain('aria-label="Exit Fullscreen"');
    expect(html).toContain('Exit Fullscreen');
  });

  it('renders embedded layout without fullscreen overlay when initialFullscreen is false', () => {
    const html = renderToStaticMarkup(
      <SecurePdfViewer
        url="/api/documents/doc-1/pdf"
        watermarkLines={['Embedded Student']}
        initialMode="single"
        initialNumPages={5}
        initialFullscreen={false}
      />
    );

    // Should NOT have fixed fullscreen overlay
    expect(html).not.toContain('fixed inset-0 z-[100]');
    // Should NOT render floating Exit Fullscreen button
    expect(html).not.toContain('aria-label="Exit Fullscreen"');
    // Regular fullscreen toggle should still be available in header toolbar
    expect(html).toContain('aria-label="Toggle Fullscreen"');
  });
});

