'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Pencil,
  Eye,
  FileText,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  setResourcePublishedAction,
  setResourceArchivedAction,
  deleteResourceAction,
} from '@/modules/admin/admin-resource.actions';

export interface ResourceActionDropdownProps {
  id: string;
  status: string;
  canDelete?: boolean;
}

export default function ResourceActionDropdown({
  id,
  status,
  canDelete = false,
}: ResourceActionDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPublished = status === 'PUBLISHED';
  const isArchived = status === 'ARCHIVED';

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

  const handleTogglePublish = async () => {
    if (isPublished && !confirm('Move this resource to draft? Students will no longer see it until you publish it again.')) {
      return;
    }
    setLoading(true);
    setIsOpen(false);
    try {
      const res = await setResourcePublishedAction({ id, published: !isPublished });
      if (!res.success) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!isArchived && !confirm('Archive this resource? Students will no longer see it. You can restore it later.')) {
      return;
    }
    setLoading(true);
    setIsOpen(false);
    try {
      const res = await setResourceArchivedAction({ id, archived: !isArchived });
      if (!res.success) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this resource? This will also remove any associated document files.')) {
      return;
    }
    setLoading(true);
    setIsOpen(false);
    try {
      const res = await deleteResourceAction({ id });
      if (!res.success) {
        alert(res.error);
        router.refresh();
      } else {
        if (res.data.filesFailed > 0) {
          alert('The resource was deleted, but its stored PDF could not be removed from file storage. It is logged on the server for manual cleanup.');
        }
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={loading}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 shrink-0 disabled:opacity-50"
      >
        <span>{loading ? 'Working…' : 'Action'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <Link
            href={`/admin/study/resources/${id}/edit`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-text-secondary" />
            <span>Edit</span>
          </Link>

          <Link
            href={`/resources/${id}`}
            role="menuitem"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-text-secondary" />
            <span>View</span>
          </Link>

          {!isArchived && (
            <button
              type="button"
              role="menuitem"
              onClick={handleTogglePublish}
              className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-text-secondary" />
              <span>{isPublished ? 'Move to Draft' : 'Publish'}</span>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={handleToggleArchive}
            className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            {isArchived ? (
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

          {canDelete && (
            <>
              <div className="my-1 border-t border-black/5 dark:border-white/5" />
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
