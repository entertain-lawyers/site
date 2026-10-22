import { aiChat } from './chat';

/**
 * LLM query normalization (typo fixes, roman ↔ Devanagari pairs) — runs over
 * the provider chain (Groq, then Gemini, then OpenRouter) and is cached per
 * query since keystroke searches repeat terms heavily. Results are capped to
 * 3 keywords and feed the same DB/WP passes as the raw query.
 */

const normalizeCache = new Map<string, string[]>();
const NORMALIZE_MAX_CACHE = 400;

const SYSTEM =
  'You normalize search queries for a Nepali legal-education website. ' +
  'Fix spelling, expand romanized Nepali ("adalat" -> court / अदालत), and map ' +
  'between English and Devanagari so both language indexes can be searched. ' +
  'Return strict JSON only: {"keywords":["term1","term2"]} with at most 3 short keywords, ordered by usefulness. ' +
  'Always include the original intent; never answer the question.';

export async function normalizeSearchQuery(q: string): Promise<string[] | null> {
  const key = q.trim().toLowerCase();
  if (key.length < 2) return null;
  const cached = normalizeCache.get(key);
  if (cached) return cached;

  // Fails fast (single 8s attempt) — search typing must never stall on it.
  const raw = await aiChat(SYSTEM, `Query: ${q}`, { temperature: 0, fast: true });
  if (!raw) return null;

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { keywords?: unknown };
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k): k is string => typeof k === 'string' && k.trim().length > 0).slice(0, 3)
      : [];
    if (keywords.length === 0) return null;

    if (normalizeCache.size > NORMALIZE_MAX_CACHE) {
      normalizeCache.delete(normalizeCache.keys().next().value as string);
    }
    normalizeCache.set(key, keywords);
    return keywords;
  } catch {
    return null;
  }
}
