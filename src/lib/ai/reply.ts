/**
 * Final-pass cleanup for model replies.
 *
 * The chat bubble renders plain text with `white-space: pre-wrap`, so any
 * Markdown the model slips in shows up literally ("**Note**", "## Heading",
 * "[label](url)"). This keeps replies readable and consistent no matter which
 * provider answered (Groq, Gemini or OpenRouter all drift differently).
 */

export interface PolishOptions {
  /** Hard cap; truncation happens on a sentence/line boundary. */
  maxChars?: number;
  /** Strip a repeated greeting when the conversation is already open. */
  hasHistory?: boolean;
  /** Strip a leading Nepali greeting (used for English questions). */
  stripGreeting?: boolean;
  /** Characters left before the cap at which we stop looking for a boundary. */
  boundaryWindow?: number;
}

/** Markdown links → "label (url)" (or just the URL when the label is the URL). */
function normalizeLinks(text: string): string {
  return text.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
    (_match, label: string, url: string) => {
      const cleanLabel = label.trim();
      return cleanLabel === url ? url : `${cleanLabel} (${url})`;
    }
  );
}

function truncateAtBoundary(text: string, maxChars: number, window: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const minBoundary = Math.max(0, maxChars - window);
  const candidates = [
    slice.lastIndexOf('\n\n'),
    slice.lastIndexOf('. '),
    slice.lastIndexOf('। '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('\n'),
  ];
  const cut = Math.max(...candidates);
  if (cut >= minBoundary) return slice.slice(0, cut + 1).trim();
  return `${slice.trimEnd()}…`;
}

/**
 * Normalize a model reply for display.
 * Idempotent: running it twice produces the same text.
 */
export function polishReply(raw: string, options: PolishOptions = {}): string {
  if (!raw) return '';
  let text = raw.replace(/\r\n?/g, '\n').trim();

  // Fenced code blocks are never useful in this chat.
  text = text.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '');

  // Markdown headings → plain line.
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');

  // Emphasis markers.
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  text = text.replace(/__([^_\n]+)__/g, '$1');
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1$2');
  text = text.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1$2');

  // Inline code / stray backticks.
  text = text.replace(/`([^`\n]+)`/g, '$1');
  text = text.replace(/`/g, '');

  // Links, then bare emphasis leftovers.
  text = normalizeLinks(text);

  // Bullets: "* ", "+ " → "• " (keep "- " as-is; it is already readable).
  text = text.replace(/^[ \t]*[*+][ \t]+/gm, '• ');

  // Horizontal rules and empty emphasis lines.
  text = text.replace(/^[ \t]*([-*_])[ \t]*(?:\1[ \t]*){2,}$/gm, '');
  text = text.replace(/^[ \t]*\*\*[ \t]*$/gm, '');

  // Parenthetical source notes duplicate the source chips and are often the
  // page the model guessed rather than the one it used.
  text = text.replace(/\s*\((?:source|sources|reference|url|स्रोत|सन्दर्भ)\s*:\s*[^)]*\)/gi, '');
  // Trailing "(the calculator page)" / "(see the 1st Semester page)" style
  // references are equally redundant.
  text = text.replace(/\s*\((?:the|this|our)\s+[^)]{0,60}\s+(?:page|section|link)\)\s*$/i, '');
  text = text.replace(/\s*\((?:see|read|view|open|visit|check)\b[^)]{0,80}\)\s*$/i, '');

  // A standalone "Source: /x" footer is redundant (the UI shows source chips)
  // and is often the page the model guessed rather than the one it used.
  text = text.replace(/\n+(?:source|sources|reference|references)\s*:\s*[^\n]+(?:\n[^\n]+)*$/i, '');

  // Collapse whitespace noise.
  text = text.replace(/[ \t]+$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');

  // A repeated "नमस्ते" opener after the first turn adds no information; on an
  // English question the model must not greet in Nepali at all.
  if (options.hasHistory || options.stripGreeting) {
    text = text.replace(/^(?:नमस्ते|नमस्कार|namaste)[^\n]{0,80}\n+/i, '');
  }
  if (options.stripGreeting) {
    text = text.replace(/^(?:विद्वान्|विद्वान)\s*ज्यू\s*[,!.–—-]*\s*\n*/u, '');
    // Stripping an address can leave a lowercase sentence start.
    text = text.replace(/^([a-z])/, (letter) => letter.toUpperCase());
  }

  text = text.trim();

  if (options.maxChars && text.length > options.maxChars) {
    text = truncateAtBoundary(text, options.maxChars, options.boundaryWindow ?? 200);
  }

  return text.trim();
}

/** True when the reply is empty after cleanup (so callers can fall back). */
export function isEmptyReply(text: string | null | undefined): boolean {
  return !text || !text.replace(/[\s•\-–—.,;:!?()]/g, '').length;
}

/**
 * True when the model declined because the indexed content did not cover the
 * question. Such replies must not carry source chips: the nearest vector hits
 * are unrelated pages, not support for the answer.
 */
export function isNoContentReply(text: string | null | undefined): boolean {
  if (!text) return false;
  if (text.length > 600) return false;

  const english =
    /(?:don'?t|do not) have (?:notes|information|details|an answer)|not in (?:our|the) (?:content|notes|index|library)|no closely matching|couldn'?t find (?:that|it|any) (?:in|on) (?:the|our) (?:notes|content|site)|not covered (?:in|by) (?:the|our) (?:notes|content)/i;
  const nepali = /(?:जानकारी|नोट|सामग्री)[^.\n]{0,40}(?:छैन|भेटिएन)|(?:छैन|भेटिएन)[^.\n]{0,20}(?:जानकारी|नोट)/;

  return english.test(text) || nepali.test(text);
}
