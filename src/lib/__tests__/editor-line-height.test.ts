import { describe, expect, it } from 'vitest';
import {
  LINE_HEIGHT_OPTIONS,
  LINE_HEIGHT_WHITELIST,
  isAllowedLineHeight,
  normalizeLineHeight,
  syncListLineHeights,
} from '@/lib/editor-line-height';
import { editorHtmlToArticleHtml, articleHtmlToEditorHtml } from '@/lib/editor-html';
import { sanitizeHtml } from '@/lib/sanitize';
import { preparePastedHtml } from '@/lib/editor-clipboard';

describe('Quill Line Height Attributor and Options', () => {
  it('defines the required dropdown options', () => {
    expect(LINE_HEIGHT_OPTIONS).toEqual(['1.0', '1.15', '1.5', '1.75', '2.0']);
    expect(LINE_HEIGHT_WHITELIST).toContain('1.5');
    expect(LINE_HEIGHT_WHITELIST).toContain('2.0');
  });

  it('validates whitelist matching for decimal and normalized numbers', () => {
    // Whitelisted values
    expect(isAllowedLineHeight('1')).toBe(true);
    expect(isAllowedLineHeight('1.0')).toBe(true);
    expect(isAllowedLineHeight('1.15')).toBe(true);
    expect(isAllowedLineHeight('1.5')).toBe(true);
    expect(isAllowedLineHeight('1.75')).toBe(true);
    expect(isAllowedLineHeight('2')).toBe(true);
    expect(isAllowedLineHeight('2.0')).toBe(true);

    // Rejected values
    expect(isAllowedLineHeight(null)).toBe(false);
    expect(isAllowedLineHeight('')).toBe(false);
    expect(isAllowedLineHeight('3.5')).toBe(false);
    expect(isAllowedLineHeight('url(bad)')).toBe(false);
  });

  it('normalizes line-height numbers to match select options', () => {
    expect(normalizeLineHeight('1')).toBe('1.0');
    expect(normalizeLineHeight('1.0')).toBe('1.0');
    expect(normalizeLineHeight('2')).toBe('2.0');
    expect(normalizeLineHeight('2.0')).toBe('2.0');
    expect(normalizeLineHeight('1.5')).toBe('1.5');
    expect(normalizeLineHeight('')).toBe('');
    expect(normalizeLineHeight(null)).toBe('');
  });
});

describe('syncListLineHeights', () => {
  it('returns untouched html when root is null or has no list line heights', () => {
    const html = '<ol><li>Item 1</li><li>Item 2</li></ol>';
    expect(syncListLineHeights(html, null)).toBe(html);

    const mockRootNoLh = {
      querySelectorAll: () => [
        { style: { lineHeight: '' } },
        { style: { lineHeight: '' } },
      ],
    } as unknown as HTMLElement;
    expect(syncListLineHeights(html, mockRootNoLh)).toBe(html);
  });

  it('transfers line-height from editor list DOM nodes to semantic HTML', () => {
    const html = '<ol><li>First</li><li class="existing">Second</li><li>Third</li></ol>';
    const mockRoot = {
      querySelectorAll: () => [
        { style: { lineHeight: '1.5' } },
        { style: { lineHeight: '2.0' } },
        { style: { lineHeight: '' } },
      ],
    } as unknown as HTMLElement;

    const result = syncListLineHeights(html, mockRoot);
    expect(result).toBe(
      '<ol><li style="line-height: 1.5;">First</li><li style="line-height: 2.0;" class="existing">Second</li><li>Third</li></ol>'
    );
  });

  it('updates existing style attribute when present on li', () => {
    const html = '<ul><li style="color: red;">Colored</li></ul>';
    const mockRoot = {
      querySelectorAll: () => [{ style: { lineHeight: '1.15' } }],
    } as unknown as HTMLElement;

    const result = syncListLineHeights(html, mockRoot);
    expect(result).toBe('<ul><li style="line-height: 1.15; color: red;">Colored</li></ul>');
  });
});

describe('Saving and Reopening Line Spacing (Round-Trip Persistence)', () => {
  it('preserves line-height on paragraphs across articleHtml conversion', () => {
    const editorHtml = '<p style="line-height: 1.5;">Paragraph with 1.5 spacing</p>';
    const savedArticleHtml = editorHtmlToArticleHtml(editorHtml);

    expect(savedArticleHtml).toContain('style="line-height: 1.5;"');
    expect(savedArticleHtml).toContain('class="el-ed"');

    const reopenedEditorHtml = articleHtmlToEditorHtml(savedArticleHtml);
    expect(reopenedEditorHtml).toBe('<p style="line-height: 1.5;">Paragraph with 1.5 spacing</p>');
  });

  it('preserves line-height on headings, blockquotes, and lists', () => {
    const editorHtml = [
      '<h2 style="line-height: 1.15;">Heading 2 at 1.15</h2>',
      '<blockquote style="line-height: 1.75;"><p>Quote at 1.75</p></blockquote>',
      '<ol><li style="line-height: 2.0;">Item with double spacing</li><li>Standard item</li></ol>',
    ].join('');

    const savedArticleHtml = editorHtmlToArticleHtml(editorHtml);
    expect(savedArticleHtml).toContain('style="line-height: 1.15;"');
    expect(savedArticleHtml).toContain('style="line-height: 1.75;"');
    expect(savedArticleHtml).toContain('<li style="line-height: 2.0;">Item with double spacing</li>');

    const reopenedEditorHtml = articleHtmlToEditorHtml(savedArticleHtml);
    expect(reopenedEditorHtml).toContain('<h2 style="line-height: 1.15;">Heading 2 at 1.15</h2>');
    expect(reopenedEditorHtml).toContain('<blockquote style="line-height: 1.75;"><p>Quote at 1.75</p></blockquote>');
    expect(reopenedEditorHtml).toContain('<li style="line-height: 2.0;">Item with double spacing</li>');
  });

  it('keeps adjacent paragraphs with different line heights separate', () => {
    const editorHtml =
      '<p style="line-height: 1.0;">Line A</p>' +
      '<p style="line-height: 2.0;">Line B</p>';

    const savedArticleHtml = editorHtmlToArticleHtml(editorHtml);
    // Because attrs differ, they should NOT merge into a single <p> with <br>
    expect(savedArticleHtml).toContain('<p class="el-ed el-tight" style="line-height: 1.0;">Line A</p>');
    expect(savedArticleHtml).toContain('<p class="el-ed" style="line-height: 2.0;">Line B</p>');
  });

  it('merges adjacent paragraphs with the exact same line height and attrs', () => {
    const editorHtml =
      '<p style="line-height: 1.5;">First line</p>' +
      '<p style="line-height: 1.5;">Second line</p>';

    const savedArticleHtml = editorHtmlToArticleHtml(editorHtml);
    // Merges with <br> inside a single paragraph
    expect(savedArticleHtml).toBe('<p class="el-ed" style="line-height: 1.5;">First line<br>Second line</p>');
  });

  it('resets line spacing cleanly to default when style is removed', () => {
    const editorHtmlWithReset = '<p>Normal text without explicit line spacing</p>';
    const saved = editorHtmlToArticleHtml(editorHtmlWithReset);
    expect(saved).toBe('<p class="el-ed">Normal text without explicit line spacing</p>');
    expect(saved).not.toContain('line-height');
  });
});

describe('Clipboard Paste Line-Height Preservation', () => {
  it('preserves valid line spacing when pasting formatted HTML from external sources', () => {
    const externalHtml = `
      <!--StartFragment-->
      <div style="font-family: Arial;">
        <p style="line-height: 1.5; font-size: 16px; color: #333333;">Pasted from Word/Docs</p>
        <h3 style="line-height: 1.15;">Pasted heading</h3>
      </div>
      <!--EndFragment-->
    `;

    const prepared = preparePastedHtml(externalHtml);
    expect(prepared).toContain('style="line-height:1.5;font-size:16px;color:#333333"');
    expect(prepared).toContain('style="line-height:1.15"');
    expect(prepared).not.toContain('<!--StartFragment-->');
  });

  it('strips unsafe styles while preserving line-height during paste', () => {
    const unsafePasted = `
      <p style="line-height: 1.75; position: fixed; top: 0; background-image: url('http://evil.com/x.png');">
        Text with mixed styles
      </p>
    `;

    const prepared = preparePastedHtml(unsafePasted);
    expect(prepared).toContain('style="line-height:1.75"');
    expect(prepared).not.toContain('position');
    expect(prepared).not.toContain('fixed');
    expect(prepared).not.toContain('evil.com');
  });
});

describe('Public Rendering and Sanitization for Posts & Resources', () => {
  it('allows line-height in public posts and study resources sanitizeHtml pipeline', () => {
    const resourceContent = `
      <p class="el-ed" style="line-height: 1.5;">Study note introduction</p>
      <h2 class="el-ed" style="line-height: 1.15;">Case Law Analysis</h2>
      <ol class="el-ed">
        <li style="line-height: 2.0;">Key finding 1</li>
        <li style="line-height: 1.75;">Key finding 2</li>
      </ol>
    `;

    const sanitized = sanitizeHtml(resourceContent);
    expect(sanitized).toContain('style="line-height:1.5"');
    expect(sanitized).toContain('style="line-height:1.15"');
    expect(sanitized).toContain('style="line-height:2.0"');
    expect(sanitized).toContain('style="line-height:1.75"');
  });

  it('properly sanitizes all 5 toolbar options when rendered publicly', () => {
    const optionsHtml = [
      '<p style="line-height: 1.0;">Single 1.0</p>',
      '<p style="line-height: 1.15;">Option 1.15</p>',
      '<p style="line-height: 1.5;">Option 1.5</p>',
      '<p style="line-height: 1.75;">Option 1.75</p>',
      '<p style="line-height: 2.0;">Double 2.0</p>',
      '<p>Default reset</p>',
    ].join('');

    const sanitized = sanitizeHtml(optionsHtml);
    expect(sanitized).toContain('style="line-height:1.0"');
    expect(sanitized).toContain('style="line-height:1.15"');
    expect(sanitized).toContain('style="line-height:1.5"');
    expect(sanitized).toContain('style="line-height:1.75"');
    expect(sanitized).toContain('style="line-height:2.0"');
    expect(sanitized).toContain('<p>Default reset</p>');
  });
});
