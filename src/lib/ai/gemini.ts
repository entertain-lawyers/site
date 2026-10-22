import { env } from '@/env';

/**
 * Minimal Google Gemini REST client.
 *
 * Everything AI-related degrades gracefully: helpers return `null` when the
 * key is missing or a call fails, so search/chat keep working without AI.
 * Keys stay server-side only — never expose them to the client.
 */

const GEN_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const API_KEY = env.GEMINI_API_KEY;

export function isAiEnabled(): boolean {
  return Boolean(API_KEY);
}

const CHAT_MODEL = env.GEMINI_CHAT_MODEL || 'gemini-3.8-flash';
const EMBED_MODEL = env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';

/**
 * The path to the Gemini API is intermittently unstable in some regions
 * (POST requests occasionally hang until timeout). Retry once after a
 * short pause so a single dropped request doesn't disable AI features.
 */
async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number, tries = 2): Promise<Response | null> {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status >= 500 && attempt < tries - 1) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      return res;
    } catch {
      if (attempt >= tries - 1) return null;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

/** Embed a short text. Returns null on any failure. */
export async function geminiEmbed(text: string): Promise<number[] | null> {
  if (!API_KEY) return null;
  const body = {
    content: { parts: [{ text: text.slice(0, 6000) }] },
  };
  try {
    const res = await fetchWithRetry(
      `${GEN_API_BASE}/models/${EMBED_MODEL}:embedContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      10_000
    );
    if (!res || !res.ok) return null;
    const json = await res.json();
    const values = json?.embedding?.values;
    return Array.isArray(values) ? (values as number[]) : null;
  } catch {
    // Network error / abort — AI must degrade gracefully, never throw.
    return null;
  }
}

interface ChatOptions {
  /** Temperature 0–2; keep low for grounded answers. */
  temperature?: number;
  /** Total request timeout per attempt. */
  timeoutMs?: number;
  /** Number of attempts (1 = no retry). */
  retries?: number;
}

/** One-shot chat completion. Returns null on any failure. */
export async function geminiChat(
  system: string,
  user: string,
  opts: ChatOptions = {}
): Promise<string | null> {
  if (!API_KEY) return null;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: 768,
      thinkingConfig: { thinkingLevel: 'low' as const },
    },
  };
  try {
    // SSE streaming endpoint — the non-streaming :generateContent call
    // stalls for the gemini-3.x family, so we aggregate the stream instead.
    const res = await fetchWithRetry(
      `${GEN_API_BASE}/models/${CHAT_MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      opts.timeoutMs ?? 20_000,
      opts.retries ?? 2
    );
    if (!res || !res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let out = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          const evt = JSON.parse(payload);
          const parts = evt?.candidates?.[0]?.content?.parts;
          if (Array.isArray(parts)) {
            for (const p of parts) {
              if (typeof p.text === 'string' && p.thought !== true) out += p.text;
            }
          }
        } catch {
          // partial SSE chunk — ignored, next chunks re-deliver
        }
      }
    }
    return out.trim() || null;
  } catch {
    // Network error / abort — AI must degrade gracefully, never throw.
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
