import { describe, it, expect } from 'vitest';
import { polishReply, isEmptyReply, isNoContentReply } from '../reply';

describe('polishReply', () => {
  it('removes Markdown that the chat bubble would show literally', () => {
    const raw = '## Heading\n\n**Note:** this is *important* and `inline`.\n\n```ts\nconst x = 1;\n```';
    const text = polishReply(raw);
    expect(text).not.toContain('##');
    expect(text).not.toContain('**');
    expect(text).not.toContain('`');
    expect(text).toContain('Heading');
    expect(text).toContain('Note: this is important and inline.');
  });

  it('turns Markdown links into plain "label (url)" text', () => {
    expect(polishReply('Read [the notes](/study) and [docs](https://example.com).')).toBe(
      'Read the notes (/study) and docs (https://example.com).'
    );
  });

  it('normalizes bullets and collapses blank lines', () => {
    const text = polishReply('Intro\n\n\n\n* one\n* two\n+ three');
    expect(text).toBe('Intro\n\n• one\n• two\n• three');
  });

  it('strips a repeated greeting when the conversation is open', () => {
    const text = polishReply('नमस्ते, विद्वान् ज्यू!\n\nHere is the answer.', { hasHistory: true });
    expect(text).toBe('Here is the answer.');
  });

  it('keeps the greeting on the first turn', () => {
    const text = polishReply('नमस्ते, विद्वान् ज्यू!\n\nHere is the answer.');
    expect(text).toContain('नमस्ते');
  });

  it('strips a Nepali greeting from an English answer', () => {
    const text = polishReply('नमस्ते, विद्वान् ज्यू!\n\nHere is the answer.', { stripGreeting: true });
    expect(text).toBe('Here is the answer.');
  });

  it('strips a Nepali address from an English answer and fixes the capital', () => {
    expect(polishReply('विद्वान् ज्यू, the 1st semester includes 11 subjects.', { stripGreeting: true })).toBe(
      'The 1st semester includes 11 subjects.'
    );
  });

  it('removes a trailing page-reference parenthetical', () => {
    expect(polishReply('The fee is progressive. (the calculator page)')).toBe('The fee is progressive.');
    expect(polishReply('English-I, Legal Method. (see the 1st Semester page)')).toBe(
      'English-I, Legal Method.'
    );
  });

  it('removes parenthetical and footer source notes', () => {
    expect(polishReply('The court fee is progressive. (स्रोत: /calculator)')).toBe(
      'The court fee is progressive.'
    );
    expect(polishReply('The court fee is progressive. (URL: /calculator)')).toBe(
      'The court fee is progressive.'
    );
    expect(polishReply('Answer.\n\nSource: /explore')).toBe('Answer.');
    expect(polishReply('Answer.\n\nSources:\n/explore\n/team')).toBe('Answer.');
  });

  it('truncates on a sentence boundary', () => {
    const raw = `${'A complete sentence. '.repeat(20)}Tail`;
    const text = polishReply(raw, { maxChars: 80 });
    expect(text.length).toBeLessThanOrEqual(81);
    expect(text.endsWith('.')).toBe(true);
    expect(text).not.toContain('Tail');
  });

  it('is idempotent', () => {
    const once = polishReply('## Title\n\n**Bold** and [link](/x)\n\n* item');
    expect(polishReply(once)).toBe(once);
  });
});

describe('isEmptyReply', () => {
  it('treats whitespace and bullet-only output as empty', () => {
    expect(isEmptyReply('')).toBe(true);
    expect(isEmptyReply('   \n\n')).toBe(true);
    expect(isEmptyReply('• -')).toBe(true);
    expect(isEmptyReply('Real answer')).toBe(false);
  });
});

describe('isNoContentReply', () => {
  it('recognizes a grounded decline in English and Nepali', () => {
    expect(isNoContentReply("I don't have notes on that yet — the library is still growing.")).toBe(
      true
    );
    expect(isNoContentReply('That topic is not in our content yet.')).toBe(true);
    expect(isNoContentReply('माफ गर्नुहोस्, यो विषयमा हाम्रो नोटहरूमा जानकारी छैन।')).toBe(true);
  });

  it('does not flag a real answer that happens to mention a missing field', () => {
    expect(isNoContentReply('Email: baburam.jnk@gmail.com. Phone: not listed.')).toBe(false);
    expect(
      isNoContentReply(
        'The court fee is progressive. Section 69 sets the schedule, and the winning party may recover it.'
      )
    ).toBe(false);
  });
});
