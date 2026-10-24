import { prisma } from '@/lib/prisma';
import { SITE_CONTACT, SITE_SOCIALS, SITE_NAME } from './site-knowledge';
import type { TeamMemberLike } from './corpus';

/**
 * Deterministic, zero-token answers for "basic info about the site".
 *
 * The RAG path is great for legal notes, but embeddings are unreliable for
 * proper nouns and exact contact details. These handlers answer the questions
 * a visitor asks most — team member profiles, contact details, what the site
 * offers, consultation, pricing, billing, navigation — directly from the
 * database and the canonical knowledge file. They run before any AI provider
 * is called, so they work even when the index is empty or quota is exhausted.
 *
 * Replies follow the language of the question (English, romanized Nepali or
 * Devanagari) and follow-up questions ("what is his email?") resolve against
 * the conversation, so a visitor can ask about a member once and then drill in.
 */

export type ReplyLang = 'en' | 'ne';

export interface SiteFactSource {
  title: string;
  url: string;
  category: string;
  lang: string;
}

export interface SiteFactAnswer {
  reply: string;
  sources: SiteFactSource[];
}

export interface SiteFactHistoryMessage {
  role: string;
  content: string;
}

export interface SiteFactOptions {
  history?: SiteFactHistoryMessage[];
}

const TEAM_TTL_MS = 60 * 1000;
let teamCache: { at: number; members: TeamMemberLike[] } | null = null;

interface SemesterLike {
  id: string;
  name: string;
  order: number;
  subjects: Array<{ name: string; order: number }>;
}

const SEMESTER_TTL_MS = 5 * 60 * 1000;
let semesterCache: { at: number; semesters: SemesterLike[] } | null = null;

/** Drop the in-process team/semester caches (useful after editing content). */
export function clearSiteFactsCache(): void {
  teamCache = null;
  semesterCache = null;
}

async function getTeam(): Promise<TeamMemberLike[]> {
  if (teamCache && Date.now() - teamCache.at < TEAM_TTL_MS) return teamCache.members;
  try {
    const members = await prisma.teamMember.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
    teamCache = { at: Date.now(), members };
    return members;
  } catch {
    return teamCache?.members ?? [];
  }
}

async function getSemesters(): Promise<SemesterLike[]> {
  if (semesterCache && Date.now() - semesterCache.at < SEMESTER_TTL_MS) {
    return semesterCache.semesters;
  }
  try {
    const semesters = await prisma.semester.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        order: true,
        subjects: { select: { name: true, order: true }, orderBy: { order: 'asc' } },
      },
    });
    semesterCache = { at: Date.now(), semesters };
    return semesters;
  } catch {
    return semesterCache?.semesters ?? [];
  }
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((t) => t.length >= 2);
}

/** Keep stored multi-line fields readable without collapsing paragraphs. */
function cleanField(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Multi-line list fields (achievements etc.) read better as "• item" lines. */
function bullets(value: string | null | undefined): string {
  const text = cleanField(value);
  if (!text) return '';
  return text
    .split(/\n|,(?=\s*[A-Z])/)
    .map((line) => line.replace(/^[-•*]\s*/, '').replace(/[,;]\s*$/, '').trim())
    .filter(Boolean)
    .map((line) => `• ${line}`)
    .join('\n');
}

function source(title: string, url: string, category: string, lang: ReplyLang = 'en'): SiteFactSource {
  return { title, url, category, lang };
}

/** Devanagari, or unmistakable romanized-Nepali words. */
export function detectReplyLang(message: string): ReplyLang {
  if (/[\u0900-\u097F]/.test(message)) return 'ne';
  if (
    /\b(malai|mero|timro|tapai|hajur|kasari|kaha|kati|garnu|garna|garne|bhaneko|bhanne|dinus|pathau|sampark|parichay|barema|bare|dhanyabad|namaskar)\b/i.test(
      message
    )
  ) {
    return 'ne';
  }
  return 'en';
}

function pick(lang: ReplyLang, en: string, ne: string): string {
  return lang === 'ne' ? ne : en;
}

/* -------------------------------------------------------------------------- */
/* Team members                                                               */
/* -------------------------------------------------------------------------- */

const LABELS = {
  en: {
    academic: 'Academic details',
    experience: 'Experience',
    achievements: 'Achievements',
    practice: 'Practice areas / interests',
    languages: 'Languages',
    email: 'Email',
    phone: 'Phone',
    socials: 'Social links',
    designation: 'Designation',
    bio: 'About',
    profile: 'Full profile',
  },
  ne: {
    academic: 'शैक्षिक विवरण',
    experience: 'अनुभव',
    achievements: 'उपलब्धिहरू',
    practice: 'अभ्यास / रुचि क्षेत्र',
    languages: 'भाषाहरू',
    email: 'इमेल',
    phone: 'फोन',
    socials: 'सामाजिक सञ्जाल',
    designation: 'पद',
    bio: 'परिचय',
    profile: 'पूरा प्रोफाइल',
  },
} as const;

function memberSocials(member: TeamMemberLike): string[] {
  return [
    member.linkedinUrl?.trim() ? `LinkedIn: ${member.linkedinUrl.trim()}` : '',
    member.facebookUrl?.trim() ? `Facebook: ${member.facebookUrl.trim()}` : '',
    member.instagramUrl?.trim() ? `Instagram: ${member.instagramUrl.trim()}` : '',
    member.websiteUrl?.trim() ? `Website: ${member.websiteUrl.trim()}` : '',
  ].filter(Boolean);
}

/** "our Head of Website" / "a Researcher at Entertain Lawyers" */
function rolePhrase(member: TeamMemberLike, lang: ReplyLang): string {
  const designation = member.designation.trim();
  if (lang === 'ne') return `${designation} हुनुहुन्छ`;

  if (/^(head|chief|director|manager|lead|founder|co-founder|editor|president|chair)/i.test(designation)) {
    return `our ${designation}`;
  }
  const article = /^[aeiou]/i.test(designation) ? 'an' : 'a';
  return `${article} ${designation} at ${SITE_NAME}`;
}

function memberIntroLine(member: TeamMemberLike, lang: ReplyLang): string {
  return pick(
    lang,
    `${member.name} is ${rolePhrase(member, lang)}.`,
    `${member.name} ${SITE_NAME} मा ${rolePhrase(member, lang)}।`
  );
}

/** Cut long prose at a sentence boundary so a bio does not become a wall of text. */
function shortenText(value: string, maxChars: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;

  const cut = text.slice(0, maxChars);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (end > 120) return cut.slice(0, end + 1).trim();

  // No usable sentence break: stop on a whole word instead of mid-word.
  return `${cut.replace(/\s+\S*$/, '').replace(/[,;:]$/, '')}…`;
}

/** True when two strings share most of their significant words (e.g. degree + campus). */
function coversSameFacts(a: string, b: string): boolean {
  const words = (value: string) =>
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2)
    );
  const left = words(a);
  const right = words(b);
  if (!left.size || !right.size) return false;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / left.size >= 0.7;
}

/**
 * The default team answer: a short, conversational introduction with the two
 * most useful facts and an offer to go deeper. The full profile is available
 * when the visitor explicitly asks for it.
 */
export function formatTeamMemberIntro(member: TeamMemberLike, lang: ReplyLang = 'en'): string {
  const L = LABELS[lang];
  const sections: string[] = [memberIntroLine(member, lang)];

  const short = cleanField(member.shortBio);
  if (short) sections.push(short);

  // If the short bio is only a tagline, add the opening of the biography so the
  // answer has some substance — but stop well before it becomes a profile dump.
  // Stored biographies are English, so a Nepali answer skips this part rather
  // than switching languages halfway through.
  const bio = cleanField(member.biography);
  const bioExcerpt =
    lang === 'en' && bio && bio !== short && short.length < 120 ? shortenText(bio, 260) : '';
  if (bioExcerpt) sections.push(bioExcerpt);

  const details: string[] = [];
  const academic = member.qualifications?.trim() ? cleanField(member.qualifications) : '';
  // Skip the academic line when the biography excerpt already says the same
  // thing (degree and campus), so the answer does not repeat itself.
  if (academic && !(bioExcerpt && coversSameFacts(academic, bioExcerpt))) {
    details.push(`${L.academic}: ${academic}`);
  }
  if (member.practiceAreas?.trim()) {
    details.push(`${L.practice}: ${cleanField(member.practiceAreas)}`);
  } else if (member.experience?.trim()) {
    details.push(`${L.experience}: ${cleanField(member.experience)}`);
  }
  if (details.length) sections.push(details.join('\n'));

  sections.push(
    pick(
      lang,
      `Full profile: /team/${member.slug}\nWant me to share the email, experience or social links?`,
      `पूरा प्रोफाइल: /team/${member.slug}\nइमेल, अनुभव वा सामाजिक लिंक चाहियो भने भन्नुहोस्।`
    )
  );

  return sections.join('\n\n');
}

/**
 * "Tell me more" after an introduction: add the useful background without
 * dumping the entire stored profile or contact details.
 */
export function formatTeamMemberMore(member: TeamMemberLike, lang: ReplyLang = 'en'): string {
  const L = LABELS[lang];
  const sections: string[] = [
    pick(lang, `A bit more on ${member.name}:`, `${member.name} बारे अलि बढी:`),
  ];

  const short = cleanField(member.shortBio);
  const bio = cleanField(member.biography);
  // The biography is the real "more": a longer read than the intro excerpt.
  // It is stored in English, so a Nepali answer does not include it.
  const bioAdded = Boolean(lang === 'en' && bio && bio !== short);
  if (bioAdded) sections.push(shortenText(bio, 520));

  const details: string[] = [];
  if (member.experience?.trim()) {
    details.push(`${L.experience}: ${cleanField(member.experience)}`);
  }
  if (member.achievements?.trim()) {
    details.push(`${L.achievements}:\n${bullets(member.achievements)}`);
  }
  if (member.practiceAreas?.trim()) {
    details.push(`${L.practice}: ${cleanField(member.practiceAreas)}`);
  }
  if (member.languages?.trim()) {
    details.push(`${L.languages}: ${cleanField(member.languages)}`);
  }
  if (details.length) {
    sections.push(details.join('\n'));
  } else if (!bioAdded) {
    // Nothing new to add: fall back to the academic background, then the tagline.
    const fallback = member.qualifications?.trim()
      ? `${L.academic}: ${cleanField(member.qualifications)}`
      : short;
    if (fallback) sections.push(fallback);
  }

  sections.push(
    pick(
      lang,
      `Full profile: /team/${member.slug}\nWant the email or social links too?`,
      `पूरा प्रोफाइल: /team/${member.slug}\nइमेल वा सामाजिक लिंक पनि चाहियो भने भन्नुहोस्।`
    )
  );

  return sections.join('\n\n');
}

/** A readable bio, not the entire profile: short bio plus a trimmed biography. */
export function formatTeamMemberBio(member: TeamMemberLike, lang: ReplyLang = 'en'): string {
  const L = LABELS[lang];
  const sections: string[] = [memberIntroLine(member, lang)];

  const short = cleanField(member.shortBio);
  if (short) sections.push(short);

  const bio = cleanField(member.biography);
  if (bio && bio !== short) sections.push(shortenText(bio, 600));

  sections.push(
    pick(
      lang,
      `${L.profile}: /team/${member.slug}\nWant me to share the email or social links?`,
      `${L.profile}: /team/${member.slug}\nइमेल वा सामाजिक लिंक चाहियो भने भन्नुहोस्।`
    )
  );

  return sections.join('\n\n');
}

/** All available details for one member, formatted for the chat bubble. */
export function formatTeamMember(member: TeamMemberLike, lang: ReplyLang = 'en'): string {
  const L = LABELS[lang];
  const sections: string[] = [];

  sections.push(`${member.name}\n${member.designation}`);

  if (member.shortBio?.trim()) sections.push(cleanField(member.shortBio));
  if (member.biography?.trim()) sections.push(cleanField(member.biography));

  const details: string[] = [];
  if (member.qualifications?.trim()) details.push(`${L.academic}: ${cleanField(member.qualifications)}`);
  if (member.experience?.trim()) details.push(`${L.experience}: ${cleanField(member.experience)}`);
  if (member.achievements?.trim()) details.push(`${L.achievements}:\n${bullets(member.achievements)}`);
  if (member.practiceAreas?.trim()) details.push(`${L.practice}: ${cleanField(member.practiceAreas)}`);
  if (member.languages?.trim()) details.push(`${L.languages}: ${cleanField(member.languages)}`);

  const contact: string[] = [];
  if (member.email?.trim()) contact.push(`${L.email}: ${member.email.trim()}`);
  if (member.phone?.trim()) contact.push(`${L.phone}: ${member.phone.trim()}`);
  contact.push(...memberSocials(member));

  if (details.length) sections.push(details.join('\n'));
  if (contact.length) sections.push(contact.join('\n'));

  sections.push(`${L.profile}: /team/${member.slug}`);

  return sections.join('\n\n');
}

type MemberField =
  | 'email'
  | 'phone'
  | 'qualification'
  | 'experience'
  | 'achievement'
  | 'practice'
  | 'languages'
  | 'social'
  | 'designation'
  | 'bio'
  | 'profile';

/** Unicode-aware boundaries so Devanagari field words match as well as English. */
function fieldPattern(words: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${words})(?![\\p{L}\\p{N}])`, 'iu');
}

const FIELD_PATTERNS: Array<[MemberField, RegExp]> = [
  ['email', fieldPattern('e-?mail|इमेल')],
  ['phone', fieldPattern('phone|mobile|contact number|फोन|मोबाइल|सम्पर्क नम्बर')],
  ['qualification', fieldPattern('qualification|academic|education|degree|study|पढाइ|शैक्षिक|योग्यता|डिग्री')],
  ['experience', fieldPattern('experience|worked|career|अनुभव|काम')],
  ['achievement', fieldPattern('achievement|award|winner|moot|उपलब्धि|पुरस्कार|विजेता')],
  ['practice', fieldPattern('practice area|interests?|speciali[sz]|expertise|अभ्यास|रुचि|विशेषज्ञता')],
  ['languages', fieldPattern('languages?|भाषा')],
  ['social', fieldPattern('linkedin|facebook|instagram|social (?:media|links?)|personal website|official website|सामाजिक|लिंक')],
  ['designation', fieldPattern('designation|position|role|post|पद')],
  ['bio', fieldPattern('bio|biography|about (?:him|her|them|the member)|जीवनी')],
  ['profile', fieldPattern('profile|full detail|everything|all detail|more about|प्रोफाइल|पूरा विवरण')],
];

function detectMemberField(message: string): MemberField | null {
  for (const [field, pattern] of FIELD_PATTERNS) {
    if (pattern.test(message)) return field;
  }
  return null;
}

function missingField(member: TeamMemberLike, field: MemberField, lang: ReplyLang): string {
  const L = LABELS[lang];
  const label = {
    email: L.email,
    phone: L.phone,
    qualification: L.academic,
    experience: L.experience,
    achievement: L.achievements,
    practice: L.practice,
    languages: L.languages,
    social: L.socials,
    designation: L.designation,
    bio: L.bio,
    profile: L.profile,
  }[field];

  return pick(
    lang,
    `${member.name} — ${member.designation}\n\n${label} is not listed on the site for ${member.name}. You can see the full profile at /team/${member.slug}, or reach the team at ${SITE_CONTACT.email}.`,
    `${member.name} — ${member.designation}\n\n${member.name} को ${label} साइटमा उल्लेख छैन। पूरा प्रोफाइल /team/${member.slug} मा हेर्नुहोस् वा ${SITE_CONTACT.email} मा सम्पर्क गर्नुहोस्।`
  );
}

/** One field only — used for follow-ups such as "what is his email?". */
export function formatTeamMemberField(
  member: TeamMemberLike,
  field: MemberField,
  lang: ReplyLang = 'en'
): string {
  const L = LABELS[lang];
  const head = `${member.name} — ${member.designation}`;

  if (field === 'profile' || field === 'bio') {
    if (field === 'profile') return formatTeamMember(member, lang);
    const about = [cleanField(member.shortBio), cleanField(member.biography)].filter(Boolean).join('\n\n');
    if (!about) return formatTeamMemberIntro(member, lang);
    return formatTeamMemberBio(member, lang);
  }

  if (field === 'email') {
    if (!member.email?.trim()) return missingField(member, field, lang);
    return `${head}\n\n${L.email}: ${member.email.trim()}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'phone') {
    if (!member.phone?.trim()) return missingField(member, field, lang);
    return `${head}\n\n${L.phone}: ${member.phone.trim()}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'social') {
    const socials = memberSocials(member);
    if (!socials.length) return missingField(member, field, lang);
    return `${head}\n\n${L.socials}:\n${socials.join('\n')}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'designation') {
    return `${head}\n\n${L.designation}: ${member.designation}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'qualification') {
    if (!member.qualifications?.trim()) return missingField(member, field, lang);
    return `${head}\n\n${L.academic}: ${cleanField(member.qualifications)}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'experience') {
    if (!member.experience?.trim()) return missingField(member, field, lang);
    return `${head}\n\n${L.experience}: ${cleanField(member.experience)}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'achievement') {
    if (!member.achievements?.trim()) return missingField(member, field, lang);
    return `${head}\n\n${L.achievements}:\n${bullets(member.achievements)}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'practice') {
    if (!member.practiceAreas?.trim()) return missingField(member, field, lang);
    return `${head}\n\n${L.practice}: ${cleanField(member.practiceAreas)}\n\n${L.profile}: /team/${member.slug}`;
  }

  if (field === 'languages') {
    if (!member.languages?.trim()) return missingField(member, field, lang);
    return `${head}\n\n${L.languages}: ${cleanField(member.languages)}\n\n${L.profile}: /team/${member.slug}`;
  }

  return formatTeamMemberIntro(member, lang);
}

/**
 * Minimal Devanagari → Latin transliteration, enough to match Nepali-script
 * names ("राम बाबु दास") against the Latin names stored in the database.
 * Conjuncts and matras are handled; the output need not be beautiful, only
 * close enough for the consonant-skeleton comparison below.
 */
const DEV_CONSONANTS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ng',
  च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
  य: 'y', र: 'r', ल: 'l', व: 'v', श: 'sh', ष: 'sh', स: 's', ह: 'h',
  ज्ञ: 'gy', त्र: 'tr', क्ष: 'ksh', श्र: 'shr',
};
const DEV_VOWELS: Record<string, string> = {
  अ: 'a', आ: 'aa', इ: 'i', ई: 'ii', उ: 'u', ऊ: 'uu', ऋ: 'ri',
  ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', अं: 'an', अः: 'ah',
};
const DEV_MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h', 'ँ': 'n',
};

export function transliterateDevanagari(input: string): string {
  const out: string[] = [];
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const pair = input.slice(i, i + 2);
    if (DEV_CONSONANTS[pair]) {
      out.push(DEV_CONSONANTS[pair]);
      i++;
      continue;
    }
    if (char === '्') continue; // virama: no inherent vowel
    if (DEV_CONSONANTS[char]) {
      out.push(DEV_CONSONANTS[char]);
      const next = input[i + 1];
      if (next === '्') {
        i++; // the virama will be skipped on the next loop
      } else if (next && DEV_MATRAS[next]) {
        out.push(DEV_MATRAS[next]);
        i++;
      } else {
        out.push('a');
      }
      continue;
    }
    if (DEV_VOWELS[char]) {
      out.push(DEV_VOWELS[char]);
      continue;
    }
    if (DEV_MATRAS[char]) {
      out.push(DEV_MATRAS[char]);
      continue;
    }
    out.push(char);
  }
  return out.join('');
}

/** Vowel-free spelling of a name, so raam/ram and daas/das compare equal. */
function nameSkeleton(value: string): string {
  return normalize(value).replace(/\s+/g, '').replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1');
}

/** Levenshtein distance, capped early — only used for short names. */
function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Find the member a question is about.
 *  - full name or profile slug anywhere in the message → that member
 *  - every word of the name present → that member
 *  - exact designation ("Head of Website") → that member
 *  - a unique name word (3+ chars) plus team intent ("who is…") → that member
 *  - a near-miss spelling ("Shusma" for "Sushma") → that member
 */
function matchTeamMember(message: string, members: TeamMemberLike[]): TeamMemberLike | null {
  // Latin input plus, for Devanagari, a transliterated copy ("राम" → "raam").
  const queries = [message];
  if (/[\u0900-\u097F]/.test(message)) queries.push(transliterateDevanagari(message));

  const teamIntent =
    /\b(who|about|tell me|profile|biography|bio|team|member|researcher|sir|madam|qualification|experience|achievement|email|phone|contact|linkedin|facebook|instagram|website|designation|role)\b|को हुन्|बारे|परिचय|प्रोफाइल/i.test(
      message
    );

  for (const query of queries) {
    const q = normalize(query);
    if (!q) continue;
    const qTokens = new Set(tokens(query));

    for (const m of members) {
      const name = normalize(m.name);
      if (name && q.includes(name)) return m;
      if (m.slug && q.includes(normalize(m.slug))) return m;
    }

    for (const m of members) {
      const nameTokens = tokens(m.name);
      if (nameTokens.length && nameTokens.every((t) => qTokens.has(t))) return m;
    }

    const designationMatches = members.filter((m) => {
      const designation = normalize(m.designation);
      return designation.length >= 5 && q.includes(designation);
    });
    if (designationMatches.length === 1) return designationMatches[0];

    if (teamIntent) {
      for (const m of members) {
        const nameTokens = tokens(m.name);
        const unique = nameTokens.filter((t) => t.length >= 3 && qTokens.has(t));
        if (!unique.length) continue;
        // Only match when that word identifies exactly one member.
        const owners = members.filter((other) => tokens(other.name).some((t) => unique.includes(t)));
        if (owners.length === 1) return m;
      }

      // Spelling tolerance for proper nouns: compare vowel-free skeletons so
      // raam/ram, daas/das and shusma/sushma all match.
      for (const m of members) {
        for (const nameToken of tokens(m.name)) {
          if (nameToken.length < 4) continue;
          const target = nameSkeleton(nameToken);
          if (target.length < 2) continue;
          const near = [...qTokens].some((qt) => {
            if (qt.length < 4) return false;
            // A name never loses its first sound in transliteration. Without
            // this, "amrit" would match "smriti" and answer about the wrong person.
            if (qt[0] !== nameToken[0]) return false;
            const candidate = nameSkeleton(qt);
            return candidate.length >= 2 && editDistance(candidate, target, 1) <= 1;
          });
          if (!near) continue;
          const owners = members.filter((other) =>
            tokens(other.name).some((t) => {
              if (t.length < 4) return false;
              const sk = nameSkeleton(t);
              return sk.length >= 2 && editDistance(sk, target, 1) <= 1;
            })
          );
          if (owners.length === 1) return m;
        }
      }
    }
  }

  return null;
}

/**
 * A "did you mean" candidate for a name that is not on the team. Kept separate
 * from `matchTeamMember`: a suggestion must never be presented as the person
 * the visitor asked about.
 */
function closestMember(name: string, members: TeamMemberLike[]): TeamMemberLike | null {
  const qTokens = tokens(name);
  if (!qTokens.length) return null;

  let best: { member: TeamMemberLike; distance: number } | null = null;

  for (const member of members) {
    for (const nameToken of tokens(member.name)) {
      if (nameToken.length < 4) continue;
      const target = nameSkeleton(nameToken);
      if (target.length < 3) continue;
      for (const qt of qTokens) {
        if (qt.length < 4) continue;
        const candidate = nameSkeleton(qt);
        if (candidate.length < 3) continue;
        const distance = editDistance(candidate, target, 2);
        if (distance > 1) continue;
        if (!best || distance < best.distance) best = { member, distance };
      }
    }
  }

  return best?.member ?? null;
}

const PERSON_QUESTION_EN =
  /^(?:who\s+is|who's|who\s+was|tell\s+me\s+about|tell\s+about|do\s+you\s+know)\s+(.+?)[?.!]*$/i;
const PERSON_QUESTION_NE = /^(.+?)\s+(?:को\s+हुन्|को\s+हो|बारे\s+(?:भन्नुहोस्|बताउनुहोस्))[?.!]*$/;
const PERSON_QUESTION_ROMAN = /^(.+?)\s+ko\s+(?:hun|ho|bare)\b/i;

const NON_NAME_WORDS =
  /^(?:the|a|an|this|that|these|those|our|your|my|his|her|their|its|it|he|she|they|him|them|there|on|in|at|from|with|about|someone|anyone|anybody|somebody|everyone|team|staff|member|members|people|founder|owner|head|chief|manager|director|researcher|researchers|lawyer|lawyers|advocate|assistant|bot|site|website|prime|president|minister|king|queen)\b/i;

/** Pull the person's name out of "who is …?" / "… को हुन्?" / "… ko hun?". */
function extractPersonName(message: string): string | null {
  const text = message.trim();
  const match =
    text.match(PERSON_QUESTION_EN) ?? text.match(PERSON_QUESTION_NE) ?? text.match(PERSON_QUESTION_ROMAN);
  if (!match) return null;

  const name = match[1].trim().replace(/[?.!]+$/, '').trim();
  if (name.length < 2 || name.length > 60) return null;
  if (NON_NAME_WORDS.test(name)) return null;
  if (/[0-9]/.test(name)) return null;
  // The site/assistant itself is not a team member.
  if (/kanun|saathi|entertain|assistant|chatbot|\bsite\b|\bai\b/i.test(name)) return null;
  // One to three name-like words; anything else is a sentence, not a person.
  // Combining marks (\p{M}) are part of Devanagari letters such as "मृ".
  if (!/^[\p{L}][\p{L}\p{M}.'-]*(?:\s+[\p{L}][\p{L}\p{M}.'-]*){0,2}$/u.test(name)) return null;

  return name;
}

/**
 * "Who is Amrit?" when Amrit is not on the team: say so plainly, and only then
 * mention a close spelling as a clearly-labelled *different* person.
 */
function memberNotFoundAnswer(
  name: string,
  members: TeamMemberLike[],
  lang: ReplyLang
): SiteFactAnswer {
  // Show "amrit" as "Amrit" in the reply without changing what was searched.
  const shown = name === name.toLowerCase() ? name.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : name;
  const suggestion = closestMember(name, members);
  const teamSource = source('Our Team', '/team', 'site-team', lang);

  const sources = suggestion
    ? [source(suggestion.name, `/team/${suggestion.slug}`, 'team', lang), teamSource]
    : [teamSource];

  if (lang === 'ne') {
    return {
      reply: suggestion
        ? `"${shown}" Entertain Lawyers टिममा भेटिएन।\n\nनजिकको नाम: ${suggestion.name} (${suggestion.designation}) — फरक व्यक्ति। प्रोफाइल: /team/${suggestion.slug}\n\nसबै सदस्य /team मा हेर्न सक्नुहुन्छ।`
        : `"${shown}" Entertain Lawyers टिममा भेटिएन।\n\nहाल प्रकाशित सबै सदस्य /team मा छन्। नामको हिज्जे जाँच्नुहोस् वा पूरा नाम लेख्नुहोस्।`,
      sources,
    };
  }

  return {
    reply: suggestion
      ? `I couldn't find "${shown}" on the Entertain Lawyers team.\n\nClosest name on the team: ${suggestion.name} (${suggestion.designation}) — a different person. Profile: /team/${suggestion.slug}\n\nSee everyone at /team.`
      : `I couldn't find "${shown}" on the Entertain Lawyers team.\n\nEveryone currently published is listed at /team. If the name is spelled differently, try the full name.`,
    sources,
  };
}

/** The most recent member discussed in the conversation, if any. */
function findMemberInHistory(
  history: SiteFactHistoryMessage[],
  members: TeamMemberLike[]
): TeamMemberLike | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const content = history[i]?.content;
    if (!content) continue;
    const member = matchTeamMember(content, members);
    if (member) return member;
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * "Who are the researchers?" should list that designation, not the whole team.
 * Only exact stored designations are grouped, so a generic "who is on the team?"
 * still returns everyone.
 */
function membersByDesignation(
  message: string,
  members: TeamMemberLike[]
): { designation: string; members: TeamMemberLike[] } | null {
  const q = normalize(message);
  if (!q) return null;

  const designations = [
    ...new Set(members.map((m) => normalize(m.designation)).filter((d) => d.length >= 5)),
  ];

  for (const designation of designations) {
    const singular = designation.endsWith('s') ? designation.slice(0, -1) : designation;
    if (!new RegExp(`\\b${escapeRegExp(singular)}s?\\b`, 'i').test(q)) continue;
    const matched = members.filter((m) => normalize(m.designation) === designation);
    if (matched.length && matched.length < members.length) {
      return { designation: matched[0].designation, members: matched };
    }
  }

  // The stored designation is English ("Researcher"), but visitors also ask in
  // Nepali. Map the common role words before giving up on the roster.
  const aliases: Array<{ question: RegExp; designation: RegExp }> = [
    { question: /अनुसन्धानकर्ता|अनुसन्धानकर्ताहरू|researchers?/i, designation: /researcher/i },
    { question: /वेबसाइट प्रमुख|वेबसाइट हेड|head of website/i, designation: /head of website/i },
  ];
  for (const alias of aliases) {
    if (!alias.question.test(message)) continue;
    const matched = members.filter((m) => alias.designation.test(m.designation));
    if (matched.length && matched.length < members.length) {
      return { designation: matched[0].designation, members: matched };
    }
  }
  return null;
}

const SEMESTER_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  पहिलो: 1,
  दोस्रो: 2,
  तेस्रो: 3,
  चौथो: 4,
  पाँचौं: 5,
  छैटौं: 6,
  सातौं: 7,
  आठौं: 8,
  नवौं: 9,
  दशौं: 10,
};

/** Normalization that keeps Devanagari vowel signs (needed to read "सेमेस्टर"). */
function normalizeWithMarks(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse "1st semester", "semester 3", "पहिलो सेमेस्टर" into a number. */
function parseSemesterNumber(message: string): number | null {
  const devanagari = '०१२३४५६७८९';
  const text = normalizeWithMarks(message).replace(/[०-९]/g, (d) => String(devanagari.indexOf(d)));

  let match = text.match(/(?:semester|sem|सेमेस्टर)\s*(\d{1,2})/);
  if (match) return Number(match[1]);

  match = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:semester|sem|सेमेस्टर)/);
  if (match) return Number(match[1]);

  for (const [word, number] of Object.entries(SEMESTER_WORDS)) {
    if (new RegExp(`${word}\\s*(?:semester|sem|सेमेस्टर)`).test(text)) {
      return number;
    }
  }
  return null;
}

/**
 * Stored subject lists contain a few singular/plural pairs ("Legal Method" and
 * "Legal Methods"). They are the same subject; show it once.
 */
function dedupeSubjectNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const key = normalize(name).replace(/s$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

const FOLLOW_UP_REFERENCE =
  /\b(his|her|their|him|hers|theirs|he|she|they|that (?:member|person|researcher)|same (?:member|person)|more|further|elaborate|details?)\b|उहाँ|उनको|उसको|तिनको|थप|विस्तार|अझै|अझ|अरु/i;

const MORE_DETAIL =
  /\b(more|further|elaborate|details?|everything|full|continue|tell me more)\b|थप|विस्तार|पूरा|अझै|अझ|अरु/i;

/* -------------------------------------------------------------------------- */
/* Intent patterns                                                            */
/* -------------------------------------------------------------------------- */

const THANKS_INTENT = /^(?:thanks|thank you|thankyou|dhanyabad)\b|^धन्यवाद/i;

const CONTACT_INTENT =
  /\b(contact (?:you|us|entertain)|contact (?:details|info|information)|your (?:phone|mobile|email|e-mail|address|office|location|contact|whatsapp)|phone (?:number|no\.?)?|whatsapp|e-mail (?:address|us)|office (?:address|hours|location)|where (?:are you|is your office|is the office)|directions|google maps?|reach you|call you)\b|सम्पर्क|फोन|ठेगाना|इमेल|कार्यालय समय|अफिस/i;

const ABOUT_INTENT =
  /\b(about (?:the )?(?:site|website|platform|entertain lawyers)|what is entertain lawyers|what is this (?:site|website)|who (?:are|is) entertain lawyers|what does (?:this|the) (?:site|website|platform) do|who (?:owns|founded|founder|started|made|runs?)|who (?:is|are) (?:the )?(?:founder|owner)|your (?:mission|vision))\b|साइट के हो|यो साइट|वेबसाइट बारेमा|संस्था बारेमा|संस्थापक|मालिक|लक्ष्य|मिसन/i;

const ASSISTANT_INTENT =
  /\b(kanun saathi|कानुन साथी|ai assistant|chatbot|who are you|what are you|what can you do|how can you help|what do you do|your (?:name|capabilities))\b|तिमी को|तपाईं को|तिमी के गर्न सक्छ|तपाईं के गर्न सक्छ/i;

const SERVICE_INTENT =
  /\b(consult(?:ation)?|book (?:a |an )?(?:appointment|consultation)|hire (?:a |an )?(?:lawyer|advocate)|services?|practice areas?|legal (?:help|advice|assistance)|represent me)\b|परामर्श|सेवा|वकिल/i;

const PRICING_INTENT =
  /\b(subscription|pricing|premium (?:access|content|membership)|payments?|esewa|khalti|payment methods?|plan (?:price|cost)|how much (?:does|is|to) (?:a )?(?:subscription|premium|plan|site)|how much (?:is|does) .*(?:subscription|premium)|price of|how (?:do|can) i pay|pay (?:for|with|using)|checkout|purchase|buy (?:a |an )?(?:plan|subscription|premium|notes?|resource))\b|मूल्य|शुल्क|सदस्यता|तिर्न|भुक्तानी/i;

const FREE_INTENT =
  /\b(is (?:it|this|the site|the platform) free|free (?:of cost|to use|access)|do i (?:have to|need to) pay|any free (?:notes|resources|content)|which (?:notes|resources) (?:are|is) free|what is free|cost of (?:notes|resources))\b|निःशुल्क|फ्री छ|पैसा लाग्छ/i;

const DOWNLOAD_INTENT =
  /\b(download|offline|save (?:the )?pdf|print (?:the )?(?:pdf|notes)|pdf copy|take screenshot)\b|डाउनलोड|अफलाइन/i;

const BILLING_INTENT =
  /\b(refunds?|money back|cancel (?:my )?(?:subscriptions?|plans?)|payments? (?:failed|deducted)|charged (?:twice|again)|double (?:payment|charge)|billing (?:issue|problem|help)|transactions? (?:failed|id)|paid but)\b|रिफन्ड|पैसा कट|भुक्तानी असफल|बिल/i;

const ACCOUNT_INTENT =
  /\b(log ?in|sign ?in|create (?:an )?account|register (?:an? )?account|reset (?:my )?password|forgot (?:my )?password|my (?:account|profile|dashboard)|account (?:login|access|help)|profile page|dashboard|verify (?:my )?email)\b|लगइन|पासवर्ड|खाता|प्रोफाइल|ड्यासबोर्ड/i;

const SEARCH_INTENT =
  /\b(how (?:do|can) i (?:search|find)|search (?:bar|function|the site|box)|site search|find (?:notes|resources) (?:by|using)|keyword)\b|खोज|सर्च/i;

const NEWS_INTENT =
  /\b(?:latest|recent|legal|nepali|today'?s?)\s+(?:news|updates?)\b|\b(?:news|updates?)\s+(?:section|page|today)\b|\bwhere (?:can|do) i (?:find|read) (?:the )?(?:news|updates)\b|\b(?:any|have|got|show) (?:me )?(?:the )?(?:news|updates)\b|\bwhat'?s new\b|^news\??$|समाचार|ताजा अपडेट|नयाँ समाचार/i;

const NAVIGATION_INTENT =
  /\b(what (?:can|do) (?:i|you) (?:find|do|offer)|features|sections?|navigation|navigate|what pages|where (?:can|do) i find|how do i find|what is on (?:this|the) (?:site|website)|site ?map)\b|कहाँ भेटिन्छ|पृष्ठ|नेभिगेसन/i;

const STUDY_INTENT =
  /\b(study materials?|law notes?|notes?|syllabus|semesters?|subjects?|old questions?|past (?:papers?|questions?)|case laws?|study library|units?)\b|नोट्स|नजिर|ऐन|पुरानो प्रश्न|सेमेस्टर|विषय|अध्ययन/i;

const STUDY_QUESTION =
  /\b(where|how|find|access|download|browse|available|library|site|website|what)\b|कहाँ|कसरी|के छ|भेटिन्छ/i;

const CALCULATOR_INTENT =
  /\b(court fee|अदालती दस्तुर|कोर्ट फी)\b/i;

const CONTRIBUTE_INTENT =
  /\b(contribute|write for (?:you|us)|submit (?:an )?(?:article|post|note)|join (?:your|the) team|work with (?:you|us)|internship|vacancy|career|apply|collaborat)\b|योगदान|टिममा काम|सहकार्य|जागिर/i;

const REPORT_INTENT =
  /\b(report (?:a |an )?(?:error|mistake|problem|broken)|wrong (?:answer|information|note)|typo|broken link|content (?:error|mistake)|suggest (?:a )?(?:topic|correction)|feedback)\b|गल्ती भेट|त्रुटि|रिपोर्ट|सुझाव/i;

const PRIVACY_INTENT =
  /\b(delete (?:my )?(?:account|data)|privacy|data protection|protect (?:my )?data|data (?:safe|secure)|personal data|unsubscribe|close my account)\b|गोपनीयता|डेटा मेट|खाता मेट/i;

const LANGUAGE_INTENT =
  /\b(which languages?|what languages?|reply in nepali|answer in nepali|speak nepali|nepali ma|devanagari|romanized|language support)\b|नेपालीमा|देवनागरी|भाषा/i;

const DISCLAIMER_INTENT =
  /\b(is this legal advice|are you (?:a )?lawyer|can you (?:represent|sue|file)|legal advice\?|can i rely|is the calculator (?:exact|accurate)|advocate[- ]client)\b|कानुनी सल्लाह|वकिल हौ/i;

/* -------------------------------------------------------------------------- */
/* Answers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One-line-per-member roster for the AI prompt. Keeps the model from inventing
 * a team member when a name is not in the database.
 */
export async function teamFactLines(): Promise<string> {
  const members = await getTeam();
  if (!members.length) return '';
  return members
    .map((m) => `• ${m.name} — ${m.designation} (/team/${m.slug})`)
    .join('\n');
}

const NEPALI_DESIGNATIONS: Record<string, string> = {
  researcher: 'अनुसन्धानकर्ता',
  'head of website': 'वेबसाइट प्रमुख',
};

function teamRoster(members: TeamMemberLike[], lang: ReplyLang, designation?: string): string {
  const lines = members.map((m) => `• ${m.name} — ${m.designation} (/team/${m.slug})`);
  const localized = designation ? NEPALI_DESIGNATIONS[normalize(designation)] ?? designation : '';
  const heading = designation
    ? pick(
        lang,
        `${SITE_NAME} — ${designation} (${members.length}):`,
        `${SITE_NAME} — ${localized} (${members.length} जना):`
      )
    : pick(lang, `${SITE_NAME} team (${members.length} members):`, `${SITE_NAME} टिम (${members.length} जना):`);
  return [
    heading,
    ...lines,
    '',
    pick(
      lang,
      "Ask me any member's name for their full profile — bio, qualifications, experience, achievements, practice areas and contact links.",
      'कुनै सदस्यको नाम सोध्नुहोस् — उहाँको परिचय, योग्यता, अनुभव, उपलब्धि, अभ्यास क्षेत्र र सम्पर्क लिंक दिन्छु।'
    ),
  ].join('\n');
}

function thanksAnswer(lang: ReplyLang): SiteFactAnswer {
  return {
    reply: pick(
      lang,
      'You’re welcome, विद्वान् ज्यू. If you need anything else — a note, a case law, a team profile or our contact details — just ask.',
      'धन्यवाद, विद्वान् ज्यू! अरू केही चाहिए — नोट्स, नजिर, टिमको प्रोफाइल वा सम्पर्क विवरण — सोध्नुहोस्।'
    ),
    sources: [],
  };
}

function contactAnswer(lang: ReplyLang): SiteFactAnswer {
  const socials = SITE_SOCIALS.map((s) => `${s.label}: ${s.url}`).join('\n');
  const reply =
    lang === 'ne'
      ? [
          `${SITE_NAME} सम्पर्क गर्ने तरिका:`,
          '',
          `फोन: ${SITE_CONTACT.phone}`,
          `व्हाट्सएप: ${SITE_CONTACT.phone} (${SITE_CONTACT.whatsapp})`,
          `इमेल: ${SITE_CONTACT.email}`,
          `ठेगाना: ${SITE_CONTACT.address}`,
          `कानुन चेम्बर: ${SITE_CONTACT.chambers}`,
          `कार्यालय समय: ${SITE_CONTACT.hours}`,
          '',
          'सामाजिक सञ्जाल:',
          socials,
          '',
          'कानुनी विषयका लागि /consultation मा परामर्श बुक गर्नुहोस्, वा माथिको फोन/इमेलमा सम्पर्क गर्नुहोस्।',
        ].join('\n')
      : [
          `Here is how to reach ${SITE_NAME}:`,
          '',
          `Phone: ${SITE_CONTACT.phone}`,
          `WhatsApp: ${SITE_CONTACT.phone} (${SITE_CONTACT.whatsapp})`,
          `Email: ${SITE_CONTACT.email}`,
          `Address: ${SITE_CONTACT.address}`,
          `Law chambers: ${SITE_CONTACT.chambers}`,
          `Office hours: ${SITE_CONTACT.hours}`,
          '',
          'Social media:',
          socials,
          '',
          'For a legal matter, you can also book a consultation online at /consultation.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Contact Us', '/contact', 'site-contact', lang),
      source('Book a Consultation', '/consultation', 'site-service', lang),
    ],
  };
}

function assistantAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'म कानुन साथी (Kanun Saathi) हुँ — Entertain Lawyers को एआई सहायक।',
          '',
          'म यी विषयमा सहयोग गर्न सक्छु:',
          '• साइटका कानुन नोट्स, नजिर, ऐन र पुराना प्रश्न',
          '• हाम्रो टिम र सदस्यहरूको पूरा प्रोफाइल',
          '• सम्पर्क विवरण, कार्यालय समय र परामर्श बुकिङ',
          '• अध्ययन सामग्री, मूल्य/सदस्यता र साइट नेभिगेसन',
          '',
          'म साइटकै सामग्रीबाट उत्तर दिन्छु र सम्बन्धित पृष्ठको लिंक दिन्छु। म शिक्षण सहायक हुँ, वकिल होइन — वास्तविक मुद्दाका लागि /consultation मा परामर्श लिनुहोस्।',
        ].join('\n')
      : [
          'I’m Kanun Saathi (कानुन साथी), the AI assistant of Entertain Lawyers.',
          '',
          'I can help with:',
          '• Law notes, case laws, acts and old questions from the site',
          '• Our team members and their full profiles',
          '• Contact details, office hours and consultation booking',
          '• Study library navigation, pricing and premium access',
          '',
          'I answer from the site’s own content and always link the matching pages. I’m an education assistant, not a lawyer — for advice on a real case, book a consultation at /consultation.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Kanun Saathi', '/', 'site-assistant', lang),
      source('Book a Consultation', '/consultation', 'site-service', lang),
    ],
  };
}

function aboutAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          `${SITE_NAME} (entertainlawyers.com) पोखरा, कास्कीमा आधारित नेपाली कानुनी शिक्षा प्लेटफर्म र कानुन चेम्बर हो।`,
          '',
          'हामी के गर्छौं:',
          '• BA.LLB र LLB विद्यार्थीका लागि कानुन नोट्स, नजिर र पुराना प्रश्न — सेमेस्टर, विषय र एकाइअनुसार व्यवस्थित।',
          '• कानुनी समाचार, ब्लग, ऐतिहासिक तथ्य, कानुनी व्यक्तित्व र प्रकाशन।',
          '• निःशुल्क अदालती दस्तुर क्याल्कुलेटर र साइटव्यापी खोज।',
          '• वकिलहरूसँग व्यक्तिगत वा अनलाइन कानुनी परामर्श।',
          '',
          'लक्ष्य: नेपालभरका कानुन विद्यार्थीका लागि गुणस्तरीय कानुनी शिक्षा सुलभ बनाउनु।',
          'टिम पोखराबाट सञ्चालन हुन्छ। थप हेर्नुहोस्: /explore र /team।',
        ].join('\n')
      : [
          `${SITE_NAME} (entertainlawyers.com) is a Nepali legal-education platform and law chambers based in Pokhara, Kaski.`,
          '',
          'What we do:',
          '• Comprehensive study materials for BA.LLB and LLB students — law notes, case laws and old questions, organised by semester, subject and unit.',
          '• Legal news, blogs, historical facts, legal personalities and publications.',
          '• A free Nepal court fee calculator and site-wide search.',
          '• Professional legal consultation with our advocates, in person or online.',
          '',
          'Mission: make quality legal education accessible to law students across Nepal.',
          'Founded and run by the Entertain Lawyers team in Pokhara.',
          '',
          'You can explore everything at /explore or meet the team at /team.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('About Us', '/about', 'site-about', lang),
      source('Explore the Site', '/explore', 'site-navigation', lang),
    ],
  };
}

function serviceAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          `${SITE_NAME} का वकिलहरूसँग पोखरास्थित चेम्बरमा वा अनलाइन कानुनी परामर्श उपलब्ध छ।`,
          '',
          'समेटिने विषय:',
          '• दिवानी कानुन',
          '• फौजदारी कानुन',
          '• कम्पनी / कर्पोरेट कानुन',
          '• बौद्धिक सम्पत्ति (IP) कानुन',
          '• पारिवारिक कानुन',
          '',
          'बुक गर्न /consultation को फारम भर्नुहोस् (नाम, सम्पर्क, विषय र विवरण)। हरेक अनुरोध पूर्ण गोप्य राखिन्छ।',
          '',
          `फोन/व्हाट्सएप ${SITE_CONTACT.phone} वा इमेल ${SITE_CONTACT.email}।`,
          `कार्यालय समय: ${SITE_CONTACT.hours}।`,
        ].join('\n')
      : [
          `${SITE_NAME} offers professional legal consultation with its advocates — in person at the Pokhara chambers or online.`,
          '',
          'Matters covered:',
          '• Civil Law',
          '• Criminal Law',
          '• Corporate Law',
          '• Intellectual Property (IP) Law',
          '• Family Law',
          '',
          'To book, use the form at /consultation (name, contact, practice area, subject and description). Every request is kept strictly confidential.',
          '',
          `You can also call or WhatsApp ${SITE_CONTACT.phone} or email ${SITE_CONTACT.email}.`,
          `Office hours: ${SITE_CONTACT.hours}.`,
        ].join('\n');

  return {
    reply,
    sources: [
      source('Book a Consultation', '/consultation', 'site-service', lang),
      source('Contact Us', '/contact', 'site-contact', lang),
    ],
  };
}

async function pricingAnswer(lang: ReplyLang): Promise<SiteFactAnswer> {
  let planLines: string[] = [];
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceAmount: 'asc' },
    });
    planLines = plans.map((p) =>
      lang === 'ne'
        ? `• ${p.name}: NPR ${(p.priceAmount / 100).toFixed(0)} — ${p.durationDays} दिन`
        : `• ${p.name}: NPR ${(p.priceAmount / 100).toFixed(0)} for ${p.durationDays} days`
    );
  } catch {
    // A plan query failure must not block the answer.
  }

  const reply =
    lang === 'ne'
      ? [
          `${SITE_NAME} मा प्रिमियम सामग्री दुई तरिकाले खोल्न सकिन्छ:`,
          '• एउटा प्रिमियम स्रोत एकपटक किनेर, वा',
          '• योजना (plan) को सदस्यता लिएर अवधिभर सबै प्रिमियम स्रोत खोलेर।',
          '',
          ...(planLines.length ? ['हालका योजनाहरू:', ...planLines, ''] : ['हालका योजना र मूल्य /pricing मा हेर्नुहोस्।', '']),
          'योजना हेर्न र खरिद गर्न: /pricing',
          'सदस्यता एकपटक मात्र लिइन्छ (दोहोरिँदैन) — लुकेको शुल्क छैन। भुक्तानी eSewa र Khalti बाट हुन्छ, र सफल भुक्तानीपछि पहुँच स्वतः तपाईंको खातामा जोडिन्छ।',
          'प्रिमियम PDF सुरक्षित अनलाइन रिडरमा खुल्छ, त्यसैले इन्टरनेट चाहिन्छ र डाउनलोड गर्न मिल्दैन।',
          '',
          `बिलिङ सहयोग: ${SITE_CONTACT.email} वा ${SITE_CONTACT.phone}।`,
        ].join('\n')
      : [
          `Premium access at ${SITE_NAME} works in two ways:`,
          '• Buy an individual premium resource once, or',
          '• Subscribe to a plan that unlocks all premium resources for its duration.',
          '',
          ...(planLines.length ? ['Current plans:', ...planLines, ''] : ['See the current plans and prices at /pricing.', '']),
          'View plans and checkout: /pricing',
          'Subscriptions are one-time (non-recurring) — no hidden fees. Payments are handled through eSewa and Khalti, and access is added to your account automatically after a successful payment.',
          'Premium PDFs open in a secure online reader, so they need an internet connection and cannot be downloaded.',
          '',
          `For billing help: ${SITE_CONTACT.email} or ${SITE_CONTACT.phone}.`,
        ].join('\n');

  return {
    reply,
    sources: [
      source('Pricing & Plans', '/pricing', 'site-pricing', lang),
      source('Contact Us', '/contact', 'site-contact', lang),
    ],
  };
}

function freeAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'सबै सामग्री निःशुल्क होइन — तर धेरै निःशुल्क छ।',
          '',
          'निःशुल्क: खोज, अदालती दस्तुर क्याल्कुलेटर, समाचार, ब्लग, ऐतिहासिक तथ्य, प्रकाशन, कार्यक्रम, टिम पृष्ठ, र धेरै कानुन नोट्स/नजिर/पुराना प्रश्न।',
          'प्रिमियम: केही अध्ययन स्रोत एकपटक खरिद वा सदस्यताबाट खुल्छन् (/pricing हेर्नुहोस्)। प्रिमियम PDF सुरक्षित रिडरमा खुल्छ र डाउनलोड गर्न मिल्दैन।',
          '',
          'निःशुल्क सामग्री हेर्न खाता चाहिँदैन; खरिद, सदस्यता र /dashboard का लागि खाता चाहिन्छ।',
        ].join('\n')
      : [
          'Not everything is free — but a lot is.',
          '',
          'Free: search, the court fee calculator, news, blogs, historical facts, publications, events, team pages, and many law notes, case laws and old questions.',
          'Premium: some study resources unlock with a one-time purchase or a subscription (see /pricing). Premium PDFs open in the secure reader and cannot be downloaded.',
          '',
          'You can browse free material without an account; an account is needed for purchases, subscriptions and /dashboard.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Pricing & Plans', '/pricing', 'site-pricing', lang),
      source('Study Materials', '/study', 'site-study', lang),
    ],
  };
}

function downloadAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'प्रिमियम PDF डाउनलोड गर्न मिल्दैन। ती /read/[resourceId] को सुरक्षित अनलाइन रिडरमा खुल्छन्, जसका लागि इन्टरनेट चाहिन्छ र लेखकको काम सुरक्षित रहन्छ। निःशुल्क पृष्ठ ब्राउजरमै पढ्न सकिन्छ।',
          '',
          'रिडरमा "Access Denied" देखिए स्रोत प्रिमियम छ र खातामा त्यसको खरिद वा सदस्यता छैन। /pricing बाट किन्नुहोस् वा सदस्यता लिनुहोस्, त्यसपछि लिंक फेरि खोल्नुहोस्।',
          '',
          `लोड नभए पृष्ठ रिफ्रेस गर्नुहोस्, साइन आउट/इन गर्नुहोस्, वा स्रोतको लिंकसहित ${SITE_CONTACT.email} मा लेख्नुहोस्।`,
        ].join('\n')
      : [
          'Premium PDFs cannot be downloaded. They open in the secure online reader at /read/[resourceId], which needs an internet connection and protects the authors’ work. Free pages can be read in the browser.',
          '',
          'If the reader says "Access Denied", the resource is premium and your account has no purchase or subscription covering it. Buy it or subscribe at /pricing, then reopen the link.',
          '',
          `If a document will not load, refresh the page, sign out and back in, or email ${SITE_CONTACT.email} with the resource link.`,
        ].join('\n');

  return {
    reply,
    sources: [
      source('Secure Reader', '/resources', 'site-pricing', lang),
      source('Pricing & Plans', '/pricing', 'site-pricing', lang),
    ],
  };
}

function billingAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'भुक्तानी eSewa र Khalti बाट हुन्छ। सदस्यता एकपटक मात्र लिइन्छ — सूचीबद्ध मूल्य नै अन्तिम मूल्य हो, लुकेको शुल्क छैन।',
          '',
          'सफल भुक्तानीपछि पहुँच स्वतः खातामा जोडिन्छ। भुक्तानी असफल भए /payment/failure मा पुगिन्छ र पहुँच दिइँदैन; /pricing बाट फेरि प्रयास गर्न सकिन्छ।',
          '',
          'पैसा कटेर पनि पहुँच नआए, वा दुईपटक शुल्क लागे, भने खाताको इमेल, transaction ID, रकम, मिति र भुक्तानी गेटवेसहित इमेल वा फोन गर्नुहोस्:',
          `${SITE_CONTACT.email} | ${SITE_CONTACT.phone}`,
          '',
          'रिफन्ड/रद्द अनुरोध टिमले /terms को सर्तअनुसार व्यक्तिगत रूपमा समीक्षा गर्छ — निष्कर्ष मान्नुअघि टिमसँग सम्पर्क गर्नुहोस्।',
        ].join('\n')
      : [
          'Payments are handled through eSewa and Khalti. Subscriptions are one-time (non-recurring) — the listed price is the final price, with no hidden fees.',
          '',
          'After a successful payment, access is added to your account automatically. If a payment fails, you land on /payment/failure and no access is granted; you can retry from /pricing.',
          '',
          'If money was deducted but access did not appear, or you were charged twice, contact us with your account email, transaction ID, amount, date and gateway:',
          `${SITE_CONTACT.email} | ${SITE_CONTACT.phone}`,
          '',
          'Refund and cancellation requests are reviewed by the team case by case under the Terms at /terms — please contact us before assuming an outcome.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Pricing & Plans', '/pricing', 'site-pricing', lang),
      source('Contact Us', '/contact', 'site-contact', lang),
    ],
  };
}

function accountAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'खाता र पहुँच:',
          '',
          '• /login बाट साइन इन वा दर्ता गर्नुहोस् (इमेल/पासवर्ड वा Google)।',
          '• पासवर्ड बिर्सनुभयो? /forgot-password बाट रिसेट गर्नुहोस्।',
          '• /profile मा व्यक्तिगत विवरण र सुरक्षा सेटिङ व्यवस्थापन गर्नुहोस्।',
          '• /dashboard मा खरिद, सदस्यता र पहुँच देखिन्छ।',
          '• खरिद वा सदस्यता गरेपछि प्रिमियम स्रोत /read/[resourceId] को सुरक्षित रिडरमा खुल्छ।',
          '',
          '"Access Denied" भन्नुको अर्थ स्रोत प्रिमियम छ र खातामा त्यसको सक्रिय खरिद/सदस्यता छैन।',
          `खाता सहयोग: ${SITE_CONTACT.email}।`,
        ].join('\n')
      : [
          'Accounts and access:',
          '',
          '• Sign in or register at /login (email/password or Google).',
          '• Forgot your password? Use /forgot-password to reset it.',
          '• /profile manages your personal details and security settings.',
          '• /dashboard shows your purchases, subscriptions and entitlements.',
          '• After buying or subscribing, premium resources open in the secure reader at /read/[resourceId].',
          '',
          '"Access Denied" means the resource is premium and your account has no active purchase or subscription for it.',
          `For account help: ${SITE_CONTACT.email}.`,
        ].join('\n');

  return {
    reply,
    sources: [
      source('Sign In', '/login', 'site-account', lang),
      source('Pricing & Plans', '/pricing', 'site-pricing', lang),
    ],
  };
}

function searchAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'साइटमा सामग्री खोज्ने तीन तरिका:',
          '• हेडरको खोज बार वा /search — नोट्स, नजिर, पुराना प्रश्न, समाचार, ब्लग, तथ्य, प्रकाशन, कार्यक्रम र टिम सबै खोज्छ।',
          '• /semesters — सेमेस्टर → विषय → एकाइ।',
          '• /study — सेमेस्टर, विषय, एकाइ र प्रकारअनुसार फिल्टर।',
          '',
          'छोटो शब्द प्रयोग गर्नुहोस् (विषयको नाम, धारा नम्बर, मुद्दाको नाम)। अंग्रेजी र नेपाली दुवैमा खोज्न सकिन्छ।',
          `केही भेटिएन भने ${SITE_CONTACT.email} मा लेख्नुहोस् — केही सामग्री अझै प्रकाशित नभएको हुन सक्छ।`,
        ].join('\n')
      : [
          'Three ways to find material on the site:',
          '• The header search bar or /search — searches notes, case laws, old questions, news, blogs, facts, publications, events and the team.',
          '• /semesters — semester → subject → unit.',
          '• /study — filters by semester, subject, unit and type.',
          '',
          'Use short keywords (subject name, section number, case name). Search works in English and Nepali.',
          `If something is missing, email ${SITE_CONTACT.email} — some material may not be published yet.`,
        ].join('\n');

  return {
    reply,
    sources: [
      source('Search', '/search', 'site-navigation', lang),
      source('Study Materials', '/study', 'site-study', lang),
    ],
  };
}

function newsAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'साइटका समाचार र अपडेट यी ठाउँमा छन्:',
          '',
          '• /news — नेपाली कानुनी समाचार र अपडेट',
          '• /blogs — लेख, विचार र विश्लेषण',
          '• /historical-facts — नेपालको कानुनको इतिहास र कानुनी व्यक्तित्व',
          '• /publications — प्रकाशन र प्रतिवेदन',
          '• /events — कार्यक्रम र सूचना',
          '',
          'पछिल्ला पोस्ट हेर्न माथिका पृष्ठहरू खोल्नुहोस्, वा खोज बारमा विषय लेख्नुहोस्।',
        ].join('\n')
      : [
          'News and updates live in these sections:',
          '',
          '• /news — Nepali legal news and updates',
          '• /blogs — articles, opinion and analysis',
          '• /historical-facts — history of law in Nepal and legal personalities',
          '• /publications — publications and reports',
          '• /events — events and notices',
          '',
          'Open a section to see the latest posts, or use the search bar for a specific topic.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('News', '/news', 'site-navigation', lang),
      source('Blogs', '/blogs', 'site-navigation', lang),
    ],
  };
}

function semesterAnswer(semester: SemesterLike, lang: ReplyLang): SiteFactAnswer {
  const subjects = dedupeSubjectNames(
    [...semester.subjects]
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((s) => s.name)
  );

  const reply =
    lang === 'ne'
      ? [
          `${semester.name} का विषय (${subjects.length}):`,
          '',
          ...subjects.map((s) => `• ${s}`),
          '',
          `एकाइ र स्रोत हेर्न: /semesters/${semester.id}`,
        ].join('\n')
      : [
          `${semester.name} subjects (${subjects.length}):`,
          '',
          ...subjects.map((s) => `• ${s}`),
          '',
          `Browse the units and resources: /semesters/${semester.id}`,
        ].join('\n');

  return {
    reply,
    sources: [source(`${semester.name} — Subjects`, `/semesters/${semester.id}`, 'site-study', lang)],
  };
}

function navigationAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          `${SITE_NAME} का मुख्य खण्डहरू:`,
          '',
          '• /study — कानुन नोट्स, नजिर र पुराना प्रश्न (सेमेस्टर/विषय/एकाइ फिल्टरसहित)',
          '• /semesters — सेमेस्टर → विषय → एकाइ संरचना',
          '• /explore — सबै सामग्री प्रकारको दृश्य सूची',
          '• /news — नेपाली कानुनी समाचार',
          '• /blogs — लेख र विचार',
          '• /historical-facts — नेपालको कानुनको इतिहास र कानुनी व्यक्तित्व',
          '• /publications — प्रकाशन र प्रतिवेदन',
          '• /events — कार्यक्रम र सूचना',
          '• /calculator — अदालती दस्तुर क्याल्कुलेटर (मुलुकी दिवानी कार्यविधि संहिता २०७४, दफा ६९)',
          '• /pricing — प्रिमियम सदस्यता',
          '• /consultation — कानुनी परामर्श बुकिङ',
          '• /team — टिम प्रोफाइल',
          '• /faqs — बारम्बार सोधिने प्रश्न',
          '• /search — साइटव्यापी खोज',
          '• /nepali — नेपाली सामग्री',
          '• /about र /contact — हाम्रो बारेमा र सम्पर्क',
          '',
          'कुनै खण्ड, विषय वा टिम सदस्यबारे सोध्नुहोस्।',
        ].join('\n')
      : [
          `Everything on ${SITE_NAME}, by section:`,
          '',
          '• /study — law notes, case laws and old questions, filtered by semester/subject/unit',
          '• /semesters — browse the full semester → subject → unit structure',
          '• /explore — visual index of all material categories',
          '• /news — Nepali legal news and updates',
          '• /blogs — articles and opinion pieces',
          '• /historical-facts — history of law in Nepal and legal personalities',
          '• /publications — publications and reports',
          '• /events — events and notices',
          '• /calculator — Nepal court fee calculator (Section 69, Civil Procedure Code 2017)',
          '• /pricing — premium subscriptions',
          '• /consultation — book a legal consultation',
          '• /team — team profiles',
          '• /faqs — frequently asked questions',
          '• /search — search the whole site',
          '• /nepali — Nepali-language content',
          '• /about and /contact — about us and how to reach us',
          '',
          'Ask me about any section, subject or team member.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Explore the Site', '/explore', 'site-navigation', lang),
      source('Study Materials', '/study', 'site-study', lang),
    ],
  };
}

function studyAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          `${SITE_NAME} ले अध्ययन सामग्री सेमेस्टर → विषय → एकाइ → स्रोत अनुसार व्यवस्थित गर्छ।`,
          '',
          '• कानुन नोट्स — BA.LLB र LLB विषयका स्पष्ट नोट्स',
          '• नजिर — महत्वपूर्ण फैसलाको सार',
          '• पुराना प्रश्न — परीक्षा अभ्यासका लागि विगतका प्रश्नपत्र',
          '',
          '/study बाट सेमेस्टरअनुसार हेर्नुहोस्, वा /semesters मा पूरा संरचना देख्नुहोस्। केही स्रोत निःशुल्क छन्; प्रिमियम एकपटक खरिद वा सदस्यताबाट खुल्छ।',
          '',
          'तपाईंले पढिरहनुभएको विषय वा टपिक भन्नुहोस् — साइटका नोट्स र नजिरतर्फ देखाउँछु।',
        ].join('\n')
      : [
          `${SITE_NAME} organises study material as Semester → Subject → Unit → Resource.`,
          '',
          '• Law notes — clear notes for BA.LLB and LLB subjects',
          '• Case laws — summaries of important judgments',
          '• Old questions — past exam papers for practice',
          '',
          'Browse by semester at /study, or see the full structure at /semesters. Some resources are free; premium ones unlock with a one-time purchase or a subscription.',
          '',
          'Tell me the subject or topic you are studying and I can point you to the notes and case laws on the site.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Study Materials', '/study', 'site-study', lang),
      source('Semesters', '/semesters', 'site-study', lang),
    ],
  };
}

function calculatorAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'हामीसँग निःशुल्क अदालती दस्तुर (कोर्ट फी) क्याल्कुलेटर /calculator मा छ।',
          '',
          'यसले मुलुकी दिवानी कार्यविधि संहिता, २०७४ को दफा ६९ अनुसार बिगोको आधारमा दिवानी मुद्दाको प्रगतिशील अदालती दस्तुर अनुमान गर्छ।',
          '',
          'पृष्ठमा थप:',
          '• अदालती दस्तुरको अर्थ — दफा ६३(२)',
          '• जित्ने पक्षले दस्तुर असुल — दफा ८३(१)',
          '• बिगो नतोकिएमा NPR १,००० — दफा ७१(२) र ७०',
          '• पुनरावेदनमा दाखिला शुल्कको थप १५% — दफा ७३',
          '• कहाँ र कसरी तिर्ने',
          '',
          'यो शैक्षिक अनुमान हो — वास्तविक मुद्दामा सम्बन्धित अदालतसँग पुष्टि गर्नुहोस् वा परामर्श लिनुहोस्।',
        ].join('\n')
      : [
          'We have a free Nepal court fee (अदालती दस्तुर / कोर्ट फी) calculator at /calculator.',
          '',
          'It estimates the progressive court fee for civil suits based on the claim amount (बिगो), under Section 69 of the National Civil Procedure Code, 2017 (Muluki Diwani Karyavidhi Samhita 2074).',
          '',
          'The page also covers:',
          '• Court fee meaning — Section 63(2)',
          '• Recovery of court fee by the winning party — Section 83(1)',
          '• NPR 1,000 fee when the claim amount is not specified — Sections 71(2) and 70',
          '• Additional 15% of the filing fee on appeal — Section 73',
          '• Where and how to pay',
          '',
          'It is an educational estimate — confirm the exact fee with the concerned court or book a consultation.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Court Fee Calculator', '/calculator', 'site-tool', lang),
      source('Book a Consultation', '/consultation', 'site-service', lang),
    ],
  };
}

function contributeAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          `${SITE_NAME} कानुन नोट्स, नजिर सार, लेख, समाचार वा ऐतिहासिक तथ्य योगदान गर्न चाहने विद्यार्थी, अनुसन्धानकर्ता र कानुन व्यवसायीसँग काम गर्छ।`,
          '',
          'योगदान, सहकार्य वा टिममा समावेश हुन चाहनुहुन्छ भने आफ्नो नाम, संस्था, काम गर्न चाहेको विषय/खण्ड र छोटो लेखन नमुना वा CV सहित इमेल गर्नुहोस्:',
          `${SITE_CONTACT.email}`,
          '',
          'सम्पादकीय काम साइटको सेमेस्टर → विषय → एकाइ संरचनाअनुसार हुन्छ; सामग्री सटीक, सन्दर्भसहित र स्पष्ट अंग्रेजी वा नेपालीमा हुनुपर्छ।',
          'हालको टिम र उनीहरूको अनुसन्धान क्षेत्र /team मा छ; कुनै विशेष क्षेत्रका लागि प्रोफाइलको इमेल/सामाजिक लिंक प्रयोग गर्नुहोस्।',
        ].join('\n')
      : [
          `${SITE_NAME} works with law students, researchers and legal professionals who want to contribute notes, case law summaries, articles, news or historical facts.`,
          '',
          'To propose a contribution, collaboration or a role on the team, email your name, institution, the topic or section you want to work on, and a short writing sample or CV:',
          `${SITE_CONTACT.email}`,
          '',
          'Editorial work follows the site’s semester → subject → unit structure; contributions should be accurate, referenced and written in clear English or Nepali.',
          'The current team and their research interests are at /team; individual profiles include email and social links for a specific area.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Our Team', '/team', 'site-team', lang),
      source('Contact Us', '/contact', 'site-contact', lang),
    ],
  };
}

function reportAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'गल्ती, टाइपो, बिग्रिएको लिंक वा गलत जानकारी भेट्नुभयो भने रिपोर्ट गर्नुहोस् — यसले साइट सुधार्न मद्दत गर्छ।',
          '',
          `पृष्ठको URL, के गलत छ र सही के हुनुपर्छ भन्ने विवरणसहित ${SITE_CONTACT.email} मा लेख्नुहोस्।`,
          '',
          'कुनै विषय वा नोट छुटेको छ भने पनि सेमेस्टर, विषय र एकाइसहित जानकारी पठाउनुहोस् — टिमले समीक्षा गर्छ।',
        ].join('\n')
      : [
          'If you spot a mistake, typo, broken link or wrong information, please report it — it helps keep the library accurate.',
          '',
          `Email ${SITE_CONTACT.email} with the page URL, what is wrong, and what the correct detail should be.`,
          '',
          'If a topic or note is missing, send the semester, subject and unit too and the team will review it.',
        ].join('\n');

  return {
    reply,
    sources: [source('Contact Us', '/contact', 'site-contact', lang)],
  };
}

function privacyAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'गोपनीयता नीति /privacy-policy मा र सर्तहरू /terms मा छन्।',
          '',
          'साइटले खाता विवरण, परामर्श अनुरोध, खरिद रेकर्ड र आधारभूत पहुँच लग जम्मा गर्छ; परामर्श अनुरोध गोप्य रहन्छ र अधिकृत वकिलले मात्र हेर्छन्। भुक्तानी eSewa/Khalti ले प्रशोधन गर्छ — साइटले कार्ड/वालेट विवरण राख्दैन।',
          '',
          'आफ्नो डेटा हेर्न, सुधार्न वा मेट्न, वा खाता बन्द गर्न खातासँग जोडिएको इमेलबाट लेख्नुहोस्:',
          `${SITE_CONTACT.email}`,
          '',
          'कानुनले तोकेका वा भुक्तानी मिलानका केही रेकर्ड भने केही समय राखिन सक्छ।',
        ].join('\n')
      : [
          'The Privacy Policy is at /privacy-policy and the Terms at /terms.',
          '',
          'The site collects account details, consultation requests, purchase records and basic access logs. Consultation requests are confidential and handled only by authorised advocates. Payments are processed by eSewa/Khalti — the site does not store card or wallet credentials.',
          '',
          'To access, correct or delete your data, or to close your account, email from the address linked to the account:',
          `${SITE_CONTACT.email}`,
          '',
          'Some records may be retained where required by law or for payment reconciliation.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Privacy Policy', '/privacy-policy', 'site-policy', lang),
      source('Terms of Service', '/terms', 'site-policy', lang),
    ],
  };
}

function languageAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'म प्रश्न जुन भाषामा लेखिएको छ, त्यही भाषामा उत्तर दिन्छु — अंग्रेजी, रोमन नेपाली वा देवनागरी नेपाली।',
          '',
          'साइटमा नेपाली सामग्री /nepali मा छ, र समाचार, ब्लग तथा ऐतिहासिक तथ्यमा नेपाली पोस्ट पनि पाइन्छ। अध्ययन सामग्री मुख्यतः अंग्रेजीमा छ।',
          '',
          'नेपालीमा सोध्नुभयो भने पनि म नेपालीमै जवाफ दिन्छु — विद्वान् ज्यू।',
        ].join('\n')
      : [
          'I reply in the language you write in — English, romanized Nepali, or Devanagari Nepali.',
          '',
          'Nepali content lives at /nepali, and news, blogs and historical facts include Nepali posts. The study library is mainly in English.',
          '',
          'Write in Nepali and I will answer in Nepali, विद्वान् ज्यू.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Nepali Content', '/nepali', 'site-navigation', lang),
      source('Explore the Site', '/explore', 'site-navigation', lang),
    ],
  };
}

function disclaimerAnswer(lang: ReplyLang): SiteFactAnswer {
  const reply =
    lang === 'ne'
      ? [
          'म कानुन साथी हुँ, शिक्षण सहायक — वकिल होइन। साइटका नोट्स, नजिर, क्याल्कुलेटर र मेरा उत्तरहरू अध्ययन र सामान्य जानकारीका लागि मात्र हुन्।',
          '',
          'यसले वकिल–ग्राहक सम्बन्ध सिर्जना गर्दैन र व्यक्तिगत कानुनी सल्लाह होइन। अदालती दस्तुरको नतिजा अनुमान मात्र हो — सम्बन्धित अदालतसँग पुष्टि गर्नुहोस्।',
          '',
          'वास्तविक विवाद, कारोबार वा मुद्दाका लागि /consultation मा परामर्श बुक गर्नुहोस्; अनुरोध गोप्य रहन्छ।',
        ].join('\n')
      : [
          'I’m Kanun Saathi, an education assistant — not a lawyer. The notes, case laws, calculator and my answers are for study and general information only.',
          '',
          'Nothing here creates an advocate–client relationship or counts as personal legal advice. Court fee results are estimates — confirm the exact amount with the concerned court.',
          '',
          'For a real dispute, transaction or case, book a consultation at /consultation; requests are confidential.',
        ].join('\n');

  return {
    reply,
    sources: [
      source('Terms of Service', '/terms', 'site-policy', lang),
      source('Book a Consultation', '/consultation', 'site-service', lang),
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Router                                                                     */
/* -------------------------------------------------------------------------- */

function isRosterQuestion(message: string): boolean {
  return /\b(team|members?|staff|researchers?|who works (?:here|there)|who are (?:the|your) (?:team|members)|how many (?:team )?members|list (?:of )?(?:team|members))\b|टिम|सदस्य|कति जना|अनुसन्धानकर्ता|कर्मचारी/i.test(
    message
  );
}

function hasPriorReference(message: string): boolean {
  return FOLLOW_UP_REFERENCE.test(message);
}

/**
 * Try to answer a "site basics" question deterministically.
 * Returns null when the question is not about the site itself, in which case
 * the caller falls through to the normal RAG/LLM path.
 */
export async function answerSiteFacts(
  message: string,
  options: SiteFactOptions = {}
): Promise<SiteFactAnswer | null> {
  const text = message.trim();
  if (!text) return null;

  const lang = detectReplyLang(text);
  const history = (options.history ?? []).filter((m) => typeof m?.content === 'string' && m.content.trim());

  if (THANKS_INTENT.test(text) && text.length <= 60) return thanksAnswer(lang);

  const members = await getTeam();

  // Team member questions take priority: "Who is Ram Babu Das?" must never
  // fall through to a generic retrieval answer.
  if (members.length) {
    const member = matchTeamMember(text, members);
    if (member) {
      const field = detectMemberField(text);
      if (field) {
        return {
          reply: formatTeamMemberField(member, field, lang),
          sources: [source(member.name, `/team/${member.slug}`, 'team', lang)],
        };
      }
      return {
        reply: formatTeamMemberIntro(member, lang),
        sources: [source(member.name, `/team/${member.slug}`, 'team', lang)],
      };
    }

    // A person who is not on the team must never be fuzzy-matched into someone
    // else ("Amrit" is not "Smriti"). Say so, then offer a clearly-labelled
    // closest spelling.
    const askedName = extractPersonName(text);
    if (askedName) return memberNotFoundAnswer(askedName, members, lang);

    // Follow-ups: "what is his email?", "tell me more", "उनको योग्यता के हो?"
    if (history.length) {
      const prior = findMemberInHistory(history, members);
      if (prior && (hasPriorReference(text) || detectMemberField(text) || MORE_DETAIL.test(text))) {
        const field = detectMemberField(text);
        if (field) {
          return {
            reply: formatTeamMemberField(prior, field, lang),
            sources: [source(prior.name, `/team/${prior.slug}`, 'team', lang)],
          };
        }
        return {
          reply: MORE_DETAIL.test(text)
            ? formatTeamMemberMore(prior, lang)
            : formatTeamMemberIntro(prior, lang),
          sources: [source(prior.name, `/team/${prior.slug}`, 'team', lang)],
        };
      }
    }

    // Roster questions.
    if (isRosterQuestion(text)) {
      const group = membersByDesignation(text, members);
      if (group) {
        return {
          reply: teamRoster(group.members, lang, group.designation),
          sources: [source('Our Team', '/team', 'site-team', lang)],
        };
      }
      return {
        reply: teamRoster(members, lang),
        sources: [source('Our Team', '/team', 'site-team', lang)],
      };
    }
  }

  // "Which subjects are in the 1st semester?" is answered from the live
  // taxonomy, so the list is exact and duplicate source rows are collapsed.
  const semesterNumber = parseSemesterNumber(text);
  if (
    semesterNumber !== null &&
    /\b(subjects?|syllabus|curriculum|semester|sem)\b|विषय|सेमेस्टर|पाठ्यक्रम/i.test(text)
  ) {
    const semesters = await getSemesters();
    const semester =
      semesters.find((s) => s.order === semesterNumber) ??
      semesters.find((s) => normalize(s.name).startsWith(String(semesterNumber)));
    if (semester) return semesterAnswer(semester, lang);
  }

  if (ASSISTANT_INTENT.test(text)) return assistantAnswer(lang);

  if (BILLING_INTENT.test(text)) return billingAnswer(lang);

  if (FREE_INTENT.test(text)) return freeAnswer(lang);

  if (DOWNLOAD_INTENT.test(text)) return downloadAnswer(lang);

  if (PRIVACY_INTENT.test(text)) return privacyAnswer(lang);

  if (ACCOUNT_INTENT.test(text)) return accountAnswer(lang);

  if (CONTRIBUTE_INTENT.test(text)) return contributeAnswer(lang);

  if (REPORT_INTENT.test(text)) return reportAnswer(lang);

  if (LANGUAGE_INTENT.test(text)) return languageAnswer(lang);

  // Check the calculator before the general disclaimer: "is the calculator
  // accurate?" deserves the calculator caveat, not the full legal disclaimer.
  if (CALCULATOR_INTENT.test(text) && /\b(calculat\w*|compute|how much is|how is|what is|estimate|accurate|exact)\b|कति|कसरी/i.test(text)) {
    return calculatorAnswer(lang);
  }

  if (DISCLAIMER_INTENT.test(text)) return disclaimerAnswer(lang);

  if (SEARCH_INTENT.test(text)) return searchAnswer(lang);

  if (NEWS_INTENT.test(text)) return newsAnswer(lang);

  if (CONTACT_INTENT.test(text) && !STUDY_INTENT.test(text)) return contactAnswer(lang);

  if (ABOUT_INTENT.test(text)) return aboutAnswer(lang);

  if (SERVICE_INTENT.test(text)) return serviceAnswer(lang);

  if (PRICING_INTENT.test(text)) return pricingAnswer(lang);

  if (STUDY_INTENT.test(text) && STUDY_QUESTION.test(text)) return studyAnswer(lang);

  if (NAVIGATION_INTENT.test(text)) return navigationAnswer(lang);

  return null;
}
