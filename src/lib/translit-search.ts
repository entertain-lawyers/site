/**
 * Transliteration-aware search matching.
 *
 * Every title/query pair is reduced to a normalized roman key so a user typing
 * "sambandha", "adalati dastur" or "kort fee" in Roman script finds Devanagari
 * titles ("सम्बन्ध", "अदालती दस्तुर", "कोर्ट फी") — and Devanagari queries still
 * find Latin titles.
 *
 * Matching is intentionally *strict*: a result must share a real word with the
 * query. Earlier versions compared fuzzy sliding windows over the whole
 * romanized string, which matched almost any long title ("contract" surfaced
 * unrelated Nepali blog posts). Now matching happens at word level:
 *   1. word-boundary phrase match (same script)
 *   2. word-level roman/Devanagari comparison (exact, prefix while typing,
 *      vowel/plural folding, and one-edit typos with the same consonant
 *      skeleton)
 *   3. compound folding — a spaced query ("मानव अधिकार") matches a joined
 *      title word ("मानवअधिकारको") and vice versa.
 */

// Consonants emit their base roman (no inherent 'a'); the 'a' is appended by
// the scanner depending on what follows (matra / virama / nothing).
const DEV_CONSONANT: Record<string, string> = {
  '\u0915': 'k',  '\u0916': 'kh', '\u0917': 'g',  '\u0918': 'gh', '\u0919': 'n',
  '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'n',
  '\u091F': 't',  '\u0920': 'th', '\u0921': 'd',  '\u0922': 'dh', '\u0923': 'n',
  '\u0924': 't',  '\u0925': 'th', '\u0926': 'd',  '\u0927': 'dh', '\u0928': 'n',
  '\u092A': 'p',  '\u092B': 'ph', '\u092C': 'b',  '\u092D': 'bh', '\u092E': 'm',
  '\u092F': 'y',  '\u0930': 'r', '\u0932': 'l', '\u0933': 'l', '\u0935': 'v',
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
export function romanizeDevanagari(text: string): string {
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
    else out += ' '; // word boundary (spaces, punctuation, danda)
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Memoized romanization — live search re-romanizes the same titles per keystroke. */
const romanCache = new Map<string, string>();
const ROMAN_CACHE_MAX = 5000;

/**
 * Normalize any string (Latin, Devanagari, or mixed) into a comparable,
 * word-separated search key.
 *
 * Loanword/transliteration equivalences folded on both sides of every
 * comparison (so they stay symmetric): c→k, q→k ("court" ↔ "कोर्ट") and
 * v→b ("vivah" ↔ "bibaha").
 */
export function romanize(input: string): string {
  if (!input) return '';
  const cached = romanCache.get(input);
  if (cached !== undefined) return cached;

  const key = romanizeDevanagari(input)
    // Devanagari transliterations of English words often insert "य" for the
    // vowel after a consonant cluster: कन्ट्रयाक्ट → "kantraakt" (contract),
    // प्रयाक्टिस → "praaktis" (practice). Fold it on both sides.
    .replace(/([bcdfghjklmnpqrstvwxyz])aya/g, '$1a')
    .replace(/([bcdfghjklmnpqrstvwxyz])ya/g, '$1a')
    // Diphthong folding: romanized Nepali writes औ as "au" or "o"
    // ("samjhauta" ↔ "सम्झौता" / "samjhota").
    .replace(/au/g, 'o')
    .replace(/[cq]/g, 'k')
    .replace(/v/g, 'b');

  if (romanCache.size >= ROMAN_CACHE_MAX) {
    romanCache.delete(romanCache.keys().next().value as string);
  }
  romanCache.set(input, key);
  return key;
}

/** Function words that should not decide whether a result matches. */
const STOPWORDS = new Set([
  'how', 'what', 'where', 'when', 'which', 'who', 'why', 'is', 'are', 'was', 'were',
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'with', 'do',
  'does', 'did', 'can', 'i', 'my', 'me', 'about', 'from', 'by', 'please', 'find', 'search',
  'ko', 'ka', 'ki', 'le', 'lai', 'ma', 'ra', 'ho', 'hola', 'garna', 'garne', 'kasari', 'k', 'ke',
]);

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

/** Fold inflection so "contracts"/"contract", "companies"/"company" compare equal. */
function baseForm(token: string): string {
  let t = token;
  if (t.length >= 5 && t.endsWith('ies')) t = `${t.slice(0, -3)}y`;
  else if (t.length >= 4 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  // Romanized Nepali often drops the final inherent "a" (bibaha → bibah).
  if (t.length >= 4 && t.endsWith('a')) t = t.slice(0, -1);
  return t;
}

/**
 * Compare two romanized words. Returns 0 when they are not the same word.
 * `allowPrefix` lets a still-being-typed query ("adala") match a longer title
 * word ("adalati"); it is never used in the other direction.
 */
function tokenScore(a: string, b: string, allowPrefix: boolean): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const ba = baseForm(a);
  const bb = baseForm(b);
  if (ba === bb) return 0.95;

  if (allowPrefix && a.length >= 4 && b.startsWith(a)) return 0.85;

  // Typos must keep the same consonant skeleton and the same first/last
  // consonant shape — this rejects "shram" → "shyam", "kanun" → "kanu", etc.
  if (ba[0] !== bb[0] || ba[ba.length - 1] !== bb[bb.length - 1]) return 0;

  const min = Math.min(ba.length, bb.length);
  if (min < 4) return 0;

  const tol = min >= 8 ? 2 : 1;
  if (Math.abs(ba.length - bb.length) > tol + 1) return 0;
  if (levenshtein(ba, bb) > tol) return 0;

  const skeletonA = ba.replace(/[aeiou]/g, '');
  const skeletonB = bb.replace(/[aeiou]/g, '');
  if (skeletonA.length < 3 || skeletonA !== skeletonB) return 0;

  return 0.75;
}

function tokenize(key: string): string[] {
  return key.split(' ').filter(Boolean);
}

/** Join adjacent words so a spaced query matches a compounded title word. */
function joinedPairs(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const left = tokens[i];
    const right = tokens[i + 1];
    out.push(left + right);
    // Sandhi: "manaba" + "adhikara" is written "manabadhikara" in Devanagari.
    if (left.endsWith('a') && /^[aeiou]/.test(right)) {
      out.push(left.slice(0, -1) + right);
    }
  }
  return out;
}

/** Normalize for phrase matching: lowercase, punctuation → single spaces. */
function normalizePhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,;:!?'"“”‘’()\[\]{}\/\\|@#$%^&*_+=~`<>…–—-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const WORD_CHAR = '\\p{L}\\p{M}\\p{N}';

/**
 * Word-boundary phrase match (no mid-word hits like "fir" → "first").
 * This is intentionally stricter than a full fuzzy match so the search stays
 * relevant even when the query matches just a single real word in a long title.
 */
function phraseMatch(title: string, query: string): boolean {
  const titleText = normalizePhrase(title);
  const queryText = normalizePhrase(query);
  if (!titleText || !queryText) return false;
  if (titleText === queryText) return true;

  const chunks = queryText.split(/\s+/).filter(Boolean);
  if (chunks.length === 0) return false;

  // Match the whole query as a phrase, but tolerate punctuation/hyphen splits.
  const phrase = chunks.map((chunk) => chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  const regex = new RegExp(`(^|[^${WORD_CHAR}])${phrase}(?=$|[^${WORD_CHAR}])`, 'u');
  if (regex.test(titleText)) return true;

  // short single-word searches should stay word-boundary only, never mid-word.
  if (chunks.length === 1) {
    const escaped = chunks[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^${WORD_CHAR}])${escaped}(?=$|[^${WORD_CHAR}])`, 'u').test(titleText);
  }

  return false;
}

/**
 * Relevance score (0 = no match, 1 = exact phrase). Scores ≥ 0.7 are real
 * word-level matches; anything below is treated as "no match".
 */
export function searchScore(title: string, query: string): number {
  if (!title || !query) return 0;
  if (phraseMatch(title, query)) return 1;

  const queryKey = romanize(query);
  if (!queryKey) return 0;

  const titleTokens = tokenize(romanize(title));
  if (!titleTokens.length) return 0;

  const queryTokens = tokenize(queryKey).filter(
    (t) => t.length >= 2 && !STOPWORDS.has(t),
  );
  if (!queryTokens.length) return 0;

  // Compound query ("मानव अधिकार" → manabadhikar) against one title word.
  if (queryTokens.length > 1) {
    const titleJoined = joinedPairs(titleTokens);
    for (const compound of joinedPairs(queryTokens)) {
      if (compound.length < 6) continue;
      for (const tt of titleTokens) {
        if (tt.length >= 6 && (tt.startsWith(compound) || compound.startsWith(tt))) {
          return 0.85;
        }
      }
      if (titleJoined.includes(compound)) return 0.9;
    }
  }

  // Every meaningful query word must match a title word.
  const titleJoined = joinedPairs(titleTokens);
  let weakest = 1;

  for (const qt of queryTokens) {
    let best = 0;
    for (const tt of titleTokens) best = Math.max(best, tokenScore(qt, tt, true));
    if (best === 0) {
      for (const tj of titleJoined) best = Math.max(best, tokenScore(qt, tj, false));
    }
    if (best === 0) return 0;
    weakest = Math.min(weakest, best);
  }

  return 0.5 + weakest * 0.3;
}

/**
 * True when `title` genuinely matches `query` in either script. Strict by
 * design: unrelated titles never pass.
 */
export function searchMatches(title: string, query: string): boolean {
  return searchScore(title, query) >= 0.7;
}
