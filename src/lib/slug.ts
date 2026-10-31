import { randomBytes } from 'crypto';
import { romanizeDevanagari } from './translit-search';
import { isUniqueConstraintError } from './prisma-errors';

const MAX_SLUG_LENGTH = 80;

/**
 * URL slug for a person or page name, matching the `^[a-z0-9-]+$` shape every
 * other slug in the app uses.
 *
 * The previous `[^a-z0-9]+ → '-'` approach turned names written in Nepali
 * ("राम बहादुर") into an empty string, so the first such profile got the slug
 * "" and the next one "-1". Devanagari is now romanized ("ram-bahadur") and
 * Latin accents are folded ("José" → "jose"). Scripts with no romanization
 * return "" so the caller can fall back to a generated slug.
 */
export function slugify(input: string): string {
  const prepared = input
    .normalize('NFKD')
    // Latin combining accents only; Devanagari vowel signs live in U+0900–U+097F.
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    // A word-final consonant is read without its inherent vowel in Nepali
    // names ("राम" is "ram", not "rama"), so give it an explicit virama.
    .replace(/([क-ह]़?)(?=[^ऀ-ॿ]|$)/g, '$1्');

  return romanizeDevanagari(prepared)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');
}

/** `slugify`, or `<prefix>-<random>` when the text has nothing to romanize. */
export function slugifyWithFallback(input: string, prefix: string): string {
  return slugify(input) || `${prefix}-${randomBytes(3).toString('hex')}`;
}

/**
 * Picks the first free slug (`base`, `base-1`, `base-2`, …) and runs `write`
 * with it. Checking for a free slug and inserting are two steps, so two
 * admins saving the same name at once can both pick `base`; the loser's
 * unique-constraint error now triggers another pick instead of surfacing as
 * a generic failure.
 */
export async function withUniqueSlug<T>(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
  write: (slug: string) => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    let slug = base;
    for (let counter = 1; await isTaken(slug); counter++) {
      slug = `${base}-${counter}`;
    }

    try {
      return await write(slug);
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt >= maxAttempts) throw error;
    }
  }
}
