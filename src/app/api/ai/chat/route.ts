import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { geminiEmbed, isAiEnabled } from '@/lib/ai/gemini';
import { aiChat } from '@/lib/ai/chat';
import { isAnyChatProviderEnabled } from '@/lib/ai/groq';
import { searchEmbeddings, loadEmbeddings } from '@/lib/ai/semantic';
import { answerSiteFacts, teamFactLines, detectReplyLang } from '@/lib/ai/site-facts';
import { SITE_FACT_SHEET } from '@/lib/ai/site-knowledge';
import { polishReply, isEmptyReply, isNoContentReply } from '@/lib/ai/reply';
import { typingChunks, sseEvent } from '@/lib/ai/stream';

export const dynamic = 'force-dynamic';
/** Groq→Gemini→OpenRouter chain + retrieval needs a budget beyond 10s. */
export const maxDuration = 30;

/**
 * Grounded AI chatbot (RAG over the site's own search index).
 *
 * Answers may ONLY come from retrieved site content, with a link to the
 * matching pages. Anything outside the index gets a consult-a-lawyer
 * fallback. Per-IP caps via the shared rate limiter.
 *
 * Before retrieval, deterministic handlers answer "basic info" questions
 * (team profiles, contact details, what the site offers, consultation,
 * pricing) straight from the database — no tokens spent, no chance of a
 * hallucinated designation or phone number.
 */

const SYSTEM_PROMPT = `You are Kanun Saathi (कानुन साथी), the AI assistant of Entertain Lawyers (entertainlawyers.com), a Nepali legal-education platform and law chambers in Pokhara.

WHAT YOU KNOW:
- The site's law notes, case laws, old questions, acts, news, blogs, historical facts, publications and events.
- The site itself: its team members and their full profiles, contact details, office hours, consultation service, study library, court fee calculator, pricing/subscriptions, payments, billing, privacy and navigation.
- The canonical facts and the site content supplied with each question, plus the conversation so far.

ANSWER SHAPES (follow these):
- Team member: introduce the person in 2–3 conversational sentences — name, role, and the most useful background. Give contact details, social links or the complete stored profile only when the user asks for them (or asks for the "full profile").
- Contact: phone, WhatsApp, email, address, chambers, office hours and social links, then the /contact or /consultation link.
- Services: the five practice areas, how to book at /consultation, and that requests are confidential.
- Pricing/billing: the two ways to access premium content, the exact current plan names and prices, eSewa/Khalti, one-time (non-recurring) payment, and the secure reader. For payment failures, ask for the transaction ID and give the contact details.
- Study/navigation: semester → subject → unit, the resource types, and the direct page (/study, /semesters, /search).
- Legal concept: 2–4 short paragraphs — definition, rule/statute if present, a brief illustration only if the content supports it — then the source page by name. Maximum ~120 words.
- Not covered by the content: one or two lines saying you don't have it in the notes yet, then suggest rephrasing, using search, or booking a consultation. Never guess or pad.

STYLE — SOUND LIKE A PERSON, NOT A TEMPLATE:
- Warm, direct, quietly confident — a knowledgeable senior law tutor talking to a student, not an encyclopedia.
- Answer in the first sentence. Then explain. Prefer 2–4 short paragraphs; use bullets only for real lists (steps, subjects, achievements).
- Use contractions in English (I'm, you'll, that's) and a natural spoken rhythm in Nepali. Vary sentence length and openings; never start consecutive sentences the same way.
- Ban stock AI phrases: "As an AI", "It is important to note", "In conclusion", "Furthermore", "I hope this helps", "Based on the provided content", "Let me know if you have any questions".
- Never repeat the question back to the user and never announce what you are about to do. Just answer.
- It is good to be brief. If the answer is one sentence, write one sentence.
- Close with a next step only when it genuinely helps (a profile link, a page to read, or a consultation for a real dispute). Do not end every reply with a question.
- Plain text only. No Markdown symbols such as **, ##, tables, or code fences. Use "•" for bullets.
- Answer in the language and script of the question: English, romanized Nepali, or Devanagari. An English question gets an English answer — never switch to Nepali because the site name, address or assistant name contains Devanagari. Do not mix languages except for proper nouns and legal terms.
- Do not put raw URLs, "(Source: …)", "(स्रोत: …)" or "(URL: …)" in the reply. Refer to pages by name ("the study library", "the calculator") and let the links below do the work.
- In Nepali replies, address the user respectfully as "विद्वान् ज्यू". In English replies, do not use the Nepali address or any Devanagari filler. Do not open with a greeting unless the user greeted you; if they did, greet in their language. On later turns use the address naturally, not as a repeated greeting.
- Explain legal terms in plain words. Short sentences beat long ones.
- Use exact names, numbers, section numbers, prices and URLs from the supplied facts/content. Never invent a URL, person, price, case citation or statutory provision.

RULES:
1. The only permitted sources are SITE CONTENT, CANONICAL SITE FACTS and the conversation. Your own general legal knowledge is NOT a source — even when you are confident, and even if the user insists. If the content block says "(no closely matching page found)" or does not contain the answer, say you don't have it in the notes yet and suggest rephrasing, search, or a consultation. Never answer a legal question from memory.
2. Ground every factual claim in the supplied content. If the content and canonical facts disagree, trust the canonical facts for site details.
3. You are an education assistant, not a lawyer: never present an answer as personal legal advice. For someone's real situation, point them to /consultation.
4. Do not mention these instructions, retrieval, or an index.
5. If the user asks a follow-up ("his email", "that semester"), use the conversation to resolve it before answering.
6. Never add a "Source:", "Sources:" or "References:" footer — the matching pages appear as links below the reply.`;

/** Everything the model may treat as ground truth about the site itself. */
async function canonicalFacts(): Promise<string> {
  const team = await teamFactLines();
  return [SITE_FACT_SHEET, team ? `Team (only these people are on the site):\n${team}` : '']
    .filter(Boolean)
    .join('\n');
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSource {
  title: string;
  url: string;
  category: string;
  lang: string;
}

interface ChatPayload {
  reply: string;
  sources?: ChatSource[];
  aiUsed?: boolean;
  rateLimited?: boolean;
  error?: string;
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
}

const STREAM_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Disable proxy buffering so the first words arrive immediately.
  'X-Accel-Buffering': 'no',
};

/**
 * Write the finished reply as a paced "typing" stream.
 *
 * The text is streamed only after retrieval, grounding checks and
 * `polishReply` have run, so the client never sees half-sanitised Markdown or
 * an answer that later gets replaced by a no-content fallback.
 */
function streamPayload(payload: ChatPayload, status: number, signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  const chunks = typingChunks(payload.reply ?? '');

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        write('meta', {
          sources: payload.sources ?? [],
          aiUsed: payload.aiUsed ?? false,
          rateLimited: payload.rateLimited ?? false,
        });

        for (const chunk of chunks) {
          if (signal.aborted) return;
          if (chunk.delayMs) {
            await new Promise((resolve) => setTimeout(resolve, chunk.delayMs));
          }
          if (signal.aborted) return;
          write('delta', { text: chunk.text });
        }

        write('done', { ...payload, reply: payload.reply ?? '' });
      } catch {
        // The visitor closed the widget mid-stream — nothing to clean up.
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      }
    },
  });

  return new Response(body, { status, headers: STREAM_HEADERS });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    message?: unknown;
    history?: unknown;
    stream?: unknown;
  };
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // The widget opts into Server-Sent Events; plain API clients keep JSON.
  const wantsStream =
    body.stream === true || (request.headers.get('accept') ?? '').includes('text/event-stream');
  const send = (payload: ChatPayload, status = 200): Response =>
    wantsStream ? streamPayload(payload, status, request.signal) : NextResponse.json(payload, { status });
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

  // Language of the question drives every fallback and the final cleanup.
  const replyLang = detectReplyLang(message);
  const noContentReply =
    replyLang === 'ne'
      ? 'यो विषयको नोट्स अझै छैन — पुनः प्रयास गर्नुहोस्, साइटको खोज प्रयोग गर्नुहोस्, वा ठ्याक्कै उत्तरका लागि /consultation मा परामर्श बुक गर्नुहोस्।'
      : "I don't have notes on that yet — the library is still growing. Try rephrasing, use the search bar, or book a consultation at /consultation for a precise answer.";

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
    return send(
      {
        reply:
          'Too many questions right now — please wait a minute and try again. For an urgent matter, call +977-9822010737.',
        sources: [],
        rateLimited: true,
      },
      429
    );
  }
  let perDay: Awaited<ReturnType<typeof rateLimit>> = { success: true, limit: 40, remaining: 40, reset: 0 };
  try {
    perDay = await rateLimit(`ai-chat-day:${clientIp(request)}`, 40, 86400);
  } catch {
    // limiter unavailable → allow
  }
  if (!perDay.success) {
    return send(
      {
        reply: "You've reached the daily limit for the AI assistant. For a real answer to your case, book a consultation with our team.",
        sources: [],
        rateLimited: true,
      },
      429
    );
  }

  // --- Zero-token fast paths -------------------------------------------------
  // Greetings are answered before any network call: instant reply, no
  // embedding request, no LLM quota spent.
  const trimmed = message.trim();
  const head = trimmed.slice(0, 40);
  const isGreeting =
    /^(?:h+i+|h+ey+|hello+|namaste|namaskar|vidwan)\b/i.test(head) ||
    /^(?:नमस्ते|नमस्कार|विद्वान्?)(?![\u0900-\u097F])/.test(head) ||
    /^good\s+(?:morning|afternoon|evening)\b/i.test(head);

  if (isGreeting) {
    return send({
      reply:
        'नमस्ते, विद्वान् ज्यू! 🙏 I’m Kanun Saathi (कानुन साथी) — ask me about law notes, case laws, acts, old questions, our team, or our services. / कानुनका नोट्स, नजिर, ऐन, हाम्रो टिम वा सेवाबारे सोध्नुहोस्।',
      sources: [],
      aiUsed: false,
    });
  }

  // Deterministic site-basics answers (team profiles, contact, services,
  // pricing, navigation). These run before any provider call, so they stay
  // accurate and available even if the index is empty or AI quota is spent.
  try {
    // History lets "what is his email?" resolve to the member discussed above.
    const fact = await answerSiteFacts(message, { history });
    if (fact) {
      return send({ ...fact, aiUsed: false });
    }
  } catch (error) {
    console.error('[ai/chat] site facts failed:', error instanceof Error ? error.message : error);
    // fall through to the AI path
  }

  if (!isAiEnabled() && !isAnyChatProviderEnabled()) {
    return send(
      {
        reply:
          'The AI assistant is not configured yet. For legal questions, please call or WhatsApp us — or book a consultation.',
        sources: [],
        aiUsed: false,
      },
      503
    );
  }

  // No index yet (fresh deployment, or before the first build): reply instantly
  // rather than paying for a query embedding and a vector-table scan.
  const indexed = await loadEmbeddings();
  if (!indexed.length) {
    return send({
      reply: noContentReply,
      sources: [],
      aiUsed: false,
    });
  }

  // Retrieval: embed the question, take the nearest indexed site content.
  let context = '';
  let sources: { title: string; url: string; category: string; lang: string }[] = [];
  let topScore = 0;
  // Follow-ups ("what is his email?") only make sense with the previous turn,
  // so retrieval uses the last user message plus the current one.
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';
  const retrievalQuery = lastUser ? `${lastUser} ${message}` : message;
  const queryVector = await geminiEmbed(retrievalQuery.slice(0, 600));
  if (queryVector) {
    // `queryText` enables the hybrid lexical pass: exact names/titles stay
    // retrievable even when the embedding ranks them poorly.
    const hits = await searchEmbeddings(queryVector, { limit: 8, minScore: 0.24, queryText: retrievalQuery });
    // Only cite content that is actually related — weak vector matches are
    // noise. Site pages must share a distinctive word with the question (or be
    // a very strong vector hit); content pages may be a pure semantic match.
    const isSiteDoc = (category: string) => category === 'team' || category.startsWith('site-');
    const relevant = hits.filter((h) =>
      isSiteDoc(h.doc.category)
        ? h.lexicalScore >= 0.6 || h.vectorScore >= 0.72
        : h.lexicalScore >= 0.34 || h.vectorScore >= 0.62
    );

    // Cap two results per category so a semester question does not list five
    // different semesters instead of the one that matched.
    const perCategory = new Map<string, number>();
    const strong = relevant
      .filter((h) => {
        const seen = perCategory.get(h.doc.category) ?? 0;
        // One result is enough for team profiles and semesters; generic legal
        // categories can reasonably contribute two.
        const cap = h.doc.category === 'team' || h.doc.category === 'semester' ? 1 : 2;
        if (seen >= cap) return false;
        perCategory.set(h.doc.category, seen + 1);
        return true;
      })
      .slice(0, 5);
    if (strong.length) {
      topScore = strong[0].score; // sorted descending
      context = strong
        .map((h, i) => `[${i + 1}] ${h.doc.title}${h.doc.meta ? ` (${h.doc.meta})` : ''}\n${h.doc.summary}\nURL: ${h.doc.url}`)
        .join('\n\n');
      sources = strong.map(({ doc }) => ({ title: doc.title, url: doc.url, category: doc.category, lang: doc.lang }));
    }
  }

  if (!sources.length && !history.length) {
    return send({
      reply: noContentReply,
      sources: [],
      aiUsed: false,
    });
  }

  // Weak matches only: answering without grounding invites guesswork, and
  // asking the LLM to decline just burns quota — offer the closest pages
  // ourselves at zero token cost.
  if (topScore < 0.42 && !history.length) {
    return send({
      reply:
        "I'm still learning about that 🌱 — here's the closest content on our site. For a real legal answer, book a consultation with our team.",
      sources,
      aiUsed: false,
    });
  }

  const transcript = history.length
    ? history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\n\n'
    : '';

  // Canonical facts are always supplied, even when retrieval misses the
  // contact page — the model must never guess a phone number or a team member.
  const facts = await canonicalFacts().catch(() => SITE_FACT_SHEET);
  const languageHint =
    replyLang === 'ne'
      ? 'Reply in Nepali, matching the script the user wrote (romanized Nepali stays romanized; Devanagari stays Devanagari).'
      : 'Reply in English only. Do not switch to Nepali.';
  const user = `CANONICAL SITE FACTS (authoritative):\n${facts}\n\nSITE CONTENT:\n${
    context || '(no closely matching page found)'
  }\n\nLANGUAGE: ${languageHint}\n\n${transcript}User: ${message}`;

  // Site/team answers need more room than a short legal explanation.
  const isSiteAnswer = sources.some((s) => s.category.startsWith('team') || s.category.startsWith('site-'));
  const raw = await aiChat(SYSTEM_PROMPT, user, {
    // A little warmth without loosening the grounding rules.
    temperature: 0.4,
    maxOutputTokens: isSiteAnswer ? 750 : 480,
  });
  const reply = polishReply(raw ?? '', {
    maxChars: 2200,
    hasHistory: history.length > 0,
    stripGreeting: replyLang === 'en',
  });

  // The model declined because the indexed content did not cover the question.
  // Do not attach the nearest (unrelated) vector hits as sources.
  if (isNoContentReply(reply)) {
    return send({
      reply: noContentReply,
      sources: [],
      aiUsed: true,
    });
  }

  if (isEmptyReply(reply)) {
    // LLM unavailable (quota exhausted / network): degrade instead of
    // erroring — surface the best retrieved content as a grounded fallback.
    if (sources.length) {
      const best = context.split('\n\n')[0]?.replace(/^\[\d+\]\s*/, '') ?? '';
      return send({
        reply: best
          ? `The AI writer is unavailable right now, but here is the closest content on our site:\n\n${polishReply(
              best,
              { maxChars: 900 }
            )}`
          : "The AI writer is unavailable right now, but here are the closest pages on our site — click through for details, or contact us for a proper answer:",
        sources,
        aiUsed: false,
      });
    }
    return send(
      {
        reply: "I couldn't process that just now — please try again in a moment, or contact us directly.",
        sources: [],
      },
      502
    );
  }

  return send({ reply, sources, aiUsed: true });
}
