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

  const built = units
    .map((unit, index) => {
      const own = classesOf(unit.block.attrs).filter((c) => !MARKER_CLASS.test(c));
      const isLast = index === units.length - 1;
      const gap = Math.min(unit.gapAfter, MAX_GAP);
      const markers = ['el-ed', ...(isLast ? [] : gap === 0 ? ['el-tight'] : gap > 1 ? [`el-gap-${gap}`] : [])];
      if (unit.block.tag === '#text') return unit.block.html;
      let block = unit.block.tag === 'p' ? { ...unit.block, inner: unit.lines.join('<br>') } : unit.block;
      if (block.tag === 'ol') {
        const hasRoman = /data-list\s*=\s*["']roman["']/i.test(block.inner);
        const hasAlpha = /data-list\s*=\s*["']alpha["']/i.test(block.inner);
        if (hasRoman) {
          if (!own.includes('list-roman')) own.push('list-roman');
          if (!/type\s*=/i.test(block.attrs)) {
            block = { ...block, attrs: ` type="i"${block.attrs}` };
          }
        } else if (hasAlpha) {
          if (!own.includes('list-alpha')) own.push('list-alpha');
          if (!/type\s*=/i.test(block.attrs)) {
            block = { ...block, attrs: ` type="a"${block.attrs}` };
          }
        }
      }
      return rebuild(block, [...own, ...markers]);
    })
    .join('');

  return unwrapEmptyListWrappers(built);
}

/**
 * Finds the index of the matching close tag for a given HTML tag, respecting nesting.
 */
function findMatchingCloseTag(html: string, startIndex: number, tag: string): { innerEnd: number; closeEnd: number } | null {
  const tagRe = new RegExp(`<(/?)${tag}(?=[\\s>/])[^>]*>`, 'gi');
  tagRe.lastIndex = startIndex;
  let depth = 1;
  for (let m = tagRe.exec(html); m; m = tagRe.exec(html)) {
    if (m[1]) depth--;
    else if (!m[0].endsWith('/>')) depth++;
    if (depth === 0) {
      return { innerEnd: m.index, closeEnd: m.index + m[0].length };
    }
  }
  return null;
}

/**
 * Checks if an <li> only contains a nested sublist (ol or ul) without any direct
 * readable text or non-list element content.
 */
function isEffectivelyEmptyLi(liInner: string, nestedCloseEnd: number): boolean {
  const beforeList = liInner.slice(0, liInner.indexOf('<')).trim();
  const afterList = liInner.slice(nestedCloseEnd).trim();
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  return strip(beforeList).length === 0 && strip(afterList).length === 0;
}

/**
 * Unwraps empty nested list wrappers (e.g. <ol><li><ol><li><ol><li>...</li></ol></li></ol></li></ol>)
 * where outer list items have no content except the nested sublist.
 * Such patterns horizontally stack markers (1. a. i.) and compound left padding,
 * crushing lines into 2-3 words per line on mobile devices.
 * Unwrapping preserves the intended nested list type (decimal, lower-alpha, lower-roman)
 * with clean single-level indentation.
 */
export function unwrapEmptyListWrappers(html: string): string {
  if (!html || !/(?:<ol|<ul)/i.test(html)) return html;

  let result = '';
  let i = 0;
  while (i < html.length) {
    const openMatch = /^<(ol|ul)(\s[^>]*)?>/i.exec(html.slice(i));
    if (!openMatch) {
      result += html[i];
      i++;
      continue;
    }

    const listTag = openMatch[1].toLowerCase();
    const afterListOpen = i + openMatch[0].length;
    const listClose = findMatchingCloseTag(html, afterListOpen, listTag);
    if (!listClose) {
      result += openMatch[0];
      i = afterListOpen;
      continue;
    }

    const wholeListHtml = html.slice(i, listClose.closeEnd);

    let currentTag = listTag;
    let currentAttrs = openMatch[2] || '';
    let currentInner = html.slice(afterListOpen, listClose.innerEnd);
    let unwrappedLevels = 0;
    const accumulatedClasses: string[] = [];

    const getClasses = (attrs: string) => {
      const m = /\sclass\s*=\s*["']([^"']*)["']/i.exec(attrs);
      return m ? m[1].split(/\s+/).filter(Boolean) : [];
    };

    accumulatedClasses.push(...getClasses(currentAttrs));

    while (true) {
      const liOpenMatch = /^\s*<li(\s[^>]*)?>/i.exec(currentInner);
      if (!liOpenMatch) break;
      const afterLiOpen = liOpenMatch[0].length;
      const liClose = findMatchingCloseTag(currentInner, afterLiOpen, 'li');
      if (!liClose || currentInner.slice(liClose.closeEnd).trim() !== '') break;

      const liInner = currentInner.slice(afterLiOpen, liClose.innerEnd);
      const nestedListOpen = /^\s*<(ol|ul)(\s[^>]*)?>/i.exec(liInner);
      if (!nestedListOpen) break;

      const nestedTag = nestedListOpen[1].toLowerCase();
      const nestedAttrs = nestedListOpen[2] || '';
      const afterNestedOpen = nestedListOpen[0].length;
      const nestedClose = findMatchingCloseTag(liInner, afterNestedOpen, nestedTag);
      if (!nestedClose || !isEffectivelyEmptyLi(liInner, nestedClose.closeEnd)) break;

      unwrappedLevels++;
      currentTag = nestedTag;
      currentAttrs = nestedAttrs;
      accumulatedClasses.push(...getClasses(nestedAttrs));
      currentInner = liInner.slice(afterNestedOpen, nestedClose.innerEnd);
    }

    if (unwrappedLevels > 0) {
      const finalClasses = Array.from(new Set(accumulatedClasses));
      let finalAttrs = currentAttrs.replace(/\sclass\s*=\s*["'][^"']*["']/gi, '');

      if (currentTag === 'ol') {
        const hasExplicitType = /type\s*=/i.test(currentAttrs) || /list-(?:roman|alpha)/.test(finalClasses.join(' '));
        if (!hasExplicitType) {
          if (unwrappedLevels >= 2) {
            if (!finalClasses.includes('list-roman')) finalClasses.push('list-roman');
            if (!/type\s*=/i.test(finalAttrs)) finalAttrs = ` type="i"${finalAttrs}`;
          } else if (unwrappedLevels === 1) {
            if (!finalClasses.includes('list-alpha')) finalClasses.push('list-alpha');
            if (!/type\s*=/i.test(finalAttrs)) finalAttrs = ` type="a"${finalAttrs}`;
          }
        }
      }

      if (finalClasses.length > 0) {
        finalAttrs = ` class="${finalClasses.join(' ')}"${finalAttrs}`;
      }

      result += `<${currentTag}${finalAttrs}>${currentInner}</${currentTag}>`;
      i = listClose.closeEnd;
      continue;
    }

    result += wholeListHtml;
    i = listClose.closeEnd;
  }

  return result;
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

function unpackParagraphLines(blockHtml: string): string {
  return blockHtml.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs: string, inner: string) => {
    if (!/<br\s*\/?>/i.test(inner)) return match;
    if (/^(?:<br\s*\/?>|\s|&nbsp;)*$/i.test(inner.trim())) return match;
    const lines = inner.split(/<br\s*\/?>\s*/gi);
    return lines
      .map((line) => `<p${attrs}>${line}</p>`)
      .join('');
  });
}

/**
 * Strips responsive .table-container wrapper div when loading into Quill editor,
 * ensuring tables are directly accessible as native Quill table blots.
 */
export function unwrapTableContainers(html: string): string {
  if (!html || !html.includes('table-container')) return html;
  return html.replace(/<div\s+[^>]*class=["'][^"']*table-container[^"']*["'][^>]*>\s*(<table[\s\S]*?<\/table>)\s*<\/div>/gi, '$1');
}

/**
 * Article HTML -> Quill HTML, when a saved post is loaded into the editor.
 * Editor-authored blocks get back exactly the blank lines they were saved
 * with; other content gets one blank line between blocks, with existing
 * spacer paragraphs such as WordPress's <p>&nbsp;</p> folded into it.
 */
export function articleHtmlToEditorHtml(html: string): string {
  const unwrapped = unwrapTableContainers(html);
  const blocks = topLevelBlocks(unwrapped).filter((b) => !isBlank(b));
  return blocks
    .map((block, index) => {
      const classes = classesOf(block.attrs);
      const own = classes.filter((c) => !MARKER_CLASS.test(c));
      // Classic-Editor image alignment becomes the line's wrapping format,
      // which is what the editor's image tools read and write.
      const wpWrap = block.tag === 'p' ? wordpressImageWrap(block.inner) : null;
      if (wpWrap && !own.some((c) => c.startsWith('el-wrap-'))) own.push(wpWrap);

      let inner = stripWordPressImageAlignment(block.inner);
      if (block.tag === 'ol') {
        const isRoman = /type\s*=\s*["']i["']/i.test(block.attrs) || classes.includes('list-roman') || /lower-roman/i.test(block.attrs);
        const isAlpha = /type\s*=\s*["']a["']/i.test(block.attrs) || classes.includes('list-alpha') || /lower-alpha/i.test(block.attrs);
        if (isRoman) {
          inner = inner.replace(/<li(?![^>]*data-list)/gi, '<li data-list="roman"');
        } else if (isAlpha) {
          inner = inner.replace(/<li(?![^>]*data-list)/gi, '<li data-list="alpha"');
        }
      }

      let out = rebuild({ ...block, inner }, own);
      if (block.tag === 'p') {
        out = unpackParagraphLines(out);
      }
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
