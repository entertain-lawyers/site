'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Pencil,
  Eye,
  FileText,
  Archive,
  RotateCcw,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { getPublicPostUrl } from '@/lib/post-url';
import type { AdminPostRow } from './PostsTableClient';

interface PostActionDropdownProps {
  post: AdminPostRow;
  role: string;
  wpAdminBase: { en: string; ne: string };
  busy: boolean;
  onUpdateStatus: (
    id: string,
    action: 'PUBLISH' | 'DRAFT' | 'TRASH' | 'DELETE_PERMANENTLY',
    promptMessage?: string
  ) => Promise<void>;
  onDeleteSingle: (post: AdminPostRow) => Promise<void>;
}

export default function PostActionDropdown({
  post,
  role,
  wpAdminBase,
  busy,
  onUpdateStatus,
  onDeleteSingle,
}: PostActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const canEdit = role === 'ADMIN' || role === 'EDITOR';

  const handleActionClick = (actionFn: () => void) => {
    setIsOpen(false);
    actionFn();
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={busy}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 shrink-0 disabled:opacity-50"
      >
        <span>Action</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {canEdit && (
            <Link
              href={`/admin/posts/${post.id}/edit?lang=${post.lang}`}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-text-secondary" />
              <span>Edit</span>
            </Link>
          )}

          <Link
            href={getPublicPostUrl({ id: post.id, type: post.type, lang: post.lang })}
            role="menuitem"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-text-secondary" />
            <span>View</span>
          </Link>

          {post.status !== 'TRASH' && (
            <button
              type="button"
              role="menuitem"
              onClick={() =>
                handleActionClick(() =>
                  onUpdateStatus(
                    post.id,
                    post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISH',
                    post.status === 'PUBLISHED'
                      ? 'Move this post to draft? Visitors will no longer see it until you publish it again.'
                      : undefined
                  )
                )
              }
              className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-text-secondary" />
              <span>{post.status === 'PUBLISHED' ? 'Move to Draft' : 'Publish'}</span>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() =>
              handleActionClick(() =>
                onUpdateStatus(
                  post.id,
                  post.status === 'TRASH' ? 'PUBLISH' : 'TRASH',
                  post.status === 'TRASH'
                    ? undefined
                    : 'Archive this post? It will be moved to trash and hidden from the public site.'
                )
              )
            }
            className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            {post.status === 'TRASH' ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-text-secondary" />
                <span>Restore</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5 text-text-secondary" />
                <span>Archive</span>
              </>
            )}
          </button>

          {wpAdminBase?.[post.lang] && (
            <a
              href={`${wpAdminBase[post.lang]}/wp-admin/post.php?post=${post.id}&action=edit`}
              role="menuitem"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-text-secondary" />
              <span>WP Editor ↗</span>
            </a>
          )}

          {canEdit && (
            <>
              <div className="my-1 border-t border-black/5 dark:border-white/5" />
              <button
                type="button"
                role="menuitem"
                onClick={() => handleActionClick(() => onDeleteSingle(post))}
                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{post.status === 'TRASH' ? 'Delete forever' : 'Delete'}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
