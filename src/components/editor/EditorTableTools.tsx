'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Grid,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Combine,
  Split,
  Paintbrush,
  Columns,
  Rows,
  Maximize2,
  Minimize2,
  Check,
  Heading,
} from 'lucide-react';

/* Minimal surface of the Quill 2 instance this component uses */
type QuillLike = {
  root: HTMLElement;
  focus: () => void;
  getSelection: (focus?: boolean) => { index: number; length: number } | null;
  setSelection: (index: number, length?: number, source?: string) => void;
  getLength: () => number;
  getModule: (name: string) => any;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  update: (source?: string) => void;
};

interface EditorTableToolsProps {
  getQuill: () => QuillLike | null;
  isOpen: boolean;
  onClose: () => void;
  onContentChange?: () => void;
}

const GRID_MAX_ROWS = 8;
const GRID_MAX_COLS = 8;

// Curated soft background swatches for document tables
const CELL_BG_SWATCHES = [
  { label: 'Clear', value: '', colorClass: 'bg-transparent border-dashed' },
  { label: 'Slate', value: '#f8fafc', colorClass: 'bg-slate-50' },
  { label: 'Soft Blue', value: '#eff6ff', colorClass: 'bg-blue-50' },
  { label: 'Soft Amber', value: '#fefce8', colorClass: 'bg-amber-50' },
  { label: 'Soft Emerald', value: '#f0fdf4', colorClass: 'bg-emerald-50' },
  { label: 'Soft Purple', value: '#faf5ff', colorClass: 'bg-purple-50' },
  { label: 'Soft Rose', value: '#fff1f2', colorClass: 'bg-rose-50' },
  { label: 'Warm Cream', value: '#fefae0', colorClass: 'bg-amber-100/50' },
  { label: 'Cool Gray', value: '#f1f5f9', colorClass: 'bg-slate-100' },
];

export default function EditorTableTools({
  getQuill,
  isOpen,
  onClose,
  onContentChange,
}: EditorTableToolsProps) {
  // Modal mode: 'grid' vs 'custom'
  const [insertMode, setInsertMode] = useState<'grid' | 'custom'>('grid');

  // Visual grid picker state
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);

  // Custom table options
  const [customRows, setCustomRows] = useState(4);
  const [customCols, setCustomCols] = useState(4);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [hasHeaderCol, setHasHeaderCol] = useState(false);
  const [tableWidthType, setTableWidthType] = useState<'100%' | 'auto' | 'custom'>('100%');
  const [customWidthVal, setCustomWidthVal] = useState('100%');
  const [tableCaption, setTableCaption] = useState('');
  const [tablePreset, setTablePreset] = useState<'modern' | 'grid' | 'minimal' | 'striped'>('modern');

  // Track if cursor is currently inside a table & active cell
  const [isInTable, setIsInTable] = useState(false);
  const [activeCellInfo, setActiveCellInfo] = useState<{
    rowIndex: number;
    colIndex: number;
    totalRows: number;
    totalCols: number;
    isHeader: boolean;
    colspan: number;
    rowspan: number;
  } | null>(null);

  const [isDismissed, setIsDismissed] = useState(false);
  const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

  // Table Properties Modal State
  const [propWidth, setPropWidth] = useState('100%');
  const [propAlign, setPropAlign] = useState<'left' | 'center' | 'right'>('center');
  const [propBorderStyle, setPropBorderStyle] = useState<'solid' | 'dashed' | 'dotted' | 'none'>('solid');
  const [propBorderColor, setPropBorderColor] = useState('#cbd5e1');
  const [propBorderWidth, setPropBorderWidth] = useState('1px');
  const [propPadding, setPropPadding] = useState<'compact' | 'normal' | 'relaxed'>('normal');
  const [propCaption, setPropCaption] = useState('');
  const [propStriped, setPropStriped] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const propModalRef = useRef<HTMLDivElement>(null);
  const lastRangeRef = useRef<{ index: number; length: number } | null>(null);
  const activeCellRef = useRef<HTMLTableCellElement | null>(null);
  const activeTableRef = useRef<HTMLTableElement | null>(null);

  // Helper to find the active table cell and table elements
  const getActiveTableElements = useCallback((): {
    cell: HTMLTableCellElement | null;
    table: HTMLTableElement | null;
  } => {
    const quill = getQuill();
    if (!quill || !quill.root) return { cell: null, table: null };

    // 1. Try activeElement
    const activeEl = document.activeElement;
    if (activeEl && quill.root.contains(activeEl)) {
      const cell = activeEl.closest('td, th') as HTMLTableCellElement | null;
      if (cell) {
        return { cell, table: cell.closest('table') };
      }
    }

    // 2. Try window selection
    const sel = window.getSelection();
    if (sel && sel.anchorNode && quill.root.contains(sel.anchorNode)) {
      const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
      const cell = node?.closest('td, th') as HTMLTableCellElement | null;
      if (cell) {
        return { cell, table: cell.closest('table') };
      }
    }

    // 3. Fallback to last known refs if still in DOM
    if (activeCellRef.current && quill.root.contains(activeCellRef.current)) {
      return {
        cell: activeCellRef.current,
        table: activeCellRef.current.closest('table'),
      };
    }

    return { cell: null, table: null };
  }, [getQuill]);

  // Check if cursor is inside a table and inspect its coordinates
  const updateTableState = useCallback(() => {
    const quill = getQuill();
    if (!quill) {
      setIsInTable(false);
      setActiveCellInfo(null);
      return;
    }

    const range = quill.getSelection();
    if (range) {
      lastRangeRef.current = range;
    }

    const { cell, table } = getActiveTableElements();
    if (cell && table) {
      activeCellRef.current = cell;
      activeTableRef.current = table;
      setIsInTable(true);

      const row = cell.parentElement as HTMLTableRowElement | null;
      const tbody = table.querySelector('tbody') || table;
      const allRows = Array.from(tbody.querySelectorAll('tr'));
      const rowIndex = row ? allRows.indexOf(row) : 0;
      const cellsInRow = row ? Array.from(row.querySelectorAll('td, th')) : [];
      const colIndex = cellsInRow.indexOf(cell);
      const isHeader = cell.tagName.toLowerCase() === 'th';
      const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
      const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);

      const maxCols = allRows.reduce((max, r) => Math.max(max, r.querySelectorAll('td, th').length), 0);

      setActiveCellInfo({
        rowIndex: Math.max(0, rowIndex),
        colIndex: Math.max(0, colIndex),
        totalRows: allRows.length,
        totalCols: maxCols,
        isHeader,
        colspan: isNaN(colspan) ? 1 : colspan,
        rowspan: isNaN(rowspan) ? 1 : rowspan,
      });

      // Synchronize properties state with current table
      setPropWidth(table.style.width || (table.getAttribute('width') ?? '100%'));
      const align = (table.getAttribute('align') || table.getAttribute('data-table-align') || 'center').toLowerCase();
      setPropAlign(align === 'left' || align === 'right' ? align : 'center');
      const captionEl = table.querySelector('caption');
      setPropCaption(captionEl?.textContent?.trim() || '');
      setPropStriped(table.classList.contains('table-preset-striped'));
    } else {
      setIsInTable(false);
      setActiveCellInfo(null);
      activeCellRef.current = null;
      activeTableRef.current = null;
    }
  }, [getQuill, getActiveTableElements]);

  // Listen to Quill events and keyboard navigation
  useEffect(() => {
    const quill = getQuill();
    if (!quill || !quill.root) return;

    const handleSelectionChange = () => {
      updateTableState();
    };

    quill.on('selection-change', handleSelectionChange);
    quill.on('editor-change', handleSelectionChange);

    const onKeyUp = () => updateTableState();
    const onMouseUp = () => updateTableState();

    // Tab & Shift+Tab table navigation
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const { cell, table } = getActiveTableElements();
        if (!cell || !table) return;

        e.preventDefault();
        const allCells = Array.from(table.querySelectorAll('td, th')) as HTMLTableCellElement[];
        const currentIndex = allCells.indexOf(cell);

        if (e.shiftKey) {
          // Shift + Tab -> Move to previous cell
          if (currentIndex > 0) {
            const prevCell = allCells[currentIndex - 1];
            focusTableCell(prevCell);
          }
        } else {
          // Tab -> Move to next cell
          if (currentIndex < allCells.length - 1) {
            const nextCell = allCells[currentIndex + 1];
            focusTableCell(nextCell);
          } else {
            // At the very last cell -> automatically append a new row!
            const tableModule = quill.getModule('table');
            if (tableModule) {
              try {
                tableModule.insertRowBelow();
                setTimeout(() => {
                  const updatedCells = Array.from(table.querySelectorAll('td, th')) as HTMLTableCellElement[];
                  const firstNewCell = updatedCells[currentIndex + 1] || updatedCells[updatedCells.length - 1];
                  if (firstNewCell) focusTableCell(firstNewCell);
                  updateTableState();
                  onContentChange?.();
                }, 40);
              } catch {}
            }
          }
        }
      } else if (e.key === 'Escape') {
        setIsBgPickerOpen(false);
        setIsPropertiesOpen(false);
      }
    };

    quill.root.addEventListener('keyup', onKeyUp);
    quill.root.addEventListener('mouseup', onMouseUp);
    quill.root.addEventListener('keydown', onKeyDown);

    return () => {
      quill.off('selection-change', handleSelectionChange);
      quill.off('editor-change', handleSelectionChange);
      quill.root.removeEventListener('keyup', onKeyUp);
      quill.root.removeEventListener('mouseup', onMouseUp);
      quill.root.removeEventListener('keydown', onKeyDown);
    };
  }, [getQuill, updateTableState, getActiveTableElements, onContentChange]);

  // Helper to place cursor inside a cell
  const focusTableCell = (cell: HTMLElement) => {
    cell.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(cell);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  // Close modals on Escape or outside click
  useEffect(() => {
    if (!isOpen && !isPropertiesOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPropertiesOpen) setIsPropertiesOpen(false);
        else onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
      if (isPropertiesOpen && propModalRef.current && !propModalRef.current.contains(e.target as Node)) {
        setIsPropertiesOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isPropertiesOpen, onClose]);

  // Professional table insertion
  const handleInsertTable = (
    rows: number,
    cols: number,
    options?: {
      headerRow?: boolean;
      headerCol?: boolean;
      caption?: string;
      preset?: 'modern' | 'grid' | 'minimal' | 'striped';
      width?: string;
    }
  ) => {
    const quill = getQuill();
    if (!quill) return;

    const tableModule = quill.getModule('table');
    if (!tableModule) {
      alert('Table module is not available in editor.');
      return;
    }

    let range = quill.getSelection();
    if (!range) {
      quill.focus();
      range = quill.getSelection() || { index: Math.max(0, quill.getLength() - 1), length: 0 };
    }

    const r = Math.max(1, Math.min(rows, 40));
    const c = Math.max(1, Math.min(cols, 15));
    const headerRow = options?.headerRow ?? hasHeaderRow;
    const headerCol = options?.headerCol ?? hasHeaderCol;
    const caption = options?.caption ?? tableCaption;
    const preset = options?.preset ?? tablePreset;
    const width = options?.width ?? (tableWidthType === 'auto' ? 'auto' : customWidthVal);

    try {
      tableModule.insertTable(r, c);
      onClose();

      setTimeout(() => {
        quill.focus();
        updateTableState();

        const { table } = getActiveTableElements();
        if (table) {
          // 1. Set Table Width and Preset
          table.style.width = width;
          table.classList.add(`table-preset-${preset}`);
          table.setAttribute('data-table-preset', preset);

          // 2. Set Header Row if requested
          if (headerRow) {
            const firstRow = table.querySelector('tr');
            if (firstRow) {
              const cells = Array.from(firstRow.querySelectorAll('td'));
              cells.forEach((td) => {
                const th = document.createElement('th');
                Array.from(td.attributes).forEach((attr) => th.setAttribute(attr.name, attr.value));
                th.innerHTML = td.innerHTML || '<p><br></p>';
                td.replaceWith(th);
              });
            }
          }

          // 3. Set Header Column if requested
          if (headerCol) {
            const allRows = table.querySelectorAll('tr');
            allRows.forEach((row, idx) => {
              if (idx === 0 && headerRow) return;
              const firstCell = row.querySelector('td');
              if (firstCell) {
                const th = document.createElement('th');
                Array.from(firstCell.attributes).forEach((attr) => th.setAttribute(attr.name, attr.value));
                th.innerHTML = firstCell.innerHTML || '<p><br></p>';
                firstCell.replaceWith(th);
              }
            });
          }

          // 4. Add Table Caption if provided
          if (caption.trim()) {
            const existingCaption = table.querySelector('caption');
            if (existingCaption) {
              existingCaption.textContent = caption.trim();
            } else {
              const cap = document.createElement('caption');
              cap.textContent = caption.trim();
              cap.className = 'text-left text-xs font-semibold text-text-muted py-1';
              table.prepend(cap);
            }
          }

          quill.update?.('user');
          onContentChange?.();
        }
      }, 70);
    } catch (err) {
      console.error('Failed to insert table:', err);
    }
  };

  // Safe table module action executor
  const executeTableAction = (action: (tableModule: any) => void) => {
    const quill = getQuill();
    if (!quill) return;
    const tableModule = quill.getModule('table');
    if (!tableModule) return;

    if (lastRangeRef.current) {
      try {
        quill.setSelection(lastRangeRef.current.index, lastRangeRef.current.length, 'silent');
      } catch {}
    }

    try {
      action(tableModule);
      setTimeout(() => {
        quill.focus();
        updateTableState();
        onContentChange?.();
      }, 50);
    } catch (err) {
      console.error('Table action failed:', err);
    }
  };

  // --- Advanced Cell Operations: Merge & Split ---
  const handleMergeRight = () => {
    const { cell, table } = getActiveTableElements();
    if (!cell || !table) return;

    const nextCell = cell.nextElementSibling as HTMLTableCellElement | null;
    if (!nextCell) {
      alert('No cell to the right to merge with.');
      return;
    }

    const currentSpan = parseInt(cell.getAttribute('colspan') || '1', 10);
    const nextSpan = parseInt(nextCell.getAttribute('colspan') || '1', 10);
    cell.setAttribute('colspan', String(currentSpan + nextSpan));

    // Append right cell contents if non-empty
    if (nextCell.textContent?.trim()) {
      cell.innerHTML = `${cell.innerHTML} ${nextCell.innerHTML}`;
    }
    nextCell.remove();

    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  const handleMergeDown = () => {
    const { cell, table } = getActiveTableElements();
    if (!cell || !table) return;

    const currentRow = cell.parentElement as HTMLTableRowElement | null;
    const nextRow = currentRow?.nextElementSibling as HTMLTableRowElement | null;
    if (!currentRow || !nextRow) {
      alert('No row below to merge with.');
      return;
    }

    const cellIndex = Array.from(currentRow.children).indexOf(cell);
    const belowCell = nextRow.children[cellIndex] as HTMLTableCellElement | null;
    if (!belowCell) {
      alert('No matching cell in row below.');
      return;
    }

    const currentSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
    const belowSpan = parseInt(belowCell.getAttribute('rowspan') || '1', 10);
    cell.setAttribute('rowspan', String(currentSpan + belowSpan));

    if (belowCell.textContent?.trim()) {
      cell.innerHTML = `${cell.innerHTML}<br>${belowCell.innerHTML}`;
    }
    belowCell.remove();

    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  const handleSplitCell = () => {
    const { cell } = getActiveTableElements();
    if (!cell) return;

    const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
    const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);

    if (colspan > 1) {
      cell.setAttribute('colspan', String(colspan - 1));
      const newCell = document.createElement(cell.tagName.toLowerCase()) as HTMLTableCellElement;
      newCell.setAttribute('data-row', cell.getAttribute('data-row') || '');
      newCell.innerHTML = '<p><br></p>';
      cell.after(newCell);
    } else if (rowspan > 1) {
      cell.setAttribute('rowspan', String(rowspan - 1));
      const row = cell.parentElement as HTMLTableRowElement | null;
      const nextRow = row?.nextElementSibling as HTMLTableRowElement | null;
      if (nextRow) {
        const newCell = document.createElement(cell.tagName.toLowerCase()) as HTMLTableCellElement;
        newCell.setAttribute('data-row', nextRow.firstElementChild?.getAttribute('data-row') || '');
        newCell.innerHTML = '<p><br></p>';
        nextRow.appendChild(newCell);
      }
    } else {
      // Regular cell split: convert into 2 cells (insert a column next to it)
      executeTableAction((m) => m.insertColumnRight());
      return;
    }

    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  // Toggle Header Cell (TH <-> TD)
  const handleToggleHeaderCell = () => {
    const { cell } = getActiveTableElements();
    if (!cell) return;

    const isTh = cell.tagName.toLowerCase() === 'th';
    const targetTag = isTh ? 'td' : 'th';
    const newCell = document.createElement(targetTag) as HTMLTableCellElement;

    Array.from(cell.attributes).forEach((attr) => newCell.setAttribute(attr.name, attr.value));
    newCell.innerHTML = cell.innerHTML;
    cell.replaceWith(newCell);

    focusTableCell(newCell);
    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  // Set Cell Alignment (Horizontal & Vertical)
  const handleSetCellAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    const { cell } = getActiveTableElements();
    if (!cell) return;

    cell.style.textAlign = align;
    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  const handleSetCellVAlign = (valign: 'top' | 'middle' | 'bottom') => {
    const { cell } = getActiveTableElements();
    if (!cell) return;

    cell.style.verticalAlign = valign;
    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  // Set Cell Background Color
  const handleSetCellBg = (color: string) => {
    const { cell } = getActiveTableElements();
    if (!cell) return;

    if (color) {
      cell.style.backgroundColor = color;
    } else {
      cell.style.removeProperty('background-color');
    }

    setIsBgPickerOpen(false);
    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  // Distribute Columns Evenly
  const handleDistributeColumns = () => {
    const { table } = getActiveTableElements();
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return;

    const cols = Array.from(rows[0].querySelectorAll('td, th'));
    const pct = `${(100 / cols.length).toFixed(2)}%`;

    rows.forEach((row) => {
      row.querySelectorAll('td, th').forEach((c) => {
        (c as HTMLElement).style.width = pct;
      });
    });

    table.style.width = '100%';
    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  // Apply Table Properties from Modal
  const handleApplyProperties = () => {
    const { table } = getActiveTableElements();
    if (!table) return;

    table.style.width = propWidth;
    table.setAttribute('data-table-width', propWidth);

    // Alignment via margin
    if (propAlign === 'center') {
      table.style.marginLeft = 'auto';
      table.style.marginRight = 'auto';
    } else if (propAlign === 'right') {
      table.style.marginLeft = 'auto';
      table.style.marginRight = '0';
    } else {
      table.style.marginLeft = '0';
      table.style.marginRight = 'auto';
    }
    table.setAttribute('data-table-align', propAlign);

    // Borders
    const borderVal = `${propBorderWidth} ${propBorderStyle} ${propBorderColor}`;
    table.style.border = borderVal;
    table.querySelectorAll('td, th').forEach((el) => {
      (el as HTMLElement).style.border = borderVal;
      if (propPadding === 'compact') {
        (el as HTMLElement).style.padding = '4px 8px';
      } else if (propPadding === 'relaxed') {
        (el as HTMLElement).style.padding = '12px 16px';
      } else {
        (el as HTMLElement).style.padding = '8px 12px';
      }
    });

    // Caption
    const existingCap = table.querySelector('caption');
    if (propCaption.trim()) {
      if (existingCap) {
        existingCap.textContent = propCaption.trim();
      } else {
        const cap = document.createElement('caption');
        cap.textContent = propCaption.trim();
        cap.className = 'text-left text-xs font-semibold text-text-muted py-1';
        table.prepend(cap);
      }
    } else if (existingCap) {
      existingCap.remove();
    }

    // Striped
    if (propStriped) {
      table.classList.add('table-preset-striped');
    } else {
      table.classList.remove('table-preset-striped');
    }

    setIsPropertiesOpen(false);
    const quill = getQuill();
    quill?.update?.('user');
    updateTableState();
    onContentChange?.();
  };

  return (
    <>
      {/* 1. Contextual Table Tools Floating/Docked Toolbar */}
      {isInTable && !isDismissed && (
        <div
          role="toolbar"
          aria-label="Table Actions"
          className="mx-3 my-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-accent/40 bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-md transition-all duration-200 animate-in fade-in z-30"
        >
          {/* Active cell badge */}
          <div className="flex items-center gap-1.5 border-r border-border pr-2 text-xs font-bold text-accent">
            <TableIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {activeCellInfo?.isHeader
                ? `Header (Col ${activeCellInfo.colIndex + 1})`
                : `R${(activeCellInfo?.rowIndex ?? 0) + 1} : C${(activeCellInfo?.colIndex ?? 0) + 1}`}
            </span>
          </div>

          {/* Row modification controls */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] uppercase font-bold text-text-muted px-1">Row</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeTableAction((m) => m.insertRowAbove())}
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Row Above"
            >
              <ArrowUp className="h-3 w-3" />
              <span className="hidden md:inline">Above</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeTableAction((m) => m.insertRowBelow())}
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Row Below"
            >
              <ArrowDown className="h-3 w-3" />
              <span className="hidden md:inline">Below</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeTableAction((m) => m.deleteRow())}
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shadow-2xs"
              title="Delete Row"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" aria-hidden="true" />

          {/* Column modification controls */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] uppercase font-bold text-text-muted px-1">Col</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeTableAction((m) => m.insertColumnLeft())}
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Column Left"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden md:inline">Left</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeTableAction((m) => m.insertColumnRight())}
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Column Right"
            >
              <ArrowRight className="h-3 w-3" />
              <span className="hidden md:inline">Right</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeTableAction((m) => m.deleteColumn())}
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shadow-2xs"
              title="Delete Column"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" aria-hidden="true" />

          {/* Merge & Split Cells */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleMergeRight}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Merge with Cell to the Right"
            >
              <Combine className="h-3 w-3" />
              <span className="hidden lg:inline">Merge Right</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleMergeDown}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Merge with Cell Below"
            >
              <Rows className="h-3 w-3" />
              <span className="hidden lg:inline">Merge Down</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSplitCell}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Split Merged Cell"
            >
              <Split className="h-3 w-3" />
              <span className="hidden lg:inline">Split</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" aria-hidden="true" />

          {/* Cell Alignment & Formatting */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSetCellAlign('left')}
              className="p-1 rounded-lg border border-border bg-surface text-text-secondary hover:text-accent hover:border-accent transition-colors shadow-2xs"
              title="Align Left"
            >
              <AlignLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSetCellAlign('center')}
              className="p-1 rounded-lg border border-border bg-surface text-text-secondary hover:text-accent hover:border-accent transition-colors shadow-2xs"
              title="Align Center"
            >
              <AlignCenter className="h-3 w-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSetCellAlign('right')}
              className="p-1 rounded-lg border border-border bg-surface text-text-secondary hover:text-accent hover:border-accent transition-colors shadow-2xs"
              title="Align Right"
            >
              <AlignRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleToggleHeaderCell}
              className={`p-1 rounded-lg border transition-colors shadow-2xs ${
                activeCellInfo?.isHeader
                  ? 'border-accent bg-accent/10 text-accent font-bold'
                  : 'border-border bg-surface text-text-secondary hover:text-accent hover:border-accent'
              }`}
              title="Toggle Header Cell (TH)"
            >
              <Heading className="h-3 w-3" />
            </button>
          </div>

          {/* Cell Background Swatches Popover */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsBgPickerOpen(!isBgPickerOpen)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Cell Background Color"
            >
              <Paintbrush className="h-3 w-3" />
              <span className="hidden sm:inline">Color</span>
            </button>

            {isBgPickerOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 rounded-xl border border-border bg-surface p-2 shadow-xl backdrop-blur-md grid grid-cols-3 gap-1.5 w-44 animate-in fade-in zoom-in-95">
                {CELL_BG_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSetCellBg(swatch.value)}
                    className="flex flex-col items-center gap-0.5 rounded-lg p-1 hover:bg-surface-alt transition-colors"
                    title={swatch.label}
                  >
                    <span className={`h-5 w-5 rounded-md border border-border/80 ${swatch.colorClass}`} />
                    <span className="text-[10px] text-text-muted truncate w-full text-center">
                      {swatch.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-border mx-0.5" aria-hidden="true" />

          {/* Quick Table Utilities */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDistributeColumns}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
            title="Distribute Columns Evenly"
          >
            <Columns className="h-3 w-3" />
            <span className="hidden xl:inline">Equal Widths</span>
          </button>

          {/* Table Properties Modal Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsPropertiesOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/5 px-2 py-1 text-xs font-bold text-accent hover:bg-accent/15 transition-colors shadow-2xs"
            title="Table Properties (Width, Borders, Padding)"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Properties</span>
          </button>

          {/* Delete Table button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (confirm('Are you sure you want to delete this table?')) {
                executeTableAction((m) => m.deleteTable());
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shadow-2xs ml-auto"
            title="Delete Entire Table"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Delete Table</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-0.5"
            title="Hide Table Toolbar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Re-open pill when dismissed */}
      {isInTable && isDismissed && (
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="mx-3 my-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-accent/40 bg-surface-alt/90 text-xs font-bold text-accent shadow-sm hover:bg-accent hover:text-white transition-all"
        >
          <TableIcon className="h-3.5 w-3.5" />
          <span>Show Table Toolbar</span>
        </button>
      )}

      {/* 2. Interactive Insert Table Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-accent" />
                <h3 className="font-bold text-base text-navy dark:text-white">Insert Table</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-alt hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Insertion Mode Tabs */}
            <div className="flex rounded-xl bg-surface-alt p-1 mb-4 border border-border">
              <button
                type="button"
                onClick={() => setInsertMode('grid')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  insertMode === 'grid'
                    ? 'bg-surface text-accent shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Visual Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setInsertMode('custom')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  insertMode === 'custom'
                    ? 'bg-surface text-accent shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Custom Config</span>
              </button>
            </div>

            {insertMode === 'grid' ? (
              /* Visual Grid Picker Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                  <span>Hover to choose dimensions:</span>
                  <span className="text-accent font-bold px-2 py-0.5 rounded-md bg-accent/10">
                    {hoverRow > 0 && hoverCol > 0 ? `${hoverRow} × ${hoverCol} Table` : 'Move mouse over grid'}
                  </span>
                </div>

                {/* Explicit CSS Grid Container — guarantees 8 columns × 8 rows without layout squish */}
                <div
                  className="p-3 rounded-xl border border-border bg-surface-alt/70 select-none mx-auto flex items-center justify-center"
                  onMouseLeave={() => {
                    setHoverRow(0);
                    setHoverCol(0);
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${GRID_MAX_COLS}, 24px)`,
                      gridTemplateRows: `repeat(${GRID_MAX_ROWS}, 24px)`,
                      gap: '4px',
                      width: 'max-content',
                    }}
                  >
                    {Array.from({ length: GRID_MAX_ROWS }).map((_, r) =>
                      Array.from({ length: GRID_MAX_COLS }).map((_, c) => {
                        const rowNum = r + 1;
                        const colNum = c + 1;
                        const isHighlighted = rowNum <= hoverRow && colNum <= hoverCol;
                        const isFirstRow = rowNum === 1 && isHighlighted && hasHeaderRow;

                        return (
                          <button
                            key={`${r}-${c}`}
                            type="button"
                            onMouseEnter={() => {
                              setHoverRow(rowNum);
                              setHoverCol(colNum);
                            }}
                            onClick={() => handleInsertTable(rowNum, colNum)}
                            className={`h-6 w-6 rounded-sm border transition-all ${
                              isFirstRow
                                ? 'border-accent bg-accent text-white shadow-xs'
                                : isHighlighted
                                ? 'border-accent bg-accent/35 shadow-2xs'
                                : 'border-border bg-surface hover:border-accent/40'
                            }`}
                            title={`${rowNum} × ${colNum}`}
                            aria-label={`${rowNum} rows by ${colNum} columns`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Header row option checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasHeaderRow}
                      onChange={(e) => setHasHeaderRow(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span>Include Header Row</span>
                  </label>
                  <span className="text-[11px] text-text-muted">Click any cell to insert</span>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-border">
                  <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                    Quick Presets:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      [2, 2],
                      [3, 3],
                      [4, 4],
                      [5, 3],
                    ].map(([r, c]) => (
                      <button
                        key={`${r}x${c}`}
                        type="button"
                        onClick={() => handleInsertTable(r, c)}
                        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-text-primary hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors shadow-2xs text-center"
                      >
                        {r} × {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Custom Config Tab */
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Rows (1-30)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={customRows}
                      onChange={(e) => setCustomRows(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Columns (1-15)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={customCols}
                      onChange={(e) => setCustomCols(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Header options */}
                <div className="grid grid-cols-2 gap-2 py-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasHeaderRow}
                      onChange={(e) => setHasHeaderRow(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span>Header Row (Top)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasHeaderCol}
                      onChange={(e) => setHasHeaderCol(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span>Header Col (Left)</span>
                  </label>
                </div>

                {/* Table Style Preset */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Style Preset
                  </label>
                  <select
                    value={tablePreset}
                    onChange={(e) => setTablePreset(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="modern">Modern Clean (Light Header, Subtle Borders)</option>
                    <option value="grid">Grid Lines (Full Borders on All Cells)</option>
                    <option value="minimal">Minimal Dividers (Horizontal Lines Only)</option>
                    <option value="striped">Zebra Striped (Alternating Rows)</option>
                  </select>
                </div>

                {/* Table Caption */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Table Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={tableCaption}
                    onChange={(e) => setTableCaption(e.target.value)}
                    placeholder="e.g. Landmark Precedent Comparison"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTable(customRows, customCols)}
                    className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-hover shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Insert Table
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Advanced Table Properties Modal */}
      {isPropertiesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            ref={propModalRef}
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-accent" />
                <h3 className="font-bold text-base text-navy dark:text-white">Table Properties</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPropertiesOpen(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-alt hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Width & Alignment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Table Width
                  </label>
                  <select
                    value={propWidth}
                    onChange={(e) => setPropWidth(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="100%">100% (Full Width)</option>
                    <option value="auto">Auto (Fit to Content)</option>
                    <option value="90%">90% Width</option>
                    <option value="80%">80% Width</option>
                    <option value="600px">Fixed 600px</option>
                    <option value="800px">Fixed 800px</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Table Alignment
                  </label>
                  <div className="flex rounded-lg border border-border bg-surface-alt p-0.5">
                    <button
                      type="button"
                      onClick={() => setPropAlign('left')}
                      className={`flex-1 py-1 text-xs font-semibold rounded ${
                        propAlign === 'left' ? 'bg-surface text-accent shadow-xs' : 'text-text-muted'
                      }`}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => setPropAlign('center')}
                      className={`flex-1 py-1 text-xs font-semibold rounded ${
                        propAlign === 'center' ? 'bg-surface text-accent shadow-xs' : 'text-text-muted'
                      }`}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setPropAlign('right')}
                      className={`flex-1 py-1 text-xs font-semibold rounded ${
                        propAlign === 'right' ? 'bg-surface text-accent shadow-xs' : 'text-text-muted'
                      }`}
                    >
                      Right
                    </button>
                  </div>
                </div>
              </div>

              {/* Borders */}
              <div className="rounded-xl border border-border p-3 space-y-2.5 bg-surface-alt/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Borders & Styling
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">
                      Style
                    </label>
                    <select
                      value={propBorderStyle}
                      onChange={(e) => setPropBorderStyle(e.target.value as any)}
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold text-text-primary"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">
                      Width
                    </label>
                    <select
                      value={propBorderWidth}
                      onChange={(e) => setPropBorderWidth(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold text-text-primary"
                    >
                      <option value="1px">1px Thin</option>
                      <option value="2px">2px Medium</option>
                      <option value="3px">3px Bold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={propBorderColor}
                      onChange={(e) => setPropBorderColor(e.target.value)}
                      className="h-7 w-full rounded-lg border border-border bg-surface cursor-pointer p-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Cell Padding & Layout */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Cell Padding
                  </label>
                  <select
                    value={propPadding}
                    onChange={(e) => setPropPadding(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary"
                  >
                    <option value="compact">Compact (4px × 8px)</option>
                    <option value="normal">Normal (8px × 12px)</option>
                    <option value="relaxed">Relaxed (12px × 16px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Alternating Rows
                  </label>
                  <label className="flex items-center gap-2 mt-2 text-xs font-semibold text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={propStriped}
                      onChange={(e) => setPropStriped(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span>Zebra Striped Rows</span>
                  </label>
                </div>
              </div>

              {/* Table Caption */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Table Caption
                </label>
                <input
                  type="text"
                  value={propCaption}
                  onChange={(e) => setPropCaption(e.target.value)}
                  placeholder="e.g. Schedule of Court Proceedings"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsPropertiesOpen(false)}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyProperties}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-hover shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Apply Properties
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
