'use client';

import { useState, useRef } from 'react';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  type: 'POST' | 'EVENT' | 'GALLERY' | 'PUBLICATION' | 'TEAM';
  label?: string;
}

type AllowedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const ALLOWED_IMAGE_MIME_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function isAllowedImageMimeType(mimeType: string): mimeType is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.has(mimeType);
}

export default function ImageUpload({ value, onChange, type, label = 'Featured Image' }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      if (!isAllowedImageMimeType(file.type)) {
        throw new Error('Only JPG, PNG, WebP, and GIF images are allowed');
      }

      // 1. Get presigned URL
      const res = await initiateMediaUploadAction({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        type,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to initialize upload');
      }

      // 2. Upload file directly to R2 (or local proxy)
      const uploadRes = await fetch(res.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed with status ${uploadRes.status}`);
      }

      // 3. Update the form state with the final public URL
      onChange(res.data.publicUrl);
    } catch (err) {
      console.error('Image upload failed:', err instanceof Error ? err.message : 'Unknown upload error');
      let message = 'An unexpected error occurred during upload';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('fetch failed')) {
          message = 'Unable to connect to storage service. Check network connection, CSP, or CORS settings.';
        } else {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-navy dark:text-white">{label}</label>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="bg-accent hover:bg-accent-dark text-white px-4 py-2.5 min-h-[44px] rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload Image'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-red-500 hover:text-red-700 font-bold text-sm min-h-[44px] inline-flex items-center"
          >
            Remove
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {value ? (
        <div className="mt-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full h-auto object-cover aspect-video" />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 aspect-video flex items-center justify-center bg-slate-50 dark:bg-zinc-950/50">
          <p className="text-sm font-medium text-text-muted">No image selected</p>
        </div>
      )}
    </div>
  );
}
