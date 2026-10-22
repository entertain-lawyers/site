import { env } from '@/env';

/**
 * OpenAI-compatible chat client for Groq (primary fallback for the
 * chatbot/query normalization) and OpenRouter (last resort). Text-only,
 * single-shot; returns null on any failure so callers stay resilient.
 */

interface CompatOptions {
  temperature?: number;
  timeoutMs?: number;
  retries?: number;
  maxOutputTokens?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chatOnce(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  opts: CompatOptions
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxOutputTokens ?? 768,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}

async function withRetry(fn: () => Promise<string | null>, tries: number, pauseMs: number): Promise<string | null> {
  for (let attempt = 0; attempt < tries; attempt++) {
    const out = await fn();
    if (out) return out;
    if (attempt < tries - 1) await new Promise((r) => setTimeout(r, pauseMs));
  }
  return null;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function groqChat(
  system: string,
  user: string,
  opts: CompatOptions = {}
): Promise<string | null> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b';
  return withRetry(
    () => chatOnce(GROQ_URL, apiKey, model, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], opts),
    opts.retries ?? 2,
    400
  );
}

export async function openRouterChat(
  system: string,
  user: string,
  opts: CompatOptions = {}
): Promise<string | null> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
  // Free-model caps are tiny — a single attempt, longer pause irrelevant.
  return chatOnce(OPENROUTER_URL, apiKey, model, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { ...opts, retries: 1 });
}

export function isAnyChatProviderEnabled(): boolean {
  return Boolean(env.GROQ_API_KEY || env.OPENROUTER_API_KEY);
}
