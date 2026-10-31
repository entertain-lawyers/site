'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, ImageIcon, Images, Loader2, Trash2, Upload } from 'lucide-react';
import WordPressMediaLibraryDialog from '@/components/admin/WordPressMediaLibraryDialog';
import type { WordPressLanguage } from '@/lib/wordpress';
import {
  toFeaturedImageSelection,
  validateImageFile,
  WP_MEDIA_ACCEPT,
  WP_MEDIA_MAX_BYTES,
  formatMegabytes,
  type FeaturedImageSelection,
  type WordPressMediaItem,
} from '@/lib/wordpress-media';

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; percent: number; filename: string }
  | { phase: 'processing'; filename: string }
  | { phase: 'done'; filename: string };

const UPLOAD_ENDPOINT = '/api/admin/wordpress/media';

/** POST the file to our upload route, reporting browser -> server progress. */
function uploadToWordPress(
  file: File,
  lang: WordPressLanguage,
  onProgress: (percent: number) => void
): Promise<WordPressMediaItem> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('file', file);
    body.append('lang', lang);
    body.append('title', file.name.replace(/\.[^.]+$/, ''));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_ENDPOINT);
    xhr.responseType = 'json';
    xhr.timeout = 90_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const data = xhr.response as { item?: WordPressMediaItem; error?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && data?.item) resolve(data.item);
      else reject(new Error(data?.error || `Upload failed (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('The upload timed out. Try again, or use a smaller image.'));
    xhr.send(body);
  });
}

/**
 * Featured Image panel of the post editors: upload to, or pick from, the
 * WordPress Media Library of the post's language. The selection is saved as
 * the post's `featured_media` when the post is saved.
 */
export default function FeaturedImagePanel({
  lang,
  value,
  onChange,
  uploadBlockedReason,
  notice,
}: {
  lang: WordPressLanguage;
  value: FeaturedImageSelection | null;
  onChange: (value: FeaturedImageSelection | null) => void;
  /** Set when this deployment may not write to WordPress (Preview, read-only, no credentials). */
  uploadBlockedReason: string | null;
  /** Informational message from the editor (e.g. selection cleared after a language change). */
  notice?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle' });
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const busy = upload.phase === 'uploading' || upload.phase === 'processing';
  const canUpload = !uploadBlockedReason && !busy;

  const startUpload = async (file: File | undefined) => {
    if (!file || !canUpload) return;
    setError('');
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setUpload({ phase: 'uploading', percent: 0, filename: file.name });
    try {
      const item = await uploadToWordPress(file, lang, (percent) =>
        // The bytes are on our server at 100%; WordPress still has to store them.
        setUpload(percent >= 100 ? { phase: 'processing', filename: file.name } : { phase: 'uploading', percent, filename: file.name })
      );
      onChange(toFeaturedImageSelection(item, lang));
      setUpload({ phase: 'done', filename: file.name });
    } catch (err) {
      setUpload({ phase: 'idle' });
      setError(err instanceof Error ? err.message : 'The upload failed.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const chooseFromLibrary = (item: WordPressMediaItem) => {
    setError('');
    setUpload({ phase: 'idle' });
    onChange(toFeaturedImageSelection(item, lang));
    setLibraryOpen(false);
  };

  const remove = () => {
    setError('');
    setUpload({ phase: 'idle' });
    onChange(null);
  };

  const secondaryButton =
    'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-navy transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900 dark:text-white';

  return (
    <div className="space-y-4 rounded-2xl border border-black/5 bg-slate-50 p-6 dark:border-white/5 dark:bg-zinc-950">
      <h3 className="border-b border-black/5 pb-3 font-bold text-navy dark:border-white/10 dark:text-white">Featured Image</h3>

      <input
        ref={inputRef}
        type="file"
        accept={WP_MEDIA_ACCEPT}
        className="hidden"
        onChange={(e) => startUpload(e.target.files?.[0])}
      />

      {value ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
            {value.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.thumbnailUrl || value.url} alt={value.title} className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-xs text-text-secondary">
                Image #{value.id} (preview unavailable)
              </div>
            )}
            <p className="truncate border-t border-black/5 px-3 py-2 text-xs text-text-secondary dark:border-white/10" title={value.title}>
              {value.title}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setLibraryOpen(true)} disabled={busy} className={secondaryButton}>
              <Images className="h-4 w-4" aria-hidden="true" /> Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
            </button>
          </div>
          {!uploadBlockedReason && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="w-full text-center text-xs font-semibold text-accent hover:underline disabled:opacity-50"
            >
              Upload a different image
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            if (!canUpload) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            startUpload(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragging ? 'border-accent bg-accent/5' : 'border-black/10 dark:border-white/10'
          }`}
        >
          <ImageIcon className="h-8 w-8 text-text-muted opacity-60" aria-hidden="true" />
          <p className="text-sm font-semibold text-navy dark:text-white">No featured image</p>
          <p className="text-xs text-text-secondary">
            {uploadBlockedReason
              ? 'Choose an existing image from the Media Library.'
              : `Drop an image here, upload one, or pick from the library. JPEG, PNG, WebP or GIF up to ${formatMegabytes(WP_MEDIA_MAX_BYTES)}.`}
          </p>
        </div>
      )}

      {busy && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="flex min-w-0 items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
              <span className="truncate">
                {upload.phase === 'uploading' ? `Uploading ${upload.filename}` : 'Saving to the WordPress Media Library…'}
              </span>
            </span>
            {upload.phase === 'uploading' && <span className="tabular-nums">{upload.percent}%</span>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className={`h-full rounded-full bg-accent transition-[width] ${upload.phase === 'processing' ? 'w-full animate-pulse' : ''}`}
              style={upload.phase === 'uploading' ? { width: `${upload.percent}%` } : undefined}
            />
          </div>
        </div>
      )}

      {upload.phase === 'done' && !error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400" aria-live="polite">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Uploaded to the Media Library. Save the post to apply it.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {notice && !error && <p className="text-xs text-amber-700 dark:text-amber-400">{notice}</p>}

      {!value && (
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canUpload}
            title={uploadBlockedReason ?? undefined}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden="true" /> Upload Image
          </button>
          <button type="button" onClick={() => setLibraryOpen(true)} disabled={busy} className={secondaryButton}>
            <Images className="h-4 w-4" aria-hidden="true" /> Media Library
          </button>
        </div>
      )}

      {uploadBlockedReason && <p className="text-xs text-text-secondary">Uploading is unavailable: {uploadBlockedReason}</p>}

      <WordPressMediaLibraryDialog
        open={libraryOpen}
        lang={lang}
        selectedId={value?.id ?? null}
        onClose={() => setLibraryOpen(false)}
        onSelect={chooseFromLibrary}
      />
    </div>
  );
}
