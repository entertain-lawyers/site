import { groqChat, openRouterChat, isAnyChatProviderEnabled } from './groq';
import { geminiChat, isAiEnabled } from './gemini';

/**
 * Provider chain for text generation (chatbot replies + query normalization):
 *
 *   1. Groq        — primary (generous free tier, fast, good Devanagari)
 *   2. Gemini      — fallback (its free tier also feeds the embeddings index,
 *                    so it's only spent when Groq is down/out of quota)
 *   3. OpenRouter  — last resort (only if OPENROUTER_API_KEY is set; free
 *                    ":free" models have tight daily caps)
 *
 * All providers fail soft (return null); `aiChat` returns null only if every
 * configured provider fails, so callers keep their graceful degradation.
 */

interface Speed {
  retries: number;
  timeoutMs: number;
}

/** Search-query normalization must never stall typing. */
const FAST: Speed = { retries: 1, timeoutMs: 8_000 };
/** Chatbot replies get the full retry budget. */
const FULL: Speed = { retries: 2, timeoutMs: 20_000 };

interface AiChatOptions {
  temperature?: number;
  fast?: boolean;
  maxOutputTokens?: number;
}

export async function aiChat(
  system: string,
  user: string,
  opts: AiChatOptions = {}
): Promise<string | null> {
  const speed = opts.fast ? FAST : FULL;
  const temperature = opts.temperature ?? 0.2;

  if (!isAnyChatProviderEnabled() && !isAiEnabled()) return null;

  // 1. Groq
  const groq = await groqChat(system, user, {
    temperature,
    retries: speed.retries,
    timeoutMs: speed.timeoutMs,
    maxOutputTokens: opts.maxOutputTokens,
  });
  if (groq) return groq;

  // 2. Gemini
  const gemini = await geminiChat(system, user, {
    temperature,
    timeoutMs: speed.timeoutMs,
    retries: speed.retries,
  });
  if (gemini) return gemini;

  // 3. OpenRouter (last resort) — same latency budget as the other legs so a
  //    full chain failure can never blow past serverless function limits.
  const openRouter = await openRouterChat(system, user, {
    temperature,
    timeoutMs: speed.timeoutMs,
  });
  if (openRouter) return openRouter;

  return null;
}
