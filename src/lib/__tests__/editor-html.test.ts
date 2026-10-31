import { describe, it, expect } from 'vitest';
import { articleHtmlToEditorHtml, editorHtmlToArticleHtml } from '../editor-html';

// WordPress post 5982 as rendered by the REST API (shortened).
const wordpressRendered = [
  '<p><b>Socio-Economic Crime Case: Ram Bahadur Gurung vs. GON, NKP 2072B.S, Vol. 8</b></p>',
  '<p>&nbsp;</p>',
  '<p><i>Case:</i> Narcotic Drug<br />',
  '<i>Plaintiff/Applicant:</i>Government of Nepal<br />',
  '<i>Defendant/Respondent:</i>Ram Bahadur Gurung<br />',
  '<i>Decision Number:</i>9453</p>',
  '<p>&nbsp;</p>',
  '<p><b>Facts of the Case:</b></p>',
].join('\n');

// What Quill emits for that post: one <p> per line, blank lines as <p><br></p>.
const quillOutput = [
  '<p><b>Socio-Economic Crime Case: Ram Bahadur Gurung vs. GON, NKP 2072B.S, Vol. 8</b></p>',
  '<p><br></p>',
  '<p><i>Case:</i> Narcotic Drug</p>',
  '<p><i>Plaintiff/Applicant:</i>Government of Nepal</p>',
  '<p><i>Defendant/Respondent:</i>Ram Bahadur Gurung</p>',
  '<p><i>Decision Number:</i>9453</p>',
  '<p><br></p>',
  '<p><b>Facts of the Case:</b></p>',
].join('');

const paragraphs = (html: string) => html.match(/<p[\s>]/g)?.length ?? 0;

describe('editorHtmlToArticleHtml', () => {
  it('keeps a case header as one paragraph of lines, as it looks in the editor', () => {
    expect(editorHtmlToArticleHtml(quillOutput)).toBe(
      '<p><b>Socio-Economic Crime Case: Ram Bahadur Gurung vs. GON, NKP 2072B.S, Vol. 8</b></p>' +
        '<p><i>Case:</i> Narcotic Drug<br><i>Plaintiff/Applicant:</i>Government of Nepal<br>' +
        '<i>Defendant/Respondent:</i>Ram Bahadur Gurung<br><i>Decision Number:</i>9453</p>' +
        '<p><b>Facts of the Case:</b></p>'
    );
  });

  it('treats several blank lines as one paragraph break and drops leading/trailing blanks', () => {
    expect(editorHtmlToArticleHtml('<p><br></p><p>A</p><p><br></p><p><br></p><p>B</p><p><br></p>')).toBe(
      '<p>A</p><p>B</p>'
    );
  });

  it('does not join lines with different formatting, and leaves other blocks alone', () => {
    const html =
      '<h2>Heading</h2><p class="ql-align-center">Centred</p><p>Plain</p>' +
      '<ol><li data-list="bullet">Item</li></ol><p>After list</p>';
    expect(editorHtmlToArticleHtml(html)).toBe(html);
  });

  it('returns an empty editor as empty content', () => {
    expect(editorHtmlToArticleHtml('<p><br></p>')).toBe('');
    expect(editorHtmlToArticleHtml('<p></p>')).toBe('');
  });
});

describe('articleHtmlToEditorHtml', () => {
  it('separates paragraphs with exactly one blank line and collapses &nbsp; spacers', () => {
    const editor = articleHtmlToEditorHtml(wordpressRendered);
    expect(editor.startsWith('<p><b>Socio-Economic')).toBe(true);
    expect(editor.match(/<p><br><\/p>/g)).toHaveLength(2);
    expect(editor).not.toContain('&nbsp;');
  });

  it('round-trips: load, edit nothing, save gives back the same paragraphs', () => {
    // Quill splits <br> into lines on load; simulate that before saving.
    const asQuillWouldEmit = articleHtmlToEditorHtml(wordpressRendered).replace(/<br \/>\n/g, '</p><p>');
    const saved = editorHtmlToArticleHtml(asQuillWouldEmit);

    expect(paragraphs(saved)).toBe(3);
    expect(saved).toContain('<i>Case:</i> Narcotic Drug<br><i>Plaintiff/Applicant:</i>');
    expect(editorHtmlToArticleHtml(articleHtmlToEditorHtml(saved).replace(/<br>(?!<\/p>)/g, '</p><p>'))).toBe(saved);
  });

  it('keeps one blank line where a spacer sat between a paragraph and another block', () => {
    expect(articleHtmlToEditorHtml('<p>A</p><p>&nbsp;</p><h2>H</h2>')).toBe('<p>A</p><p><br></p><h2>H</h2>');
    expect(articleHtmlToEditorHtml('<h2>H</h2><p>A</p>')).toBe('<h2>H</h2><p>A</p>');
  });
});
