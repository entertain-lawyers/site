'use client';

import { useState, useRef } from 'react';
import { Crop, Upload, Trash2 } from 'lucide-react';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';
import ImageCropperModal, { CropResult } from './ImageCropperModal';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  type: 'POST' | 'EVENT' | 'GALLERY' | 'PUBLICATION' | 'TEAM';
  label?: string;
  aspectRatio?: number;
}

type AllowedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const ALLOWED_IMAGE_MIME_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function isAllowedImageMimeType(mimeType: string): mimeType is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.has(mimeType);
}

export default function ImageUpload({
  value,
  onChange,
  type,
  label = 'Featured Image',
  aspectRatio,
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const [cropFilename, setCropFilename] = useState('');
  const [cropMimeType, setCropMimeType] = useState('image/jpeg');

  const defaultRatio = aspectRatio || (type === 'TEAM' ? 4 / 5 : 16 / 9);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (!isAllowedImageMimeType(file.type)) {
      setError('Only JPG, PNG, WebP, and GIF images are allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropFilename(file.name);
    setCropMimeType(file.type);
    setCropperOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (result: CropResult) => {
    setCropperOpen(false);
    setLoading(true);
    setError('');

    try {
      // 1. Get presigned URL
      const res = await initiateMediaUploadAction({
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.blob.size,
        type,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to initialize upload');
      }

      // 2. Upload cropped blob directly to storage
      const uploadRes = await fetch(res.data.uploadUrl, {
        method: 'PUT',
        body: result.blob,
        headers: {
          'Content-Type': result.mimeType,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed with status ${uploadRes.status}`);
      }

      // 3. Update the form state with the final public URL
      onChange(res.data.publicUrl);
    } catch (err) {
      console.error('Cropped image upload failed:', err instanceof Error ? err.message : 'Unknown upload error');
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
      if (cropSrc.startsWith('blob:')) {
        URL.revokeObjectURL(cropSrc);
      }
    }
  };

  const handleOpenRecrop = () => {
    if (!value) return;
    setCropSrc(value);
    setCropFilename('photo.jpg');
    setCropMimeType('image/jpeg');
    setCropperOpen(true);
  };

  const handleCloseCropper = () => {
    setCropperOpen(false);
    if (cropSrc.startsWith('blob:')) {
      URL.revokeObjectURL(cropSrc);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-navy dark:text-white">{label}</label>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {loading ? 'Uploading...' : 'Upload & Crop Image'}
        </button>

        {value && (
          <>
            <button
              type="button"
              onClick={handleOpenRecrop}
              disabled={loading}
              className="inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-2 text-xs font-bold text-text-primary rounded-xl hover:border-accent hover:text-accent transition-colors"
            >
              <Crop className="h-3.5 w-3.5" aria-hidden="true" />
              Adjust / Re-crop
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-bold text-xs min-h-[36px]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </>
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
        <div
          className={`mt-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 relative shadow-sm ${
            type === 'TEAM' ? 'max-w-[240px] aspect-[4/5]' : 'aspect-video'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`mt-4 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center bg-slate-50 dark:bg-zinc-950/50 ${
            type === 'TEAM' ? 'max-w-[240px] aspect-[4/5]' : 'aspect-video'
          }`}
        >
          <p className="text-sm font-medium text-text-muted">No image selected</p>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropperOpen && (
        <ImageCropperModal
          key={cropSrc}
          isOpen={cropperOpen}
          imageSrc={cropSrc}
          filename={cropFilename}
          mimeType={cropMimeType}
          defaultAspectRatio={defaultRatio}
          onClose={handleCloseCropper}
          onConfirm={handleCropConfirm}
          title={type === 'TEAM' ? 'Crop Advocate Profile Photo' : 'Crop & Adjust Photo'}
        />
      )}
    </div>
  );
}
