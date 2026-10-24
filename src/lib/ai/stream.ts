/**
 * Helpers for the "typing" chat stream.
 *
 * The assistant writes replies as plain text after retrieval + cleanup, so the
 * client can show them appearing live without ever rendering half-sanitised
 * Markdown. Chunks keep their trailing whitespace, which means concatenating
 * every chunk reproduces the reply exactly.
 */

export interface TypingChunk {
  text: string;
  delayMs: number;
}

export interface TypingOptions {
  /** Words per chunk for a typical reply. */
  wordsPerChunk?: number;
  /** Delay between chunks, before the duration cap is applied. */
  delayMs?: number;
  /** Never spend longer than this "typing" (the first chunk is instant). */
  maxDurationMs?: number;
}

export function typingChunks(text: string, options: TypingOptions = {}): TypingChunk[] {
  if (!text.trim()) return [];

  const { wordsPerChunk = 2, delayMs = 18, maxDurationMs = 2400 } = options;

  // Split on whitespace but keep it attached to the word before it, so
  // `chunks.map(c => c.text).join('')` is byte-identical to the input.
  const tokens = text.match(/\S+\s*/g) ?? [];
  if (!tokens.length) return [{ text, delayMs: 0 }];

  // Long replies use bigger chunks: about 60 frames regardless of length, so a
  // 2,000-character answer still finishes typing in a couple of seconds.
  const maxChunks = 60;
  const size = Math.max(wordsPerChunk, Math.ceil(tokens.length / maxChunks));
  const parts: string[] = [];
  for (let i = 0; i < tokens.length; i += size) {
    parts.push(tokens.slice(i, i + size).join(''));
  }

  const perChunk = Math.min(delayMs, Math.floor(maxDurationMs / Math.max(1, parts.length)));
  return parts.map((chunk, index) => ({ text: chunk, delayMs: index === 0 ? 0 : perChunk }));
}

/** One Server-Sent Event frame. */
export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
