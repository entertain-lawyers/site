/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EditorTableTools, { buildTableGrid, findCellCoordinates } from '../EditorTableTools';

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

  it('correctly maps 2D table grid with rowspans and colspans via buildTableGrid', () => {
    const createCell = (id: string, rowspan = 1, colspan = 1) => ({
      id,
      matches: (sel: string) => sel.includes('td'),
      getAttribute: (name: string) => {
        if (name === 'rowspan') return String(rowspan);
        if (name === 'colspan') return String(colspan);
        return null;
      },
    });

    const c00 = createCell('c00', 1, 2);
    const c02 = createCell('c02', 1, 1);
    const c10 = createCell('c10', 2, 1);
    const c11 = createCell('c11', 1, 1);
    const c12 = createCell('c12', 1, 1);
    const c21 = createCell('c21', 1, 1);
    const c22 = createCell('c22', 1, 1);

    const r0 = { children: [c00, c02] };
    const r1 = { children: [c10, c11, c12] };
    const r2 = { children: [c21, c22] };

    const mockTable: any = {
      querySelectorAll: (sel: string) => (sel === 'tr' ? [r0, r1, r2] : []),
    };

    const grid = buildTableGrid(mockTable);

    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(3);

    // c00 spans columns 0 and 1 in row 0
    expect(grid[0][0]).toBe(c00);
    expect(grid[0][1]).toBe(c00);
    expect(grid[0][2]).toBe(c02);

    // c10 spans rows 1 and 2 in column 0
    expect(grid[1][0]).toBe(c10);
    expect(grid[2][0]).toBe(c10);

    // Find coordinates
    expect(findCellCoordinates(grid, c00 as any)).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(findCellCoordinates(grid, c02 as any)).toEqual({ rowIndex: 0, colIndex: 2 });
    expect(findCellCoordinates(grid, c10 as any)).toEqual({ rowIndex: 1, colIndex: 0 });
    expect(findCellCoordinates(grid, c22 as any)).toEqual({ rowIndex: 2, colIndex: 2 });
  });
});
