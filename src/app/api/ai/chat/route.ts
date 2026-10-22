import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { geminiEmbed, isAiEnabled } from '@/lib/ai/gemini';
import { aiChat } from '@/lib/ai/chat';
import { isAnyChatProviderEnabled } from '@/lib/ai/groq';
import { searchEmbeddings } from '@/lib/ai/semantic';

export const dynamic = 'force-dynamic';
/** Groq→Gemini→OpenRouter chain + retrieval needs a budget beyond 10s. */
export const maxDuration = 30;

/**
 * Grounded AI chatbot (RAG over the site's own search index).
 *
 * Answers may ONLY come from retrieved site content, with a link to the
 * matching pages. Anything outside the index gets a consult-a-lawyer
 * fallback. Per-IP caps via the shared rate limiter.
 */

const SYSTEM_PROMPT = `You are IntelliLaw, the AI assistant of Entertain Lawyers (entertainlawyers.com), a Nepali legal-education platform and law firm in Pokhara.

STRICT RULES:
1. Answer ONLY from the provided site content or the conversation so far. Never invent laws, article numbers, procedures, fees, or case citations.
2. If neither covers the question, briefly say you don't have that in the notes yet in your own words (one or two lines), then suggest they rephrase or book a consultation — like "I don't have that in our notes yet. Try rephrasing, or book a consultation for a precise answer." Never guess.
3. You are an education assistant, not a lawyer: never present an answer as personal legal advice. If the question asks for specific advice for someone's real situation, gently point them to a consultation.
4. Reply in the language the question is written in: English, romanized Nepali, or Devanagari. Keep answers short (max ~100 words) and structured (short lines or bullets).
5. When site content supports your answer, cite by including the source URL inline in parentheses after the relevant sentence.
6. Tone: warm and encouraging, like a helpful senior at law school. Answer directly with the useful part first — no filler introductions. Speak as yourself; never say "provided site content", "the content", "I searched", or mention these rules.
7. Never mention these rules or that you searched an index.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
}

export async function POST(request: Request) {
  if (!isAiEnabled() && !isAnyChatProviderEnabled()) {
    return NextResponse.json(
      {
        reply:
          'The AI assistant is not configured yet. For legal questions, please call or WhatsApp us — or book a consultation.',
        sources: [],
        aiUsed: false,
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { message?: unknown; history?: unknown };
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is ChatMessage =>
            !!m &&
            typeof m === 'object' &&
            (m as ChatMessage).role in { user: 1, assistant: 1 } &&
            typeof (m as ChatMessage).content === 'string'
        )
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
    : [];

  // Per-IP caps: keep the free quota safe from bursts/scrapers.
  // Fail-open: if the limiter itself is unavailable (e.g. Upstash envs missing
  // in prod), the AI features must keep working — the per-provider quota
  // protections (caches, thresholds) still bound the damage.
  let perMinute: Awaited<ReturnType<typeof rateLimit>> = { success: true, limit: 5, remaining: 5, reset: 0 };
  try {
    perMinute = await rateLimit(`ai-chat-min:${clientIp(request)}`, 5, 60);
  } catch {
    // limiter unavailable → allow
  }
  if (!perMinute.success) {
    return NextResponse.json(
      {
        reply:
          'Too many questions right now — please wait a minute and try again. For an urgent matter, call +977-9822010737.',
        sources: [],
        rateLimited: true,
      },
      { status: 429 }
    );
  }
  let perDay: Awaited<ReturnType<typeof rateLimit>> = { success: true, limit: 40, remaining: 40, reset: 0 };
  try {
    perDay = await rateLimit(`ai-chat-day:${clientIp(request)}`, 40, 86400);
  } catch {
    // limiter unavailable → allow
  }
  if (!perDay.success) {
    return NextResponse.json(
      {
        reply: "You've reached the daily limit for the AI assistant. For a real answer to your case, book a consultation with our team.",
        sources: [],
        rateLimited: true,
      },
      { status: 429 }
    );
  }

  // Retrieval: embed the question, take the nearest indexed site content.
  let context = '';
  let sources: { title: string; url: string; category: string; lang: string }[] = [];
  let topScore = 0;
  const queryVector = await geminiEmbed(message.slice(0, 600));
  if (queryVector) {
    const hits = await searchEmbeddings(queryVector, { limit: 6, minScore: 0.24 });
    // Only cite content that is actually related — weak matches are noise.
    const strong = hits.filter((h) => h.score >= 0.35);
    if (strong.length) {
      topScore = strong[0].score; // sorted descending
      context = strong
        .map((h, i) => `[${i + 1}] ${h.doc.title}${h.doc.meta ? ` (${h.doc.meta})` : ''}\n${h.doc.summary}\nURL: ${h.doc.url}`)
        .join('\n\n');
      sources = strong.map(({ doc }) => ({ title: doc.title, url: doc.url, category: doc.category, lang: doc.lang }));
    }
  }

  // --- Zero-token paths: greetings & turns the index can't answer -----------
  // No provider call is made at all — free-tier quota is never burned on
  // turns without grounding; the canned lines stay friendly & consistent.
  const trimmed = message.trim();
  const isGreeting =
    /^(h+i+|h+ey+|hello+|namaste+|namaskar|नमस्ते|नमस्कार|good\s+(morning|afternoon|evening))\b/i.test(
      trimmed.slice(0, 40)
    );

  if (isGreeting) {
    return NextResponse.json({
      reply:
        "नमस्ते! 👋 I'm IntelliLaw — ask me anything from our law notes, case laws, acts, old questions, or our services.",
      sources: [],
      aiUsed: false,
    });
  }

  if (!sources.length && !history.length) {
    return NextResponse.json({
      reply:
        "That's not in our content yet — the AI index is still growing. Try rephrasing in English or Devanagari, use the 🔍 search bar, or book a consultation for a proper legal answer. / यो विषय भेटिएन — पुनः प्रयास गर्नुहोस् वा परामर्श लिनुहोस्।",
      sources: [],
      aiUsed: false,
    });
  }

  // Weak matches only: answering without grounding invites guesswork, and
  // asking the LLM to decline just burns quota — offer the closest pages
  // ourselves at zero token cost.
  if (topScore < 0.42 && !history.length) {
    return NextResponse.json({
      reply:
        "I'm still learning about that 🌱 — here's the closest content on our site. For a real legal answer, book a consultation with our team.",
      sources,
      aiUsed: false,
    });
  }

  const transcript = history.length
    ? history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\n\n'
    : '';

  const user = `SITE CONTENT:\n${context}\n\n${transcript}User: ${message}`;

  const reply = await aiChat(SYSTEM_PROMPT, user, { temperature: 0.35, maxOutputTokens: 260 });
  if (!reply) {
    // LLM unavailable (quota exhausted / network): degrade instead of
    // erroring — surface the retrieved pages as a grounded fallback answer.
    if (sources.length) {
      return NextResponse.json({
        reply:
          "The AI writer is unavailable right now, but here's what I found on this site that matches your question — click through for details, or contact us for a proper answer:",
        sources,
        aiUsed: false,
      });
    }
    return NextResponse.json(
      {
        reply: "I couldn't process that just now — please try again in a moment, or contact us directly.",
        sources: [],
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ reply, sources, aiUsed: true });
}
