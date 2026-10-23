import { Roboto } from 'next/font/google';

/**
 * Reading-page typography.
 *
 * The previous WordPress site set article bodies in Roboto (18px desktop,
 * 16px mobile, justified). Loading it here keeps the reading page familiar
 * for returning readers. Deliberately scoped to the article body via the
 * `--font-article` variable — the rest of the site keeps its own font.
 */
export const articleFont = Roboto({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-article',
  display: 'swap',
});
