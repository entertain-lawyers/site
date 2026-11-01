/**
 * Line spacing (line-height) block format for Quill 2.
 *
 * Implemented as a block StyleAttributor so it formats paragraphs (<p>),
 * headings (<h1>-<h6>), blockquotes (<blockquote>), and list items (<li>).
 * Stored as inline `style="line-height: ..."` on block elements.
 * Loaded (browser-only) in the editor's dynamic loader before Quill instance creation.
 */
import { Quill } from 'react-quill-new';
import type { Attributor } from 'parchment';
import {
  LINE_HEIGHT_WHITELIST,
  isAllowedLineHeight,
  normalizeLineHeight,
} from '@/lib/editor-line-height';

type ParchmentModule = {
  StyleAttributor: new (
    attrName: string,
    keyName: string,
    options: { scope: number; whitelist: string[] }
  ) => Attributor & {
    add(node: HTMLElement, value: unknown): boolean;
    remove(node: HTMLElement): void;
    value(node: HTMLElement): unknown;
    canAdd(node: HTMLElement, value: unknown): boolean;
  };
  Scope: { BLOCK: number };
};

const parchment = Quill.import('parchment') as unknown as ParchmentModule;

export class LineHeightAttributor extends parchment.StyleAttributor {
  override canAdd(node: HTMLElement, value: unknown): boolean {
    return isAllowedLineHeight(value);
  }

  override value(node: HTMLElement): string {
    const raw = super.value(node);
    return normalizeLineHeight(raw);
  }
}

export const LineHeightStyle = new LineHeightAttributor('lineheight', 'line-height', {
  scope: parchment.Scope.BLOCK,
  whitelist: LINE_HEIGHT_WHITELIST,
});

Quill.register(
  {
    'attributors/style/lineheight': LineHeightStyle,
    'formats/lineheight': LineHeightStyle,
  },
  true
);
