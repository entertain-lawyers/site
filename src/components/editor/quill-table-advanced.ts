/**
 * Advanced Table Enhancement for Quill 2 in Entertain Lawyers.
 *
 * Enhances Quill's TableContainer to account for `colspan` in `balanceCells()`
 * so merged cells do not have extra empty cells erroneously appended.
 * Registers support for `TH` (header cells) alongside `TD`.
 */
import { Quill } from 'react-quill-new';

if (typeof window !== 'undefined') {
  try {
    // 1. Patch TableContainer.balanceCells to respect cell colspan
    const TableContainer = Quill.import('formats/table-container') as any;
    if (TableContainer && TableContainer.prototype) {
      const originalBalanceCells = TableContainer.prototype.balanceCells;
      TableContainer.prototype.balanceCells = function () {
        try {
          const TableRow = Quill.import('formats/table-row') as any;
          const TableCell = Quill.import('formats/table') as any;
          if (!TableRow || !TableCell || !this.descendants) {
            return originalBalanceCells?.call(this);
          }

          const rows = this.descendants(TableRow);
          if (!rows || rows.length === 0) return;

          const getRowWidth = (row: any) => {
            let width = 0;
            if (!row || !row.children) return 0;
            row.children.forEach((cell: any) => {
              if (!cell || !cell.domNode) {
                width += 1;
                return;
              }
              const span = parseInt(cell.domNode.getAttribute('colspan') || '1', 10);
              width += isNaN(span) || span < 1 ? 1 : span;
            });
            return width;
          };

          const maxColumns = rows.reduce((max: number, row: any) => Math.max(getRowWidth(row), max), 0);
          if (maxColumns <= 0) return;

          rows.forEach((row: any) => {
            const currentWidth = getRowWidth(row);
            if (currentWidth < maxColumns) {
              const diff = maxColumns - currentWidth;
              for (let i = 0; i < diff; i++) {
                let value;
                if (row.children.head != null) {
                  value = TableCell.formats(row.children.head.domNode);
                }
                const blot = this.scroll.create(TableCell.blotName, value);
                row.appendChild(blot);
                blot.optimize?.();
              }
            }
          });
        } catch {
          // Fallback to original if DOM structure differs
          try {
            originalBalanceCells?.call(this);
          } catch {}
        }
      };
    }

    // 2. Allow TableCell to match both TD and TH tags
    const TableCell = Quill.import('formats/table') as any;
    if (TableCell) {
      TableCell.tagName = ['TD', 'TH'];
      try {
        Quill.register(TableCell, true);
      } catch {}
    }

    // 3. Register TableCaption blot so <caption> is preserved inside <table>
    const Block = Quill.import('blots/block') as any;
    if (Block && TableContainer) {
      class TableCaption extends Block {
        static blotName = 'table-caption';
        static tagName = 'CAPTION';
      }
      Quill.register(TableCaption, true);
      if (TableContainer.allowedChildren && !TableContainer.allowedChildren.includes(TableCaption)) {
        TableContainer.allowedChildren = [TableCaption, ...TableContainer.allowedChildren];
      }
    }

    (window as any).Quill = Quill;
  } catch (err) {
    console.warn('[quill-table-advanced] Notice:', err);
  }
}

export {};
