'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, Appear } from '@/components/motion/primitives';

interface Progress {
  processed: number;
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
}

const EMPTY: Progress = { processed: 0, total: 0, embedded: 0, skipped: 0, failed: 0 };

/**
 * Drives the batched `/api/ai/search-index` endpoint until the whole site has
 * been embedded. A "reset" run first clears the vector table so renamed
 * pages/removed posts cannot linger in the index.
 */
export default function RebuildIndexClient() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'incremental' | 'reset' | null>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function note(message: string) {
    setMessages((prev) => [message, ...prev].slice(0, 8));
  }

  async function run(reset: boolean) {
    if (running) return;
    setRunning(true);
    setMode(reset ? 'reset' : 'incremental');
    setError(null);
    setMessages([]);
    setProgress(EMPTY);

    const totals = { embedded: 0, skipped: 0, failed: 0 };
    let offset = 0;
    let total = 0;
    let done = false;
    let first = true;
    let failedHard = false;

    try {
      for (let call = 0; call < 200 && !done; call++) {
        const res = await fetch('/api/ai/search-index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: 40, offset, reset: reset && first }),
        });
        first = false;

        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          total?: number;
          processed?: number;
          embedded?: number;
          skipped?: number;
          failed?: number;
          offset?: number;
          done?: boolean;
        };

        if (!res.ok) {
          failedHard = true;
          setError(data.error || `Request failed (${res.status})`);
          break;
        }

        total = data.total ?? total;
        totals.embedded += data.embedded ?? 0;
        totals.skipped += data.skipped ?? 0;
        totals.failed += data.failed ?? 0;
        offset = data.offset ?? offset;
        done = Boolean(data.done);

        setProgress({ processed: offset, total, ...totals });
        note(`Processed ${offset}/${total} — embedded ${totals.embedded}, skipped ${totals.skipped}${totals.failed ? `, failed ${totals.failed}` : ''}`);

        // Embedding provider failed before saving this batch: stop rather than
        // spin forever on the same offset.
        if (!data.embedded && !data.skipped && !done) {
          failedHard = true;
          setError(
            'The embedding provider returned no vectors. Check GEMINI_API_KEY / quota, then run again — completed items are already saved.'
          );
          break;
        }
      }

      if (done && !failedHard) {
        note(`Index complete — ${totals.embedded} embedded, ${totals.skipped} already up to date.`);
        router.refresh();
      }
    } catch {
      setError('Network error while building the index. Please try again.');
    } finally {
      setRunning(false);
      setMode(null);
    }
  }

  const pct = progress.total ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-navy dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Build the AI knowledge index
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Embeds site pages, team profiles, FAQs, plans, semesters, resources, posts and WordPress
            content so Kanun Saathi can answer questions about the site. Incremental runs skip
            content that has not changed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => run(false)}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-50 text-white px-4 py-2.5 text-sm font-bold transition-colors"
          >
            {running && mode === 'incremental' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Update index
          </button>
          <button
            type="button"
            onClick={() => run(true)}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl border border-border dark:border-white/15 hover:border-accent/50 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-text-secondary dark:text-gray-200 transition-colors"
          >
            {running && mode === 'reset' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Reset &amp; rebuild
          </button>
        </div>
      </div>

      {(running || progress.total > 0) && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary mb-2">
            <span>
              {progress.processed} / {progress.total || '…'} items
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${Math.max(pct, running ? 3 : 0)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 py-2">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{progress.embedded}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700/70 dark:text-emerald-400/70">Embedded</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-white/5 py-2">
              <p className="text-lg font-black text-slate-600 dark:text-gray-300">{progress.skipped}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">Up to date</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 py-2">
              <p className="text-lg font-black text-amber-600 dark:text-amber-400">{progress.failed}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70 dark:text-amber-400/70">Failed</p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
      {error && (
        <Appear key="error">
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
        </Appear>
      )}
      </AnimatePresence>

      {!!messages.length && (
        <div className="mt-4 space-y-1">
          {messages.map((message, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-text-secondary dark:text-gray-400">
              {i === 0 && !running && !error ? (
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
              ) : (
                <span className="w-3.5 h-3.5 mt-1 shrink-0 rounded-full bg-accent/40" />
              )}
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
