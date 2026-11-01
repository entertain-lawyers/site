/**
 * Converts post HTML between the article model and the Quill editor model.
 *
 * The editor (Quill) shows every block with no margin: lines touch, and the
 * only vertical space is a blank line (<p><br></p>). The article template
 * instead gives paragraphs, lists, list items, headings and images their own
 * margins. Passing Quill's HTML straight through therefore spread out
 * anything the editor showed together: a "Legal Issues:" line and the list
 * under it, the items of a list, every line of a case header.
 *
 * Saving keeps the editor's layout exactly:
 * - consecutive lines with the same formatting join into one <p> with <br>
 *   (so the old WordPress theme also renders them as one paragraph);
 * - every top-level block gets `el-ed` plus how many blank lines followed it:
 *   `el-tight` (none), nothing (one), or `el-gap-2` … `el-gap-4`;
 * - the article CSS gives `el-ed` blocks zero margins and turns each blank
 *   line into exactly one line of space.
 * Loading reverses it, so load -> save gives back the same HTML. Content
 * without `el-ed` (written in WordPress) gets one blank line between blocks.
 */

const BLANK_LINE = /^(?:\s|&nbsp;|&#160;|<br\s*\/?>)*$/i;
const VOID_TAGS = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'wbr']);
const MAX_GAP = 4;
const MARKER_CLASS = /^el-(?:ed|tight|gap-\d+)$/;
// A floated image must stay in its own block: joining it with the text line
// below would put that text under the image (img is display:block in articles)
// instead of letting it wrap alongside.
const EMBED = /<(?:img|iframe|video|audio)\b/i;

type Block = {
  tag: string; // lower-case tag name, or '#text' for loose text/comments
  attrs: string; // raw attributes of the opening tag (leading space included)
  inner: string; // content between the opening and closing tag
  html: string; // the whole block as written
};

/** Split HTML into its top-level nodes (nested elements stay inside their parent). */
function topLevelBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < html.length) {
    if (/\s/.test(html[i])) {
      i++;
      continue;
    }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i);
      const stop = end === -1 ? html.length : end + 3;
      blocks.push({ tag: '#text', attrs: '', inner: '', html: html.slice(i, stop) });
      i = stop;
      continue;
    }
    const open = /^<([a-zA-Z][\w-]*)(\s[^>]*)?>/.exec(html.slice(i));
    if (!open) {
      // Loose text up to the next tag.
      const next = html.indexOf('<', i + 1);
      const stop = next === -1 ? html.length : next;
      blocks.push({ tag: '#text', attrs: '', inner: '', html: html.slice(i, stop) });
      i = stop;
      continue;
    }
    const tag = open[1].toLowerCase();
    const attrs = (open[2] ?? '').replace(/\/\s*$/, '');
    const afterOpen = i + open[0].length;
    if (VOID_TAGS.has(tag) || open[0].endsWith('/>')) {
      blocks.push({ tag, attrs, inner: '', html: open[0] });
      i = afterOpen;
      continue;
    }
    // Find the matching close tag, counting nested elements of the same name.
    const tagRe = new RegExp(`<(/?)${tag}(?=[\\s>/])[^>]*>`, 'gi');
    tagRe.lastIndex = afterOpen;
    let depth = 1;
    let end = html.length;
    let innerEnd = html.length;
    for (let m = tagRe.exec(html); m; m = tagRe.exec(html)) {
      if (m[1]) depth--;
      else if (!m[0].endsWith('/>')) depth++;
      if (depth === 0) {
        innerEnd = m.index;
        end = m.index + m[0].length;
        break;
      }
    }
    blocks.push({ tag, attrs, inner: html.slice(afterOpen, innerEnd), html: html.slice(i, end) });
    i = end;
  }
  return blocks;
}

const isBlank = (b: Block) => b.tag === 'p' && BLANK_LINE.test(b.inner);

function classesOf(attrs: string): string[] {
  const m = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  return (m?.[1] ?? m?.[2] ?? '').split(/\s+/).filter(Boolean);
}

function withClasses(attrs: string, classes: string[]): string {
  const without = attrs.replace(/\sclass\s*=\s*(?:"[^"]*"|'[^']*')/i, '');
  return classes.length ? ` class="${classes.join(' ')}"${without}` : without;
}

/** Rebuild a block with its classes replaced (markers are added or removed by the caller). */
function rebuild(block: Block, classes: string[]): string {
  if (block.tag === '#text') return block.html;
  const attrs = withClasses(block.attrs, classes);
  if (VOID_TAGS.has(block.tag)) return `<${block.tag}${attrs}>`;
  return `<${block.tag}${attrs}>${block.inner}</${block.tag}>`;
}

/**
 * Quill HTML -> article HTML, for preview and for saving. See the module
 * comment for the markers it writes.
 */
export function editorHtmlToArticleHtml(html: string): string {
  type Unit = { block: Block; lines: string[]; gapAfter: number };
  const units: Unit[] = [];
  let blanks = 0;

  for (const block of topLevelBlocks(html)) {
    if (isBlank(block)) {
      blanks++;
      continue;
    }
    const prev = units[units.length - 1];
    if (
      prev &&
      blanks === 0 &&
      block.tag === 'p' &&
      prev.block.tag === 'p' &&
      prev.block.attrs === block.attrs &&
      !EMBED.test(block.inner) &&
      !EMBED.test(prev.block.inner)
    ) {
      prev.lines.push(block.inner);
    } else {
      if (prev) prev.gapAfter = blanks;
      units.push({ block, lines: [block.inner], gapAfter: 0 });
    }
    blanks = 0;
  }
  // Leading and trailing blank lines are dropped.

  return units
    .map((unit, index) => {
      const own = classesOf(unit.block.attrs).filter((c) => !MARKER_CLASS.test(c));
      const isLast = index === units.length - 1;
      const gap = Math.min(unit.gapAfter, MAX_GAP);
      const markers = ['el-ed', ...(isLast ? [] : gap === 0 ? ['el-tight'] : gap > 1 ? [`el-gap-${gap}`] : [])];
      if (unit.block.tag === '#text') return unit.block.html;
      const block = unit.block.tag === 'p' ? { ...unit.block, inner: unit.lines.join('<br>') } : unit.block;
      return rebuild(block, [...own, ...markers]);
    })
    .join('');
}

// Quill's semantic HTML (what react-quill-new reports) writes a video embed as
// a plain link to its own URL, so the player would be lost on preview/save.
const VIDEO_EMBED_URL =
  /^https:\/\/(?:(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/[\w-]+|player\.vimeo\.com\/video\/\d+(?:\/)?)(?:[?&][^<>"' ]*)?$/;

/** Turn Quill's semantic video link back into the embed iframe the article CSS draws. */
export function restoreVideoEmbeds(html: string): string {
  return html.replace(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g, (match, href: string, text: string) =>
    href === text && VIDEO_EMBED_URL.test(href)
      ? `<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="${href}"></iframe>`
      : match
  );
}

/**
 * Older WordPress posts align images with classes (`alignleft`, `alignright`,
 * `aligncenter`). The editor stores wrapping on the image's line instead, so
 * lift the old image classes onto that line on load. The article CSS styles
 * both forms, so published content keeps working before it is re-saved.
 */
const WP_IMAGE_WRAP: Record<string, string> = {
  alignleft: 'el-wrap-left',
  alignright: 'el-wrap-right',
  aligncenter: 'el-wrap-center',
};

function imageClasses(tag: string): string[] {
  const classAttr = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
  return (classAttr?.[1] ?? classAttr?.[2] ?? '').split(/\s+/).filter(Boolean);
}

function wordpressImageWrap(html: string): string | null {
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const wrap = imageClasses(tag).map((c) => WP_IMAGE_WRAP[c]).find(Boolean);
    if (wrap) return wrap;
  }
  return null;
}

/** Drop alignment classes from the image itself once they live on the block. */
function stripWordPressImageAlignment(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!/\sclass\s*=/i.test(tag)) return tag;
    const kept = imageClasses(tag).filter((c) => !WP_IMAGE_WRAP[c] && c !== 'alignnone');
    const withoutClass = tag.replace(/\sclass\s*=\s*(?:"[^"]*"|'[^']*')/i, '');
    return kept.length
      ? withoutClass.replace(/^<img\b/i, `<img class="${kept.join(' ')}"`)
      : withoutClass;
  });
}

/**
 * Article HTML -> Quill HTML, when a saved post is loaded into the editor.
 * Editor-authored blocks get back exactly the blank lines they were saved
 * with; other content gets one blank line between blocks, with existing
 * spacer paragraphs such as WordPress's <p>&nbsp;</p> folded into it.
 */
export function articleHtmlToEditorHtml(html: string): string {
  const blocks = topLevelBlocks(html).filter((b) => !isBlank(b));
  return blocks
    .map((block, index) => {
      const classes = classesOf(block.attrs);
      const own = classes.filter((c) => !MARKER_CLASS.test(c));
      // Classic-Editor image alignment becomes the line's wrapping format,
      // which is what the editor's image tools read and write.
      const wpWrap = block.tag === 'p' ? wordpressImageWrap(block.inner) : null;
      if (wpWrap && !own.some((c) => c.startsWith('el-wrap-'))) own.push(wpWrap);
      const out = rebuild({ ...block, inner: stripWordPressImageAlignment(block.inner) }, own);
      if (index === blocks.length - 1) return out;
      let gap = 1;
      if (classes.includes('el-ed')) {
        const n = classes.map((c) => /^el-gap-(\d+)$/.exec(c)?.[1]).find(Boolean);
        gap = classes.includes('el-tight') ? 0 : n ? Number(n) : 1;
      }
      return out + '<p><br></p>'.repeat(gap);
    })
    .join('');
}
