/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from 'vitest';
import { preparePastedHtml, insertClipboardContent } from '../editor-clipboard';

describe('editor-clipboard helper', () => {
  describe('preparePastedHtml', () => {
    it('returns empty string for null or empty input', () => {
      expect(preparePastedHtml('')).toBe('');
      expect(preparePastedHtml(null as any)).toBe('');
    });

    it('preserves bold, italic, underline, strikethrough, headings, and paragraphs', () => {
      const html = `
        <h1>Supreme Court Precedent</h1>
        <p><strong>Section 4:</strong> This is an <em>important</em> rule with <u>underlined text</u> and <s>struck text</s>.</p>
      `;
      const res = preparePastedHtml(html);
      expect(res).toContain('<h1>Supreme Court Precedent</h1>');
      expect(res).toContain('<strong>Section 4:</strong>');
      expect(res).toContain('<em>important</em>');
      expect(res).toContain('<u>underlined text</u>');
      expect(res).toContain('<s>struck text</s>');
    });

    it('preserves numbered and bulleted lists', () => {
      const html = `
        <ol>
          <li>First item</li>
          <li>Second item</li>
        </ol>
        <ul>
          <li>Bullet item</li>
        </ul>
      `;
      const res = preparePastedHtml(html);
      expect(res).toContain('<ol>');
      expect(res).toContain('<li>First item</li>');
      expect(res).toContain('<ul>');
      expect(res).toContain('<li>Bullet item</li>');
    });

    it('preserves links and safe images', () => {
      const html = `
        <p>Read more at <a href="https://example.com/law">Law Portal</a>.</p>
        <p><img src="https://example.com/seal.png" alt="Official Seal" width="200" height="150" /></p>
      `;
      const res = preparePastedHtml(html);
      expect(res).toContain('<a href="https://example.com/law" rel="noopener noreferrer">Law Portal</a>');
      expect(res).toContain('src="https://example.com/seal.png"');
      expect(res).toContain('width="200"');
      expect(res).toContain('height="150"');
      expect(res).toContain('alt="Official Seal"');
    });

    it('extracts content between StartFragment and EndFragment markers', () => {
      const html = `
        Version:0.9
        StartHTML:0000000105
        <!--StartFragment--><p><b>Fragment Content</b></p><!--EndFragment-->
      `;
      const res = preparePastedHtml(html);
      expect(res).toBe('<p><b>Fragment Content</b></p>');
    });

    it('cleans up MS Word annotations like xml namespaces and conditional comments', () => {
      const html = `
        <!--[if !supportLists]--><span style="mso-list:Ignore">1.</span><!--[endif]-->
        <p class="MsoNormal"><o:p>Clean Paragraph</o:p></p>
      `;
      const res = preparePastedHtml(html);
      expect(res).not.toContain('[if !supportLists]');
      expect(res).not.toContain('<o:p>');
      expect(res).toContain('Clean Paragraph');
    });

    it('unwraps Google Docs wrapper element', () => {
      const html = `
        <b style="font-weight:normal;" id="docs-internal-guid-12345">
          <p>Google Docs Paragraph</p>
        </b>
      `;
      const res = preparePastedHtml(html);
      expect(res).not.toContain('docs-internal-guid');
      expect(res).toContain('<p>Google Docs Paragraph</p>');
    });

    it('strips unsafe scripts and event handlers', () => {
      const html = `
        <p>Safe content</p>
        <script>alert('xss');</script>
        <img src="https://example.com/pic.png" onerror="alert(1)" />
        <a href="javascript:alert(2)">Click here</a>
      `;
      const res = preparePastedHtml(html);
      expect(res).not.toContain('<script');
      expect(res).not.toContain('onerror');
      expect(res).not.toContain('javascript:');
      expect(res).toContain('Safe content');
    });

    it('collapses excessive empty lines into a single blank line', () => {
      const html = `
        <p>Paragraph 1</p>
        <p><br></p>
        <p><br></p>
        <p><br></p>
        <p><br></p>
        <p>Paragraph 2</p>
      `;
      const res = preparePastedHtml(html);
      expect(res).toContain('<p>Paragraph 1</p>');
      expect(res).toContain('<p><br></p>');
      expect(res).not.toContain('<p><br></p><p><br></p><p><br></p>');
      expect(res).toContain('<p>Paragraph 2</p>');
    });
  });

  describe('MS Word fake lists (mso-list paragraphs)', () => {
    const WORD_LISTS = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><style>
    @list l0:level1 {mso-level-number-format:decimal;}
    @list l1:level1 {mso-level-number-format:bullet;}
    @list l1:level2 {mso-level-number-format:bullet;}
    </style></head><body>
    <p class=MsoNormal>Intro paragraph</p>
    <p class=MsoListParagraph style='margin-left:36.0pt;text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>1.</span><![endif]>First numbered point</p>
    <p class=MsoListParagraph style='margin-left:36.0pt;text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>2.</span><![endif]>Second numbered point</p>
    <p class=MsoListParagraph style='margin-left:72.0pt;text-indent:-18.0pt;mso-list:l1 level2 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>o</span><![endif]>Nested bullet</p>
    <p class=MsoListParagraph style='margin-left:36.0pt;text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>&bull;</span><![endif]>Top bullet</p>
    <p class=MsoNormal>Trailing paragraph</p>
    </body></html>`;

    it('converts Word fake lists into real ol/ul with nesting', () => {
      const res = preparePastedHtml(WORD_LISTS);
      const compact = res.replace(/\s+/g, '');
      expect(res).toContain('<ol>');
      expect(res).toContain('<ul>');
      // ordered items converted, fake markers removed
      expect(compact).toContain('<li>Firstnumberedpoint</li>');
      // nesting: the sub-level list lives inside the parent li
      expect(compact).toContain('<li>Secondnumberedpoint<ul><li>Nestedbullet</li></ul></li>');
      // bullet level 1 becomes its own ul
      expect(compact).toContain('<ul><li>Topbullet</li></ul>');
      // surrounding paragraphs untouched, mso junk gone
      expect(compact).toContain('Introparagraph</p>');
      expect(compact).toContain('Trailingparagraph</p>');
      expect(res).not.toContain('mso-list');
    });

    it('leaves HTML without mso-list styles untouched', () => {
      const html = '<p><b>bold</b></p><ol><li>real list</li></ol>';
      expect(preparePastedHtml(html)).toContain('<li>real list</li>');
    });
  });

  describe('insertClipboardContent', () => {
    it('returns false when editor is missing or clipboard data is empty', () => {
      expect(insertClipboardContent(null, {})).toBe(false);
      expect(insertClipboardContent({}, { html: '', text: '' })).toBe(false);
    });

    it('inserts converted rich HTML Delta at current selection', () => {
      class MockDelta {
        ops: any[] = [];
        constructor(ops?: any[]) {
          if (ops) this.ops = ops;
        }
        retain(n: number) { return this; }
        delete(n: number) { return this; }
        concat(d: any) { return d; }
        length() { return 10; }
      }

      const mockEditor = {
        constructor: {
          import: vi.fn().mockReturnValue(MockDelta),
        },
        getSelection: vi.fn().mockReturnValue({ index: 5, length: 0 }),
        getFormat: vi.fn().mockReturnValue({}),
        clipboard: {
          convert: vi.fn().mockReturnValue(new MockDelta([{ insert: 'Pasted text' }])),
        },
        updateContents: vi.fn(),
        setSelection: vi.fn(),
        scrollSelectionIntoView: vi.fn(),
      };

      const success = insertClipboardContent(mockEditor, {
        html: '<p><strong>Bold Legal Text</strong></p>',
        text: 'Bold Legal Text',
      });

      expect(success).toBe(true);
      expect(mockEditor.clipboard.convert).toHaveBeenCalledWith(
        expect.objectContaining({ html: '<p><strong>Bold Legal Text</strong></p>' }),
        expect.anything()
      );
      expect(mockEditor.updateContents).toHaveBeenCalled();
      expect(mockEditor.setSelection).toHaveBeenCalled();
      expect(mockEditor.scrollSelectionIntoView).toHaveBeenCalled();
    });

    it('falls back to plain text when HTML is empty', () => {
      class MockDelta {
        ops: any[] = [];
        constructor(ops?: any[]) {
          if (ops) this.ops = ops;
        }
        retain(n: number) { return this; }
        delete(n: number) { return this; }
        concat(d: any) { return d; }
        length() { return 5; }
      }

      const mockEditor = {
        constructor: {
          import: vi.fn().mockReturnValue(MockDelta),
        },
        getSelection: vi.fn().mockReturnValue({ index: 0, length: 0 }),
        getFormat: vi.fn().mockReturnValue({}),
        clipboard: {
          convert: vi.fn().mockReturnValue(new MockDelta([{ insert: 'Plain' }])),
        },
        updateContents: vi.fn(),
        setSelection: vi.fn(),
        scrollSelectionIntoView: vi.fn(),
      };

      const success = insertClipboardContent(mockEditor, {
        html: '',
        text: 'Plain text line',
      });

      expect(success).toBe(true);
      expect(mockEditor.clipboard.convert).toHaveBeenCalledWith(
        { text: 'Plain text line' },
        expect.anything()
      );
      expect(mockEditor.updateContents).toHaveBeenCalled();
    });

    it('preserves line-height styles when inserting pasted HTML into editor', () => {
      class MockDelta {
        ops: any[];
        constructor(ops: any[] = []) { this.ops = ops; }
        retain(_n: number) { return this; }
        delete(_n: number) { return this; }
        concat(d: any) { return d; }
        length() { return 1; }
      }

      const mockEditor = {
        constructor: {
          import: vi.fn().mockReturnValue(MockDelta),
        },
        getSelection: vi.fn().mockReturnValue({ index: 0, length: 0 }),
        getFormat: vi.fn().mockReturnValue({}),
        clipboard: {
          convert: vi.fn().mockReturnValue(new MockDelta([{ insert: '\n', attributes: { lineheight: '1.5' } }])),
        },
        updateContents: vi.fn(),
        setSelection: vi.fn(),
        scrollSelectionIntoView: vi.fn(),
      };

      const pastedHtml = '<p style="line-height: 1.5;">Line spacing content</p>';
      const success = insertClipboardContent(mockEditor, { html: pastedHtml });

      expect(success).toBe(true);
      expect(mockEditor.clipboard.convert).toHaveBeenCalledWith(
        { html: '<p style="line-height:1.5">Line spacing content</p>', text: '' },
        expect.anything()
      );
      expect(mockEditor.updateContents).toHaveBeenCalled();
    });
  });
});

