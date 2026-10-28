import { describe, it, expect } from 'vitest';
import { htmlToText } from '@/lib/html';

describe('htmlToText', () => {
  it('keeps text and turns block boundaries into newlines', () => {
    expect(htmlToText('<p>First paragraph</p><p>Second<br>line</p>')).toBe(
      'First paragraph\nSecond\nline'
    );
  });

  it('strips every tag, including scripts, so no markup reaches the DOM', () => {
    const output = htmlToText(
      '<h2>Title</h2><script>alert(1)</script><img src=x onerror="alert(2)"><p>Body</p>'
    );
    expect(output).not.toContain('<');
    expect(output).not.toContain('alert(1)');
    expect(output).toContain('Title');
    expect(output).toContain('Body');
  });

  it('decodes common entities and collapses excess blank lines', () => {
    expect(htmlToText('<p>A&nbsp;&amp;&nbsp;B &lt; C</p><p></p><p>D</p>')).toBe(
      'A & B < C\n\nD'
    );
  });
});
