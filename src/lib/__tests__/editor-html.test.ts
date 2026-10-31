import { describe, it, expect } from 'vitest';
import { articleHtmlToEditorHtml, editorHtmlToArticleHtml, restoreVideoEmbeds } from '../editor-html';

// WordPress post 5982 as rendered by the REST API (shortened).
const wordpressRendered = [
  '<p><b>Socio-Economic Crime Case: Ram Bahadur Gurung vs. GON, NKP 2072B.S, Vol. 8</b></p>',
  '<p>&nbsp;</p>',
  '<p><i>Case:</i> Narcotic Drug<br />',
  '<i>Plaintiff/Applicant:</i>Government of Nepal<br />',
  '<i>Decision Number:</i>9453</p>',
  '<p>&nbsp;</p>',
  '<p><b>Facts of the Case:</b></p>',
].join('\n');

// What Quill emits: one <p> per line, blank lines as <p><br></p>.
const quillCaseHeader = [
  '<p><b>Socio-Economic Crime Case</b></p>',
  '<p><br></p>',
  '<p><i>Case:</i> Narcotic Drug</p>',
  '<p><i>Plaintiff/Applicant:</i>Government of Nepal</p>',
  '<p><i>Decision Number:</i>9453</p>',
  '<p><br></p>',
  '<p><b>Facts of the Case:</b></p>',
].join('');

// The resource from the bug report: a paragraph, "Legal Issues:" directly
// under it, the list directly under that, then a blank line and a heading line.
const quillLegalIssues = [
  '<p>…interpretation of Section 4(2) of the Labour Act, 2048.</p>',
  '<p><strong>Legal Issues:</strong></p>',
  '<ol><li>What is the legal framework…?</li><li>What is the legal concept…?</li><li>Was the petitioner required…?</li><li>Had the respondent completed 240 days?</li></ol>',
  '<p><br></p>',
  '<p><strong>Different Courts Decision:</strong></p>',
].join('');

/** Simulate Quill loading HTML: every <br> inside a paragraph becomes its own line. */
const asQuillLines = (html: string) =>
  html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/g, (_m, attrs: string, inner: string) =>
    /^(?:<br\s*\/?>)?$/.test(inner.trim())
      ? `<p${attrs}>${inner}</p>`
      : inner
          .split(/<br\s*\/?>\s*/)
          .map((line) => `<p${attrs}>${line}</p>`)
          .join('')
  );

describe('editorHtmlToArticleHtml', () => {
  it('keeps a case header as one paragraph of lines, as it looks in the editor', () => {
    expect(editorHtmlToArticleHtml(quillCaseHeader)).toBe(
      '<p class="el-ed"><b>Socio-Economic Crime Case</b></p>' +
        '<p class="el-ed"><i>Case:</i> Narcotic Drug<br><i>Plaintiff/Applicant:</i>Government of Nepal<br><i>Decision Number:</i>9453</p>' +
        '<p class="el-ed"><b>Facts of the Case:</b></p>'
    );
  });

  it('keeps a list touching the line above it when the editor shows no blank line', () => {
    const out = editorHtmlToArticleHtml(quillLegalIssues);
    expect(out).toBe(
      '<p class="el-ed el-tight">…interpretation of Section 4(2) of the Labour Act, 2048.<br><strong>Legal Issues:</strong></p>' +
        '<ol class="el-ed"><li>What is the legal framework…?</li><li>What is the legal concept…?</li><li>Was the petitioner required…?</li><li>Had the respondent completed 240 days?</li></ol>' +
        '<p class="el-ed"><strong>Different Courts Decision:</strong></p>'
    );
    // A paragraph followed directly by the list must not get a gap.
    expect(editorHtmlToArticleHtml('<p>Legal Issues:</p><ol><li>One</li></ol>')).toBe(
      '<p class="el-ed el-tight">Legal Issues:</p><ol class="el-ed"><li>One</li></ol>'
    );
  });

  it('records how many blank lines follow each block, and drops leading/trailing ones', () => {
    expect(editorHtmlToArticleHtml('<p><br></p><p>A</p><p><br></p><p><br></p><p>B</p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><h2>H</h2><p><br></p>')).toBe(
      '<p class="el-ed el-gap-2">A</p><p class="el-ed el-gap-4">B</p><h2 class="el-ed">H</h2>'
    );
  });

  it('marks blocks that touch with el-tight, keeping their own classes', () => {
    expect(editorHtmlToArticleHtml('<h2>Heading</h2><p class="ql-align-center">Centred</p><p>Plain</p><ul><li>Item</li></ul>')).toBe(
      '<h2 class="el-ed el-tight">Heading</h2><p class="ql-align-center el-ed el-tight">Centred</p><p class="el-ed el-tight">Plain</p><ul class="el-ed"><li>Item</li></ul>'
    );
  });

  it('keeps nested lists, images with width and links intact', () => {
    const html =
      '<ol><li>One</li><li>Two<ol><li>Nested</li></ol></li></ol>' +
      '<p class="ql-align-center"><img src="https://www.entertainlawyers.com/a.jpg" width="278"></p>' +
      '<p>See <a href="https://example.com" rel="noopener noreferrer" target="_blank">this</a></p>';
    expect(editorHtmlToArticleHtml(html)).toBe(
      '<ol class="el-ed el-tight"><li>One</li><li>Two<ol><li>Nested</li></ol></li></ol>' +
        '<p class="ql-align-center el-ed el-tight"><img src="https://www.entertainlawyers.com/a.jpg" width="278"></p>' +
        '<p class="el-ed">See <a href="https://example.com" rel="noopener noreferrer" target="_blank">this</a></p>'
    );
  });

  it('returns an empty editor as empty content', () => {
    expect(editorHtmlToArticleHtml('<p><br></p>')).toBe('');
    expect(editorHtmlToArticleHtml('<p></p>')).toBe('');
    expect(editorHtmlToArticleHtml('')).toBe('');
  });
});

describe('articleHtmlToEditorHtml', () => {
  it('gives editor-authored blocks back exactly the blank lines they were saved with', () => {
    expect(articleHtmlToEditorHtml('<p class="el-ed el-tight">Legal Issues:</p><ol class="el-ed"><li>One</li></ol><p class="el-ed el-gap-3">Next</p><p class="el-ed">Last</p>')).toBe(
      '<p>Legal Issues:</p><ol><li>One</li></ol><p><br></p><p>Next</p><p><br></p><p><br></p><p><br></p><p>Last</p>'
    );
  });

  it('puts one blank line between blocks of WordPress content and folds &nbsp; spacers into it', () => {
    const editor = articleHtmlToEditorHtml(wordpressRendered);
    expect(editor.match(/<p><br><\/p>/g)).toHaveLength(2);
    expect(editor).not.toContain('&nbsp;');
    expect(articleHtmlToEditorHtml('<p>Legal Issues:</p>\n<ol>\n<li>One</li>\n</ol>\n<h3>H</h3>')).toBe(
      '<p>Legal Issues:</p><p><br></p><ol>\n<li>One</li>\n</ol><p><br></p><h3>H</h3>'
    );
  });

  it('keeps non-marker classes such as alignment', () => {
    expect(articleHtmlToEditorHtml('<p class="ql-align-center el-ed el-tight">C</p><p class="el-ed">D</p>')).toBe(
      '<p class="ql-align-center">C</p><p>D</p>'
    );
  });
});

describe('restoreVideoEmbeds', () => {
  it('turns Quill\'s semantic video link back into the embed iframe', () => {
    const video = '<a href="https://www.youtube.com/embed/abc_123-XY?showinfo=0">https://www.youtube.com/embed/abc_123-XY?showinfo=0</a>';
    expect(restoreVideoEmbeds(video)).toBe(
      '<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/abc_123-XY?showinfo=0"></iframe>'
    );
    expect(restoreVideoEmbeds('<a href="https://player.vimeo.com/video/123456/">https://player.vimeo.com/video/123456/</a>')).toContain('<iframe');

    // Saved and reloaded, the embed stays a player.
    const restored = restoreVideoEmbeds(video);
    const saved = editorHtmlToArticleHtml(restored);
    expect(saved).toContain('<iframe class="ql-video el-ed');
    expect(articleHtmlToEditorHtml(saved)).toBe(restored);
  });

  it('leaves a real link alone', () => {
    for (const html of [
      '<a href="https://www.youtube.com/embed/abc" rel="noopener noreferrer" target="_blank">Watch this</a>',
      '<a href="https://www.youtube.com/watch?v=abc">https://www.youtube.com/watch?v=abc</a>',
      '<a href="https://evil.example/embed/abc">https://evil.example/embed/abc</a>',
    ]) {
      expect(restoreVideoEmbeds(html)).toBe(html);
    }
  });
});

describe('round trip', () => {
  it('editor -> save -> load -> save is lossless for editor content', () => {
    for (const quill of [quillCaseHeader, quillLegalIssues, '<h2>H</h2><p><br></p><p><br></p><p>A</p><p>B</p><ul><li>x</li></ul><p><br></p><p class="ql-align-right">R</p>']) {
      const saved = editorHtmlToArticleHtml(quill);
      const reloaded = asQuillLines(articleHtmlToEditorHtml(saved));
      expect(reloaded).toBe(quill);
      expect(editorHtmlToArticleHtml(reloaded)).toBe(saved);
    }
  });

  it('WordPress content: load -> save -> load -> save is stable after the first save', () => {
    const firstSave = editorHtmlToArticleHtml(asQuillLines(articleHtmlToEditorHtml(wordpressRendered)));
    expect(firstSave).toContain('<i>Case:</i> Narcotic Drug<br><i>Plaintiff/Applicant:</i>');
    const secondSave = editorHtmlToArticleHtml(asQuillLines(articleHtmlToEditorHtml(firstSave)));
    expect(secondSave).toBe(firstSave);
  });
});
