/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EditorTableTools from '../EditorTableTools';

describe('EditorTableTools Component', () => {
  const dummyQuill: any = {
    root: { contains: () => false, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    focus: vi.fn(),
    getSelection: vi.fn().mockReturnValue({ index: 0, length: 0 }),
    setSelection: vi.fn(),
    getLength: vi.fn().mockReturnValue(1),
    getModule: vi.fn().mockReturnValue({}),
    on: vi.fn(),
    off: vi.fn(),
    update: vi.fn(),
  };

  it('renders Insert Table dialog in visual grid mode when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <EditorTableTools
        getQuill={() => dummyQuill}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Insert Table');
    expect(html).toContain('Visual Grid');
    expect(html).toContain('Custom Config');
    expect(html).toContain('Include Header Row');
    expect(html).toContain('Quick Presets:');
    // Ensure 8 columns in the CSS grid
    expect(html).toContain('grid-template-columns:repeat(8, 24px)');
    expect(html).toContain('grid-template-rows:repeat(8, 24px)');
    // 8x8 = 64 grid cells rendered
    expect(html).toContain('8 rows by 8 columns');
  });

  it('renders nothing when isOpen is false and not inside table', () => {
    const html = renderToStaticMarkup(
      <EditorTableTools
        getQuill={() => dummyQuill}
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });
});
