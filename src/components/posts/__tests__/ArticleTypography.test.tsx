import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/font/google', () => ({
  Roboto: () => ({ variable: 'font-roboto' }),
}));

import ArticleBody from '../ArticleBody';

describe('Article Typography and Word Spacing Regression Suite', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('prohibits inter-word text justification in article-body reading styles to prevent excessive word spacing', () => {
    // Both mobile and desktop .article-body--reading rules must use text-align: start
    // and must NOT contain text-justify: inter-word
    expect(cssContent).not.toContain('text-justify: inter-word');

    // Must enforce natural text-align start and proper overflow wrapping
    expect(cssContent).toMatch(/\.article-body--reading\s*\{[^}]*text-align:\s*start;/);
    expect(cssContent).toMatch(/\.article-body--reading\s*\{[^}]*word-spacing:\s*normal;/);
    expect(cssContent).toMatch(/\.article-body--reading\s*\{[^}]*overflow-wrap:\s*break-word;/);
  });

  it('provides safe mobile fallback for .ql-align-justify on narrow viewports', () => {
    // On screens <= 640px, forced justification causes severe whitespace gaps with long words
    expect(cssContent).toContain('@media (max-width: 640px)');
    expect(cssContent).toContain('text-align: start !important');
  });

  it('renders article body with proper reading classes and typography wrapper', () => {
    const html = renderToStaticMarkup(
      <ArticleBody
        html="<p>This is a legal analysis on constitutional law and judicial precedent.</p>"
      />
    );

    expect(html).toContain('article-body');
    expect(html).toContain('article-body--reading');
    expect(html).toContain('constitutional law and judicial precedent');
  });

  it('preserves Nepali Unicode content and structural formatting without spacing distortion', () => {
    const nepaliContent = '<p>नेपालको संविधान अनुसार मौलिक हक र कानुनी उपचारको व्यवस्था।</p>';
    const html = renderToStaticMarkup(
      <ArticleBody
        html={nepaliContent}
      />
    );

    expect(html).toContain('article-body--reading');
    expect(html).toContain('नेपालको संविधान अनुसार');
  });
});
