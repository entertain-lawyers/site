'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, ExternalLink, Loader2 } from 'lucide-react';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';

interface PdfUploadProps {
  value: string;
  onChange: (url: string, fileSize?: number) => void;
  label?: string;
  helperText?: string;
}

export default function PdfUpload({
  value,
  onChange,
  label = 'Document PDF',
  helperText = 'Upload a PDF file (up to 50MB) or enter an external document URL.',
}: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [customUrl, setCustomUrl] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be under 50MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const res = await initiateMediaUploadAction({
        filename: file.name,
        mimeType: 'application/pdf',
        size: file.size,
        type: 'ACT',
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to initiate upload');
      }

      setProgress(40);

      // Upload via fetch PUT
      const uploadRes = await fetch(res.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      setProgress(100);
      onChange(res.data.publicUrl, file.size);
      setCustomUrl(res.data.publicUrl);
    } catch (err) {
      console.error('PDF upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onChange('');
    setCustomUrl('');
    setError('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-navy dark:text-white">{label}</label>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`font-semibold px-2 py-1 rounded-md transition-colors ${
              mode === 'upload'
                ? 'bg-accent/15 text-accent dark:text-accent-light'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Upload File
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`font-semibold px-2 py-1 rounded-md transition-colors ${
              mode === 'url'
                ? 'bg-accent/15 text-accent dark:text-accent-light'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            External URL
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              uploading
                ? 'bg-slate-50 border-accent/40 dark:bg-zinc-900/40 cursor-wait'
                : value
                ? 'border-emerald-500/40 bg-emerald-500/[0.03] dark:bg-emerald-950/20 hover:border-emerald-500'
                : 'border-black/10 dark:border-white/10 hover:border-accent bg-slate-50 dark:bg-zinc-900/30'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-accent animate-spin" aria-hidden="true" />
                <p className="text-sm font-bold text-navy dark:text-white">Uploading PDF...</p>
                <div className="w-48 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-accent h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : value ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span>PDF Attached Successfully</span>
                </div>
                <p className="text-xs text-text-muted truncate max-w-md">{value}</p>
                <p className="text-xs text-accent font-semibold hover:underline mt-1">
                  Click to replace file
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-navy dark:text-white">
                    Click to select PDF or drag and drop
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{helperText}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://lawcommission.gov.np/...pdf"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                onChange(e.target.value);
              }}
              className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm text-navy dark:text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {customUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="p-3 text-text-muted hover:text-red-500 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900"
                title="Clear URL"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="text-xs text-text-muted">Enter a direct public URL to the official PDF file.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {value && !uploading && (
        <div className="flex items-center justify-between pt-1">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Preview Attached PDF
          </a>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-600 font-semibold"
          >
            Remove PDF
          </button>
        </div>
      )}
    </div>
  );
}
