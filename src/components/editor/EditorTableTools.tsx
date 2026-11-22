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
};

interface EditorTableToolsProps {
  getQuill: () => QuillLike | null;
  isOpen: boolean;
  onClose: () => void;
}

const GRID_MAX_ROWS = 6;
const GRID_MAX_COLS = 6;

export default function EditorTableTools({ getQuill, isOpen, onClose }: EditorTableToolsProps) {
  // Visual grid picker state
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);

  // Custom inputs
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);

  // Track if cursor is currently inside a table
  const [isInTable, setIsInTable] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Check if cursor is inside a table
  const updateTableState = useCallback(() => {
    const quill = getQuill();
    if (!quill) {
      setIsInTable(false);
      return;
    }
    const tableModule = quill.getModule('table');
    if (!tableModule) {
      setIsInTable(false);
      return;
    }

    const range = quill.getSelection();
    if (range) {
      const [table, , cell] = tableModule.getTable(range);
      setIsInTable(Boolean(table && cell));
    } else {
      // Check active element inside editor root
      const activeEl = document.activeElement;
      if (activeEl && quill.root.contains(activeEl)) {
        const inCell = Boolean(activeEl.closest('td, th'));
        setIsInTable(inCell);
      } else {
        setIsInTable(false);
      }
    }
  }, [getQuill]);

  useEffect(() => {
    const quill = getQuill();
    if (!quill) return;

    const handleSelectionChange = () => {
      updateTableState();
    };

    quill.on('selection-change', handleSelectionChange);
    quill.on('editor-change', handleSelectionChange);

    const onKeyUp = () => updateTableState();
    const onMouseUp = () => updateTableState();
    quill.root.addEventListener('keyup', onKeyUp);
    quill.root.addEventListener('mouseup', onMouseUp);

    return () => {
      quill.off('selection-change', handleSelectionChange);
      quill.off('editor-change', handleSelectionChange);
      quill.root.removeEventListener('keyup', onKeyUp);
      quill.root.removeEventListener('mouseup', onMouseUp);
    };
  }, [getQuill, updateTableState]);

  // Close modal on Escape or outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Insert table
  const handleInsertTable = (rows: number, cols: number) => {
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

    const r = Math.max(1, Math.min(rows, 30));
    const c = Math.max(1, Math.min(cols, 15));

    try {
      tableModule.insertTable(r, c);
      onClose();
      setTimeout(() => {
        quill.focus();
        updateTableState();
      }, 50);
    } catch (err) {
      console.error('Failed to insert table:', err);
    }
  };

  // Table modification actions
  const executeTableAction = (action: (tableModule: any) => void) => {
    const quill = getQuill();
    if (!quill) return;
    const tableModule = quill.getModule('table');
    if (!tableModule) return;

    try {
      action(tableModule);
      setTimeout(() => {
        quill.focus();
        updateTableState();
      }, 50);
    } catch (err) {
      console.error('Table action failed:', err);
    }
  };

  return (
    <>
      {/* 1. Contextual Table Tools Bar: visible whenever the editor cursor is inside any table */}
      {isInTable && (
        <div
          role="toolbar"
          aria-label="Table Actions"
          className="sticky top-[var(--editor-toolbar-row-h,2.75rem)] z-30 mx-2 my-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-accent/30 bg-surface-alt/95 px-3 py-2 shadow-md backdrop-blur-md transition-all duration-200 animate-in fade-in"
        >
          <div className="flex items-center gap-1.5 border-r border-border pr-2.5 text-xs font-bold text-accent">
            <TableIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Table Active</span>
          </div>

          {/* Row modification group */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-text-muted px-1">Row:</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                executeTableAction((m) => m.insertRowAbove());
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Row Above"
              aria-label="Insert Row Above"
            >
              <ArrowUp className="h-3 w-3" />
              <span>Above</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                executeTableAction((m) => m.insertRowBelow());
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Row Below"
              aria-label="Insert Row Below"
            >
              <ArrowDown className="h-3 w-3" />
              <span>Below</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                executeTableAction((m) => m.deleteRow());
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shadow-2xs"
              title="Delete Current Row"
              aria-label="Delete Current Row"
            >
              <Trash2 className="h-3 w-3" />
              <span>Del Row</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

          {/* Column modification group */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-text-muted px-1">Col:</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                executeTableAction((m) => m.insertColumnLeft());
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Column Left"
              aria-label="Insert Column Left"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Left</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                executeTableAction((m) => m.insertColumnRight());
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent transition-colors shadow-2xs"
              title="Insert Column Right"
              aria-label="Insert Column Right"
            >
              <ArrowRight className="h-3 w-3" />
              <span>Right</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                executeTableAction((m) => m.deleteColumn());
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shadow-2xs"
              title="Delete Current Column"
              aria-label="Delete Current Column"
            >
              <Trash2 className="h-3 w-3" />
              <span>Del Col</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

          {/* Delete Table button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (confirm('Are you sure you want to delete this table?')) {
                executeTableAction((m) => m.deleteTable());
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shadow-2xs ml-auto"
            title="Delete Entire Table"
            aria-label="Delete Entire Table"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete Table</span>
          </button>
        </div>
      )}

      {/* 2. Interactive Insert Table Modal / Popover */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150"
          >
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

            {/* Visual Grid Picker */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                <span className="flex items-center gap-1">
                  <Grid className="h-3.5 w-3.5" />
                  Grid Selector
                </span>
                <span className="text-accent font-bold">
                  {hoverRow > 0 && hoverCol > 0 ? `${hoverRow} × ${hoverCol} Table` : 'Hover to pick'}
                </span>
              </div>

              <div
                className="grid gap-1.5 p-3 rounded-xl border border-border bg-surface-alt inline-block mx-auto w-full max-w-[240px] select-none"
                style={{
                  gridTemplateColumns: `repeat(${GRID_MAX_COLS}, minmax(0, 1fr))`,
                }}
                onMouseLeave={() => {
                  setHoverRow(0);
                  setHoverCol(0);
                }}
              >
                {Array.from({ length: GRID_MAX_ROWS }).map((_, r) =>
                  Array.from({ length: GRID_MAX_COLS }).map((_, c) => {
                    const rowNum = r + 1;
                    const colNum = c + 1;
                    const isHighlighted = rowNum <= hoverRow && colNum <= hoverCol;

                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onMouseEnter={() => {
                          setHoverRow(rowNum);
                          setHoverCol(colNum);
                        }}
                        onClick={() => handleInsertTable(rowNum, colNum)}
                        className={`h-6 w-full rounded-md border transition-all ${
                          isHighlighted
                            ? 'border-accent bg-accent/30 shadow-2xs scale-105'
                            : 'border-border bg-surface hover:border-accent/50'
                        }`}
                        title={`${rowNum} × ${colNum}`}
                        aria-label={`${rowNum} rows by ${colNum} columns`}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">Presets:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  [2, 2],
                  [3, 3],
                  [4, 4],
                  [5, 2],
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

            {/* Custom Row & Column Inputs */}
            <div className="space-y-3 border-t border-border pt-4">
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
                    Cols (1-15)
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

              <div className="flex justify-end gap-2 pt-2">
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
          </div>
        </div>
      )}
    </>
  );
}
