'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, SendHorizonal, Scale } from 'lucide-react';

/**
 * Floating "Kanun Saathi" AI assistant.
 * Grounded in the site's own search index; server enforces per-IP caps and
 * returns a friendly message when AI is disabled or rate limits are hit,
 * so the widget needs no special error states beyond display.
 */

interface Source {
  title: string;
  url: string;
  category: string;
  lang: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface StreamEvent {
  text?: string;
  reply?: string;
  sources?: Source[];
}

/** Parse one `event:`/`data:` frame from the server-sent stream. */
function parseStreamFrame(frame: string): { event: string; data: StreamEvent } | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  if (!data.length) return null;
  try {
    return { event, data: JSON.parse(data.join('\n')) as StreamEvent };
  } catch {
    return null;
  }
}

const QUICK_PROMPTS = [
  'Who is on the Entertain Lawyers team?',
  'How do I contact you?',
  'How is the court fee calculated?',
  'How do I register an FIR in Nepal?',
];

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    'नमस्ते, विद्वान् ज्यू! 🙏 I’m Kanun Saathi (कानुन साथी) — ask me about law notes, case laws, acts, old questions, our team, our services or how to reach us. / कानुनका नोट्स, नजिर, ऐन, हाम्रो टिम वा सम्पर्कबारे सोध्नुहोस्।',
};

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Abort an in-flight stream when the widget unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  function patchLastAssistant(patch: (message: ChatMessage) => ChatMessage) {
    setMessages((prev) => {
      const last = prev.length - 1;
      if (last < 0 || prev[last].role !== 'assistant') return prev;
      const next = [...prev];
      next[last] = patch(next[last]);
      return next;
    });
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    const history = messages
      .filter((m) => m !== GREETING)
      .map(({ role, content }) => ({ role, content }));

    // Add the question and an empty assistant bubble; text is appended as it
    // streams in, so the reply visibly writes itself.
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);
    setInput('');
    setLoading(true);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    let reply = '';
    let sources: Source[] | undefined;
    const apply = (next: string, nextSources?: Source[]) => {
      reply = next;
      if (nextSources) sources = nextSources;
      patchLastAssistant((m) => ({ ...m, content: reply, sources }));
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message, history, stream: true }),
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream') || !res.body) {
        // Older deployment / proxy stripped the stream — fall back to JSON.
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          sources?: Source[];
        };
        apply(
          data.reply ?? 'Something went wrong — please try again, or reach us at +977-9822010737.',
          data.sources
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      while (!finished) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        let split = buffer.indexOf('\n\n');
        while (split !== -1) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const parsed = parseStreamFrame(frame);
          if (parsed?.event === 'delta' && typeof parsed.data.text === 'string') {
            apply(reply + parsed.data.text, sources);
          } else if (parsed?.event === 'done') {
            apply(parsed.data.reply || reply, parsed.data.sources ?? sources);
            finished = true;
          }
          split = buffer.indexOf('\n\n');
        }
      }

      if (!reply.trim()) {
        apply('Something went wrong — please try again, or reach us at +977-9822010737.');
      }
    } catch {
      if (!controller.signal.aborted && !reply.trim()) {
        apply('Network issue — please check your connection and try again.');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Kanun Saathi assistant' : 'Open Kanun Saathi assistant'}
        aria-expanded={open}
        className={`chat-font fixed bottom-5 right-5 z-[30] flex items-center gap-2 rounded-full bg-navy dark:bg-accent/90 text-white dark:text-white pl-4 pr-5 py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${open ? '' : 'el-ai-float'}`}
      >
        {!open && (
          <span
            aria-hidden
            className="el-ai-ring pointer-events-none absolute inset-0 rounded-full border-2 border-gold/70"
          />
        )}
        {open ? (
          <X className="w-5 h-5" strokeWidth={2} />
        ) : (
          <Sparkles className="w-5 h-5 text-gold" strokeWidth={2} />
        )}
        <span className="text-[15px] font-bold tracking-tight">{open ? 'Close' : 'Kanun Saathi'}</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Kanun Saathi assistant"
          className="chat-font fixed bottom-20 right-5 z-[30] w-[calc(100vw-2.5rem)] max-w-[400px] h-[min(620px,74vh)] flex flex-col overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-white dark:bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 dark:border-white/10 bg-slate-50 dark:bg-white/5 shrink-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy dark:bg-accent/20 text-gold shrink-0">
              <Scale className="w-4 h-4" strokeWidth={2} />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-bold text-navy dark:text-gray-100 tracking-tight">Kanun Saathi</p>
              <p className="text-[11px] font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider">
                Legal education assistant
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-grow overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const awaitingFirstWord = m.role === 'assistant' && !m.content && loading && isLast;
              return (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    aria-live={m.role === 'assistant' ? 'polite' : undefined}
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] rounded-xl rounded-br-sm bg-navy dark:bg-accent/80 text-white text-[15px] leading-[1.7] px-3.5 py-2.5'
                        : 'max-w-[92%] rounded-xl rounded-bl-sm bg-slate-50 dark:bg-white/5 border border-border/50 dark:border-white/10 text-text-primary dark:text-gray-200 text-[15px] leading-[1.7] px-3.5 py-2.5 whitespace-pre-wrap'
                    }
                  >
                    {awaitingFirstWord ? (
                      <span className="flex gap-1 py-1" aria-label="Kanun Saathi is thinking">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : (
                      <>
                        {m.content}
                        {m.role === 'assistant' && streaming && isLast && (
                          <span
                            aria-hidden
                            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-accent animate-pulse"
                          />
                        )}
                      </>
                    )}
                    {!!m.sources?.length && !awaitingFirstWord && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.sources.slice(0, 4).map((s) => (
                          <Link
                            key={s.url}
                            href={s.url}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1 max-w-full rounded-md bg-white dark:bg-white/10 border border-border/60 dark:border-white/10 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 truncate"
                          >
                            <span className="truncate">{s.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick prompts (only before first user question) */}
          {messages.length === 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-border/70 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-text-muted dark:text-gray-300 hover:border-accent/40 hover:text-accent transition-colors truncate max-w-full"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border/60 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question… / प्रश्न लेख्नुहोस्…"
                maxLength={1000}
                className="flex-grow min-w-0 rounded-lg border border-border/70 dark:border-white/10 bg-white dark:bg-surface px-3 py-2.5 text-[15px] text-text-primary dark:text-gray-200 placeholder:text-text-muted/60 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send"
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy dark:bg-accent/90 text-white disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
              >
                <SendHorizonal className="w-4 h-4" strokeWidth={2} />
              </button>
            </form>
            <p className="mt-2 text-[11px] leading-relaxed text-text-muted dark:text-gray-500">
              AI answers are for education only, not legal advice. सिफारिशका लागि कानुनविदसँग परामर्श लिनुहोस्।{' '}
              <Link href="/consultation" onClick={() => setOpen(false)} className="font-semibold text-accent hover:underline">
                Book a Consultation
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
