'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, SendHorizonal, Scale } from 'lucide-react';

/**
 * Floating "Ask IntelliLaw" AI assistant.
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

const QUICK_PROMPTS = [
  'How is the court fee calculated?',
  'How do I register an FIR in Nepal?',
  'पुर्खाको सम्पत्ति बाँडफाँड कसरी गर्ने?',
];

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hello! I'm IntelliLaw. Ask me anything about Nepali law, study material, or our services — I answer from this site's own content. / नमस्ते! यस वेबसाइटको सामग्रीबारे कुनै पनि प्रश्न सोध्नुहोस्।",
};

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    const history = messages
      .filter((m) => m !== GREETING)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        sources?: Source[];
      };
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            data.reply ??
            "Something went wrong — please try again, or reach us at +977-9822010737.",
          sources: data.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Network issue — please check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
        className={`fixed bottom-5 right-5 z-[30] flex items-center gap-2 rounded-full bg-navy dark:bg-accent/90 text-white dark:text-white pl-4 pr-5 py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      >
        {open ? (
          <X className="w-5 h-5" strokeWidth={2} />
        ) : (
          <Sparkles className="w-5 h-5 text-gold" strokeWidth={2} />
        )}
        <span className="text-sm font-bold tracking-tight">{open ? 'Close' : 'Ask AI'}</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="AI assistant"
          className="fixed bottom-20 right-5 z-[30] w-[calc(100vw-2.5rem)] max-w-[380px] h-[min(600px,72vh)] flex flex-col overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-white dark:bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 dark:border-white/10 bg-slate-50 dark:bg-white/5 shrink-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy dark:bg-accent/20 text-gold shrink-0">
              <Scale className="w-4 h-4" strokeWidth={2} />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-navy dark:text-gray-100 tracking-tight">Ask IntelliLaw</p>
              <p className="text-[10px] font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider">
                Legal education assistant
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-grow overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-xl rounded-br-sm bg-navy dark:bg-accent/80 text-white text-[13px] leading-relaxed px-3 py-2'
                      : 'max-w-[92%] rounded-xl rounded-bl-sm bg-slate-50 dark:bg-white/5 border border-border/50 dark:border-white/10 text-text-primary dark:text-gray-200 text-[13px] leading-relaxed px-3 py-2 whitespace-pre-wrap'
                  }
                >
                  {m.content}
                  {!!m.sources?.length && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.sources.slice(0, 4).map((s) => (
                        <Link
                          key={s.url}
                          href={s.url}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 max-w-full rounded-md bg-white dark:bg-white/10 border border-border/60 dark:border-white/10 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/10 truncate"
                        >
                          <span className="truncate">{s.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-bl-sm bg-slate-50 dark:bg-white/5 border border-border/50 dark:border-white/10 px-3 py-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts (only before first user question) */}
          {messages.length === 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-border/70 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2.5 py-1 text-[11px] font-medium text-text-muted dark:text-gray-300 hover:border-accent/40 hover:text-accent transition-colors truncate max-w-full"
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
                className="flex-grow min-w-0 rounded-lg border border-border/70 dark:border-white/10 bg-white dark:bg-surface px-3 py-2 text-[13px] text-text-primary dark:text-gray-200 placeholder:text-text-muted/60 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
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
            <p className="mt-1.5 text-[10px] leading-snug text-text-muted dark:text-gray-500">
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
