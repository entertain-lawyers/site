'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { ContentStatus } from '@prisma/client';
import { ACT_CATEGORIES, ActCategoryValue } from '@/modules/acts/act.constants';
import { createActAction, updateActAction } from '@/modules/admin/admin-act.actions';
import PdfUpload from '@/components/admin/PdfUpload';

interface ActFormProps {
  initialData?: {
    id: string;
    title: string;
    titleEn?: string | null;
    slug: string;
    category: string;
    description?: string | null;
    documentUrl?: string | null;
    fileSize?: number | null;
    publishDate?: Date | string | null;
    status: ContentStatus;
  };
  isEdit?: boolean;
}

export default function ActForm({ initialData, isEdit = false }: ActFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(() => {
    // Legacy acts store "English (नेपाली)" in title — show English only.
    const raw = initialData?.title || '';
    return initialData?.titleEn?.trim() || raw.replace(/\s*\([^()]*[\u0900-\u097F][^()]*\)\s*/gu, '').trim();
  });
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [category, setCategory] = useState<ActCategoryValue>(
    (initialData?.category as ActCategoryValue) || 'ACTS'
  );
  const [documentUrl, setDocumentUrl] = useState(initialData?.documentUrl || '');
  const [fileSize, setFileSize] = useState<number | undefined>(initialData?.fileSize || undefined);
  const [publishDate, setPublishDate] = useState(
    initialData?.publishDate
      ? new Date(initialData.publishDate).toISOString().split('T')[0]
      : ''
  );
  const [status, setStatus] = useState<ContentStatus>(initialData?.status || 'PUBLISHED');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit && initialData) {
        const res = await updateActAction({
          id: initialData.id,
          title,
          titleEn: title,
          slug: slug || undefined,
          category,
          documentUrl: documentUrl || undefined,
          fileSize,
          publishDate: publishDate || undefined,
          status,
        });

        if (res?.success) {
          router.push('/admin/acts');
          router.refresh();
        } else {
          setError(res?.error || 'Failed to update act');
          setLoading(false);
        }
      } else {
        const res = await createActAction({
          title,
          titleEn: title,
          slug: slug || undefined,
          category,
          documentUrl: documentUrl || undefined,
          fileSize,
          publishDate: publishDate || undefined,
          status,
        });

        if (res?.success) {
          router.push('/admin/acts');
          router.refresh();
        } else {
          setError(res?.error || 'Failed to create act');
          setLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/acts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-navy dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Acts & Laws
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          {isEdit ? 'Edit Act / Law' : 'Add New Act or Law'}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Upload and organize Acts, Laws, Rules, Ordinances, and historical legal documents.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 dark:border-red-900/50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Title */}
          <div>
            <label htmlFor="act-title" className="block text-sm font-bold text-navy dark:text-white mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="act-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Arbitration Act, 2055"
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm text-navy dark:text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label htmlFor="act-category" className="block text-sm font-bold text-navy dark:text-white mb-2">
                Shortlist Category <span className="text-red-500">*</span>
              </label>
              <select
                id="act-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActCategoryValue)}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm text-navy dark:text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {ACT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="act-status" className="block text-sm font-bold text-navy dark:text-white mb-2">
                Publish Status
              </label>
              <select
                id="act-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm text-navy dark:text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="act-slug" className="block text-sm font-bold text-navy dark:text-white mb-2">
              URL Slug (Optional — auto-generated if left empty)
            </label>
            <input
              id="act-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. constitution-of-nepal"
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm text-navy dark:text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent font-mono text-xs"
            />
          </div>

          {/* Publish / Promulgation Date */}
          <div>
            <label htmlFor="act-date" className="block text-sm font-bold text-navy dark:text-white mb-2">
              Promulgation / Publication Date (Optional)
            </label>
            <input
              id="act-date"
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm text-navy dark:text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* PDF Upload */}
          <div className="border-t border-black/5 dark:border-white/5 pt-6">
            <PdfUpload
              value={documentUrl}
              onChange={(url, size) => {
                setDocumentUrl(url);
                if (size) setFileSize(size);
              }}
              label="Official PDF Document"
              helperText="Upload the official Nepali or English Gazette PDF file (up to 50MB) or link to an external document."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/acts"
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-bold text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                {isEdit ? 'Update Act / Law' : 'Save Act / Law'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
