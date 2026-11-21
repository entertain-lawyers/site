'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'motion/react';
import type { ReactionCounts, ReactionType } from '@/lib/reactions';

interface ReactionsProps {
  postId: string;
  postType?: string;
  title?: string;
}

const REACTION_CONFIG: Array<{
  type: ReactionType;
  label: string;
  emoji: string;
}> = [
  { type: 'happy', label: 'Happy', emoji: '😌' },
  { type: 'laugh', label: 'Funny', emoji: '😆' },
  { type: 'love', label: 'Love', emoji: '😍' },
  { type: 'shock', label: 'Shocked', emoji: '😮' },
  { type: 'sad', label: 'Sad', emoji: '😭' },
  { type: 'angry', label: 'Angry', emoji: '😡' },
];

function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('el_reaction_anon_id');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('el_reaction_anon_id', id);
  }
  return id;
}

export default function Reactions({
  postId,
  postType = 'NEWS',
  title = 'How did this make you feel?',
}: ReactionsProps) {
  const [counts, setCounts] = useState<ReactionCounts>({
    happy: 0,
    laugh: 0,
    love: 0,
    shock: 0,
    sad: 0,
    angry: 0,
  });
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAnim, setActiveAnim] = useState<ReactionType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const anonId = getOrCreateAnonId();
        const res = await fetch(
          `/api/reactions?postId=${encodeURIComponent(postId)}&type=${encodeURIComponent(postType)}&anonId=${encodeURIComponent(anonId)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.counts) {
            setCounts(data.counts);
            setUserReaction(data.userReaction);
          }
        }
      } catch (err) {
        console.error('[Reactions] failed to load:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [postId, postType]);

  const handleReact = useCallback(
    async (reaction: ReactionType) => {
      const prevReaction = userReaction;
      const prevCounts = { ...counts };

      // Optimistic update
      setActiveAnim(reaction);
      setTimeout(() => setActiveAnim(null), 600);

      const nextCounts = { ...counts };
      let nextReaction: ReactionType | null = reaction;

      if (prevReaction === reaction) {
        // Toggle off
        nextCounts[reaction] = Math.max(0, nextCounts[reaction] - 1);
        nextReaction = null;
      } else {
        // Increment new
        nextCounts[reaction] = (nextCounts[reaction] || 0) + 1;
        // Decrement previous if existed
        if (prevReaction) {
          nextCounts[prevReaction] = Math.max(0, nextCounts[prevReaction] - 1);
        }
      }

      setUserReaction(nextReaction);
      setCounts(nextCounts);

      try {
        const anonId = getOrCreateAnonId();
        const res = await fetch('/api/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId,
            postType,
            reaction,
            anonId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.counts) {
            setCounts(data.counts);
            setUserReaction(data.userReaction);
          }
        } else {
          // Revert on error
          setUserReaction(prevReaction);
          setCounts(prevCounts);
        }
      } catch (err) {
        console.error('[Reactions] failed to react:', err);
        setUserReaction(prevReaction);
        setCounts(prevCounts);
      }
    },
    [counts, userReaction, postId, postType]
  );

  return (
    <div className="my-10 py-8 px-4 border-y border-border/80 bg-surface/40 dark:bg-zinc-900/40 rounded-2xl text-center">
      <h3 className="text-lg sm:text-xl font-bold text-navy dark:text-white mb-6 tracking-tight">
        {title}
      </h3>

      <div className="inline-flex flex-wrap items-end justify-center gap-4 sm:gap-6 md:gap-7">
        {REACTION_CONFIG.map(({ type, label, emoji }) => {
          const count = counts[type] || 0;
          const isSelected = userReaction === type;
          const isAnimating = activeAnim === type;

          return (
            <div key={type} className="flex flex-col items-center">
              {/* Red Notification Speech Bubble Badge on Top */}
              <div className="relative mb-2 flex justify-center">
                <span className="inline-block bg-[#e50914] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-xs min-w-[20px] text-center leading-none">
                  {count}
                </span>
                {/* Triangular speech bubble tail pointing down */}
                <span
                  className="absolute left-1/2 -bottom-[4px] -translate-x-1/2 w-0 h-0 border-x-[3px] border-x-transparent border-t-[4px] border-t-[#e50914]"
                  aria-hidden="true"
                />
              </div>

              {/* Emoji Reaction Button */}
              <m.button
                type="button"
                onClick={() => handleReact(type)}
                whileHover={{ scale: 1.25, rotate: isSelected ? 0 : [0, -6, 6, 0] }}
                whileTap={{ scale: 0.9 }}
                animate={
                  isAnimating
                    ? { scale: [1, 1.45, 0.9, 1.15, 1], rotate: [0, -10, 10, -5, 0] }
                    : isSelected
                    ? { scale: 1.12 }
                    : { scale: 1 }
                }
                transition={{ duration: 0.35, ease: 'easeOut' }}
                aria-label={`React with ${label}`}
                title={label}
                className={`relative p-2 text-3xl sm:text-4xl select-none cursor-pointer rounded-full transition-all focus:outline-none ${
                  isSelected
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-background bg-accent/10 shadow-sm'
                    : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-90 hover:opacity-100'
                }`}
              >
                {emoji}
              </m.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
