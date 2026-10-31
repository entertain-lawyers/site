/**
 * Converts post HTML between the article model and the Quill editor model.
 *
 * WordPress and the public article CSS treat <p> as a paragraph with a 1.6em
 * gap after it, and put line breaks inside a paragraph as <br>. Quill has no
 * soft line break: it turns every <br> into its own <p> line, shows <p> with
 * no gap, and writes blank lines as <p><br></p>. Feeding Quill's HTML straight
 * to the article template therefore spread every line of a case header
 * ("Case:", "Plaintiff:", ...) a paragraph apart in /preview and, after
 * saving, on the live post.
 *
 * Only runs of top-level <p> elements are rewritten; headings, lists, quotes,
 * images in their own blocks and everything else pass through unchanged.
 */

// Quill output is flat, so a top-level <p> never contains another <p>.
const PARAGRAPH = /<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi;
const BLANK_LINE = /^(?:\s|&nbsp;|&#160;|<br\s*\/?>)*$/i;

type Token = { kind: 'p'; attrs: string; inner: string } | { kind: 'other'; html: string };

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of html.matchAll(PARAGRAPH)) {
    const between = html.slice(last, match.index);
    if (between.trim()) tokens.push({ kind: 'other', html: between });
    tokens.push({ kind: 'p', attrs: match[1] ?? '', inner: match[2] });
    last = match.index + match[0].length;
  }
  const rest = html.slice(last);
  if (rest.trim()) tokens.push({ kind: 'other', html: rest });
  return tokens;
}

const isBlank = (t: Token) => t.kind === 'p' && BLANK_LINE.test(t.inner);
const paragraph = (attrs: string, inner: string) => `<p${attrs}>${inner}</p>`;

/**
 * Quill HTML → article HTML, for preview and for saving. Consecutive lines with
 * the same formatting join into one paragraph with <br>; blank lines become
 * paragraph breaks (several in a row count as one).
 */
export function editorHtmlToArticleHtml(html: string): string {
  const out: string[] = [];
  let current: { attrs: string; lines: string[] } | null = null;
  const flush = () => {
    if (current) out.push(paragraph(current.attrs, current.lines.join('<br>')));
    current = null;
  };

  for (const token of tokenize(html)) {
    if (token.kind === 'other') {
      flush();
      out.push(token.html);
    } else if (isBlank(token)) {
      flush();
    } else if (current && current.attrs === token.attrs) {
      current.lines.push(token.inner);
    } else {
      flush();
      current = { attrs: token.attrs, lines: [token.inner] };
    }
  }
  flush();
  return out.join('');
}

/**
 * Article HTML → Quill HTML, when a saved post is loaded into the editor. Puts
 * exactly one blank line between adjacent paragraphs so Quill keeps them apart
 * (it drops paragraph margins), and collapses existing spacer paragraphs such
 * as WordPress's <p>&nbsp;</p> into that one blank line. Saving the result
 * with editorHtmlToArticleHtml gives back the same paragraphs.
 */
export function articleHtmlToEditorHtml(html: string): string {
  const out: string[] = [];
  let previous: Token | null = null;
  let pendingGap = false;

  for (const token of tokenize(html)) {
    if (isBlank(token)) {
      pendingGap = previous !== null;
      continue;
    }
    if (token.kind === 'p' && previous?.kind === 'p') {
      out.push('<p><br></p>');
    } else if (pendingGap && previous) {
      // A spacer between a paragraph and another block: keep one blank line.
      out.push('<p><br></p>');
    }
    out.push(token.kind === 'p' ? paragraph(token.attrs, token.inner) : token.html);
    previous = token;
    pendingGap = false;
  }
  return out.join('');
}
