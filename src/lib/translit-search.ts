/**
 * Transliteration-aware search matching.
 *
 * Converts Devanagari text to a normalized romanized (roman-lipi) key so a
 * user typing "sambandha", "adhivesan", "kort fee"... in Roman script finds
 * Devanagari titles ("सम्बन्ध", "अधिवेशन", "कोर्ट फी") — and Devanagari
 * queries still hit romanized titles. Matching passes:
 *   1. direct case-insensitive contains
 *   2. romanized-key contains (both directions)
 *   3. consonant skeleton contains (ignores all vowel variation)
 *   4. fuzzy windows on the romanized keys (typo/spelling-variant tolerance)
 */

// Consonants emit their base roman (no inherent 'a'); the 'a' is appended by
// the scanner depending on what follows (matra / virama / nothing).
const DEV_CONSONANT: Record<string, string> = {
  '\u0915': 'k',  '\u0916': 'kh', '\u0917': 'g',  '\u0918': 'gh', '\u0919': 'n',
  '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'n',
  '\u091F': 't',  '\u0920': 'th', '\u0921': 'd',  '\u0922': 'dh', '\u0923': 'n',
  '\u0924': 't',  '\u0925': 'th', '\u0926': 'd',  '\u0927': 'dh', '\u0928': 'n',
  '\u092A': 'p',  '\u092B': 'ph', '\u092C': 'b',  '\u092D': 'bh', '\u092E': 'm',
  '\u092F': 'y',  '\u0930': 'r',  '\u0932': 'l',  '\u0933': 'l',  '\u0935': 'v',
  '\u0936': 'sh', '\u0937': 'sh', '\u0938': 's',  '\u0939': 'h',
};

// Vowel signs attached to consonants (matras) + pure vowels, normalized so
// long/short variants collapse into the same roman key.
const DEV_VOWEL: Record<string, string> = {
  '\u0905': 'a', '\u0906': 'a', '\u0907': 'i', '\u0908': 'i', '\u0909': 'u',
  '\u090A': 'u', '\u090B': 'ri', '\u090C': 'ri', '\u090F': 'e', '\u0910': 'e',
  '\u0913': 'o', '\u0914': 'o', '\u090D': 'e', '\u0911': 'o', '\u0912': 'o',
  '\u093E': 'a', '\u093F': 'i', '\u0940': 'i', '\u0941': 'u', '\u0942': 'u',
  '\u0943': 'ri', '\u0944': 'ri', '\u0947': 'e', '\u0948': 'e', '\u0949': 'o',
  '\u094A': 'o', '\u094B': 'o', '\u094C': 'o',
  '\u0902': 'n', // ं anusvara → n ("an"/"am" endings)
  '\u0901': 'n', // ँ chandrabindu
  '\u0903': 'h', // ः visarga
};

const VIRAMA = '\u094D';
const NUKTA = '\u093C';

/** Devanagari → roman key with inherent-'a' handled after every consonant. */
function romanizeDevanagari(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === NUKTA) continue; // ज़ → ज, फ़ → फ — fold into the base letter

    const cons = DEV_CONSONANT[ch];
    if (cons) {
      const next = text[i + 1];
      if (next === NUKTA) i++; // fold nukta
      const after = text[i + 1];
      if (after === VIRAMA) {
        out += cons;
        i++; // consume the halanta — no inherent vowel
      } else if (after && DEV_VOWEL[after] !== undefined) {
        out += cons + DEV_VOWEL[after];
        i++; // consume the matra — it replaces the inherent vowel
      } else {
        out += cons + 'a'; // inherent vowel
      }
      continue;
    }

    const vow = DEV_VOWEL[ch];
    if (vow !== undefined) {
      out += vow;
      continue;
    }

    if (/[A-Za-z0-9]/.test(ch)) out += ch.toLowerCase();
    // spaces, punctuation, symbols → dropped
  }
  return out;
}

/** Normalize any string (Latin, Devanagari, or mixed) into a comparable search key. */
export function romanize(input: string): string {
  if (!input) return '';
  // c→k, q→k roman-loanword equivalence ("court" ↔ "कोर्ट"), applied to both
  // sides of every comparison so it stays symmetric.
  return romanizeDevanagari(input).replace(/[cq]/g, 'k');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Fuzzy sliding-window containment with typo tolerance. Needs len ≥ 4. */
function fuzzyContains(hay: string, needle: string): boolean {
  const len = needle.length;
  const hlen = hay.length;
  if (!len || !hlen) return false;
  if (hay.includes(needle) || needle.includes(hay)) return true;

  if (len < 4) return false; // short keys: keep exact
  const tol = Math.min(3, Math.max(1, Math.ceil(len / 3)));

  // quick guard: most chars of the needle should exist in the hay
  let shared = 0;
  for (const c of needle) if (hay.includes(c)) shared++;
  if (shared < Math.ceil(len * 0.5)) return false;

  for (let start = 0; start <= hlen - len; start++) {
    for (let extra = 0; extra <= tol; extra++) {
      const window = hay.slice(start, start + len + extra);
      if (levenshtein(needle, window) <= tol) return true;
    }
  }
  return false;
}

/**
 * True when `title` matches `query` (direct case-insensitive hit, or a
 * transliteration-fuzzy hit either way: roman↔Devanagari, both directions).
 */
export function searchMatches(title: string, query: string): boolean {
  if (!title || !query) return false;

  const q = query.trim();
  if (!q) return false;

  // 1) direct, case-insensitive literal match (Latin or Devanagari, either way)
  const tLower = title.toLowerCase();
  const qLower = q.toLowerCase();
  if (tLower.includes(qLower)) return true;

  // 2) romanized-key containment (handles roman ↔ Devanagari)
  const titleKey = romanize(title);
  const queryKey = romanize(q);
  if (!titleKey || !queryKey) return false;
  if (titleKey.includes(queryKey) || queryKey.includes(titleKey)) return true;

  // 3) consonant skeleton — ignores all vowel variation entirely
  //    (great for "samjhauta" ↔ "samjhota" style variance)
  const titleSkel = titleKey.replace(/[aeiou]/g, '');
  const querySkel = queryKey.replace(/[aeiou]/g, '');
  if (titleSkel && querySkel &&
      (titleSkel.includes(querySkel) || querySkel.includes(titleSkel) ||
       fuzzyContains(titleSkel, querySkel) || fuzzyContains(querySkel, titleSkel))) return true;

  // 4) fuzzy windows on the full keys (typos, ch/chh, final-a dropped, ...)
  return fuzzyContains(titleKey, queryKey) || fuzzyContains(queryKey, titleKey);
}
