"use client";

import { useEffect, useState } from 'react';

const REACTIONS = [
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'angry', emoji: '😠', label: 'Angry' },
  { key: 'neutral', emoji: '😐', label: 'Neutral' },
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'love', emoji: '😍', label: 'Love' },
  { key: 'wow', emoji: '😲', label: 'Wow' },
] as const;

type ReactionKey = (typeof REACTIONS)[number]['key'];
type Counts = Partial<Record<ReactionKey, number>>;

interface StoredReactions {
  counts: Counts;
  selected: ReactionKey | null;
}

const STORAGE_PREFIX = 'el:reactions:';

/**
 * "How did this news make you feel?" strip, mirroring the news-site pattern.
 * Counts are per-browser (localStorage) — no backend, no tracking.
 */
export default function ArticleReactions({ articleId }: { articleId: string }) {
  const [counts, setCounts] = useState<Counts>({});
  const [selected, setSelected] = useState<ReactionKey | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + articleId);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredReactions;
        if (parsed && typeof parsed === 'object') {
          setCounts(parsed.counts ?? {});
          setSelected(parsed.selected ?? null);
        }
      }
    } catch {
      // Corrupt/blocked storage — start fresh.
    }
    setReady(true);
  }, [articleId]);

  const persist = (next: StoredReactions) => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + articleId, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode) — state still works this session.
    }
  };

  const react = (key: ReactionKey) => {
    const isSame = selected === key;
    const nextCounts: Counts = { ...counts };
    if (selected) {
      nextCounts[selected] = Math.max(0, (nextCounts[selected] ?? 1) - 1);
    }
    if (!isSame) {
      nextCounts[key] = (nextCounts[key] ?? 0) + 1;
    }
    const nextSelected = isSame ? null : key;
    setCounts(nextCounts);
    setSelected(nextSelected);
    persist({ counts: nextCounts, selected: nextSelected });
  };

  const total = Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);

  return (
    <section
      aria-labelledby="reactions-heading"
      className="mt-10 border border-border bg-surface px-4 py-6 sm:px-8 text-center"
    >
      <h2
        id="reactions-heading"
        className="text-sm sm:text-base font-bold text-navy dark:text-white"
      >
        How did this news make you feel?
      </h2>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {REACTIONS.map(({ key, emoji, label }) => {
          const active = selected === key;
          const count = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => react(key)}
              aria-pressed={active}
              aria-label={`React: ${label}${count ? ` (${count})` : ''}`}
              title={label}
              disabled={!ready}
              className={`group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border text-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                active
                  ? 'border-gold bg-gold/15 scale-110'
                  : 'border-border bg-surface-alt hover:border-gold hover:-translate-y-0.5'
              } disabled:opacity-60`}
            >
              <span aria-hidden="true">{emoji}</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] rounded-full bg-navy px-1 text-[10px] font-bold leading-[18px] text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs font-medium text-text-muted" aria-live="polite">
        {total > 0 ? `${total} reaction${total === 1 ? '' : 's'}` : 'Tap an emoji to react'}
      </p>
    </section>
  );
}
