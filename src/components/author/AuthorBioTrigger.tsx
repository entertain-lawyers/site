'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Mail, ShieldCheck, User } from 'lucide-react';

const emptySubscribe = () => () => {};

export interface AuthorInfo {
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  role?: string | null;
  website?: string | null;
  email?: string | null;
  initials?: string | null;
}

export interface AuthorBioTriggerProps {
  author?: AuthorInfo | null;
  /** Size for avatar: 'xs' (20px) | 'sm' (28px) | 'md' (36px) | 'lg' (48px) */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show author name alongside avatar */
  showName?: boolean;
  /** Optional custom class name for the trigger element */
  className?: string;
  /** Optional custom class name for the name label */
  nameClassName?: string;
  /** Language for default labels ('en' | 'ne') */
  lang?: 'en' | 'ne';
  /** Custom children to replace default avatar + name layout */
  children?: React.ReactNode;
}

const DEFAULT_BIO_EN =
  'Entertain Lawyers is Nepal’s trusted legal news and study platform, dedicated to delivering unbiased legal updates, court news, and comprehensive resources for law students and legal professionals.';

const DEFAULT_BIO_NE =
  'Entertain Lawyers नेपालको एक अग्रणी कानुनी समाचार तथा शैक्षिक प्लेटफर्म हो, जसले कानुनी सचेतना, अनुसन्धान र शिक्षाको विकासमा योगदान पुर्याउँदै आएको छ।';

function computeInitials(name?: string | null, fallbackInitials?: string | null): string {
  if (fallbackInitials?.trim()) return fallbackInitials.trim().slice(0, 2).toUpperCase();
  const trimmed = (name || '').trim();
  if (!trimmed) return 'EL';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export default function AuthorBioTrigger({
  author,
  size = 'sm',
  showName = true,
  className = '',
  nameClassName = '',
  lang = 'en',
  children,
}: AuthorBioTriggerProps) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const displayName = author?.name?.trim() || (lang === 'ne' ? 'सम्पादकीय समूह' : 'Entertain Lawyers');
  const initials = computeInitials(author?.name, author?.initials);
  const bio = author?.bio?.trim() || (lang === 'ne' ? DEFAULT_BIO_NE : DEFAULT_BIO_EN);
  const authorImage = author?.image?.trim() || '/logo.jpg';

  const roleLabel = author?.role
    ? author.role === 'ADMIN'
      ? lang === 'ne'
        ? 'प्रशासक'
        : 'Administrator'
      : author.role === 'EDITOR'
      ? lang === 'ne'
        ? 'सम्पादक'
        : 'Editor'
      : author.role
    : lang === 'ne'
    ? 'कानुनी अनुसन्धाता'
    : 'Legal Contributor';

  const sizeClasses = {
    xs: {
      avatar: 'w-5 h-5 text-[9px]',
      gap: 'gap-1.5',
      text: 'text-xs',
    },
    sm: {
      avatar: 'w-7 h-7 text-[11px]',
      gap: 'gap-2',
      text: 'text-sm',
    },
    md: {
      avatar: 'w-9 h-9 text-xs',
      gap: 'gap-2.5',
      text: 'text-base',
    },
    lg: {
      avatar: 'w-12 h-12 text-sm',
      gap: 'gap-3',
      text: 'text-lg',
    },
  }[size];

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={lang === 'ne' ? `${displayName} को परिचय हेर्नुहोस्` : `View short bio of ${displayName}`}
        className={`group relative z-10 inline-flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full transition-all duration-200 cursor-pointer ${sizeClasses.gap} ${className}`}
      >
        {children ? (
          children
        ) : (
          <>
            {authorImage && !imgError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={authorImage}
                alt={displayName}
                onError={() => setImgError(true)}
                className={`${sizeClasses.avatar} rounded-full object-cover border border-accent/40 shadow-xs shrink-0 group-hover:scale-105 group-hover:border-accent transition-transform`}
              />
            ) : (
              <span
                className={`${sizeClasses.avatar} flex items-center justify-center rounded-full bg-navy text-white dark:bg-zinc-800 dark:text-accent font-bold border border-accent/30 shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
                aria-hidden="true"
              >
                {initials}
              </span>
            )}
            {showName && (
              <span
                className={`font-bold text-navy dark:text-white group-hover:text-accent transition-colors ${sizeClasses.text} ${nameClassName}`}
              >
                {displayName}
              </span>
            )}
          </>
        )}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="presentation"
            onClick={handleClose}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={displayName}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200"
            >
              {/* Header decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-gold to-accent" />

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label={lang === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-text-muted hover:text-navy dark:hover:text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Author Overview */}
              <div className="flex flex-col items-center text-center mt-2">
                {authorImage && !modalImgError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={authorImage}
                    alt={displayName}
                    onError={() => setModalImgError(true)}
                    className="w-20 h-20 rounded-full object-cover border-2 border-accent shadow-md mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-navy text-white dark:bg-zinc-800 dark:text-accent flex items-center justify-center text-2xl font-black border-2 border-accent shadow-md mb-3">
                    {initials}
                  </div>
                )}

                <h3 className="text-xl font-black text-navy dark:text-white tracking-tight">
                  {displayName}
                </h3>

                <span className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {roleLabel}
                </span>

                {author?.email && (
                  <span className="mt-2 text-xs text-text-muted flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {author.email}
                  </span>
                )}
              </div>

              {/* Short Bio */}
              <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent" />
                  {lang === 'ne' ? 'छोटो परिचय (Short Bio)' : 'Short Bio'}
                </h4>
                <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                  <p className="text-sm leading-relaxed text-text-secondary dark:text-zinc-300">
                    {bio}
                  </p>
                </div>
              </div>

              {/* Links & Actions */}
              <div className="mt-6 flex items-center justify-between gap-3 pt-2">
                {author?.website ? (
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {lang === 'ne' ? 'वेबसाइट' : 'Website'} &rarr;
                  </a>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-black/10 dark:border-white/10 text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {lang === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
