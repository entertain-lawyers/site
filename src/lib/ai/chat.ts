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
/** Chatbot replies: one retry per leg keeps resilience without stalling. */
const FULL: Speed = { retries: 1, timeoutMs: 10_000 };
/** Hard ceiling for the whole chain so a bad provider day can't stall the chat. */
const TOTAL_BUDGET_MS = 15_000;
const MIN_USEFUL_MS = 2_000;

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

  // Shared deadline: every leg only receives the time still left in the budget.
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const budget = (cap: number): number => {
    const remaining = deadline - Date.now();
    return remaining < MIN_USEFUL_MS ? 0 : Math.min(cap, remaining);
  };

  // 1. Groq
  if (budget(10_000)) {
    const groq = await groqChat(system, user, {
      temperature,
      retries: speed.retries,
      timeoutMs: budget(10_000),
      maxOutputTokens: opts.maxOutputTokens,
    });
    if (groq) return groq;
  }

  // 2. Gemini
  if (budget(8_000)) {
    const gemini = await geminiChat(system, user, {
      temperature,
      timeoutMs: budget(8_000),
      retries: speed.retries,
    });
    if (gemini) return gemini;
  }

  // 3. OpenRouter (last resort) — only if time remains in the shared budget.
  const openRouterBudget = budget(6_000);
  if (openRouterBudget) {
    const openRouter = await openRouterChat(system, user, {
      temperature,
      timeoutMs: openRouterBudget,
    });
    if (openRouter) return openRouter;
  }

  return null;
}
