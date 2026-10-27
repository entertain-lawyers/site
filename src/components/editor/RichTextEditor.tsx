'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill styles

// Dynamically import react-quill-new to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Format whitelist — every name here must exist in the Quill 2 registry.
// Quill 2 merged "bullet" into "list" (values: 'ordered' | 'bullet'): listing a
// nonexistent "bullet" format makes the editor throw "Cannot register …" and
// break while processing pasted content (e.g. <ul> lists). Only "list" is valid.
const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'indent',
  'link', 'image', 'video',
  'color', 'background'
];

type AllowedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const ALLOWED_IMAGE_MIME_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function isAllowedImageMimeType(mimeType: string): mimeType is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.has(mimeType);
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write your content here...' }: RichTextEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactQuillRef = useRef<any>(null);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      try {
        if (!isAllowedImageMimeType(file.type)) {
          throw new Error('Only JPG, PNG, WebP, and GIF images are allowed');
        }

        const res = await initiateMediaUploadAction({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          type: 'RICH_TEXT',
        });

        if (!res.success) {
          throw new Error(res.error || 'Upload initialization failed');
        }

        const uploadRes = await fetch(res.data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) throw new Error('Failed to upload file');

        const editor = reactQuillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection();
          editor.insertEmbed(range ? range.index : 0, 'image', res.data.publicUrl);
        }
      } catch (err) {
        alert('Failed to upload image: ' + (err as Error).message);
      }
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video'],
        [{ color: [] }, { background: [] }],
        ['clean'],
      ],
      handlers: {
        image: imageHandler,
      }
    }
  }), [imageHandler]);

  // Reconstructing the array each render gives ReactQuill a new reference via
  // dirtyProps deep-compare (isEqual), but a stable constant avoids any churn.
  const formats = QUILL_FORMATS;

  const [editorFont, setEditorFont] = useState<'english' | 'nepali'>('english');

  return (
    <div className="editor-wrapper space-y-3">
      <style dangerouslySetInnerHTML={{ __html: `
        .editor-wrapper .ql-editor {
          font-family: ${editorFont === 'nepali' ? 'var(--font-chat-devanagari), "Noto Sans Devanagari", sans-serif' : 'inherit'} !important;
        }
        .editor-wrapper .ql-toolbar {
          display: flex;
          flex-wrap: wrap;
        }
        .editor-wrapper .ql-toolbar::-webkit-scrollbar {
          height: 4px;
        }
        .editor-wrapper .ql-toolbar::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .dark .editor-wrapper .ql-toolbar::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.1);
        }
      `}} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <label className="text-sm font-bold text-navy dark:text-white">Typing Font:</label>
        <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-lg p-1 border border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={() => setEditorFont('english')}
            className={`px-4 py-1.5 min-h-[44px] inline-flex items-center justify-center rounded-md text-sm font-bold transition-all ${editorFont === 'english' ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm' : 'text-text-muted hover:text-navy dark:hover:text-white'}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setEditorFont('nepali')}
            className={`px-4 py-1.5 min-h-[44px] inline-flex items-center justify-center rounded-md text-sm font-bold transition-all ${editorFont === 'nepali' ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm' : 'text-text-muted hover:text-navy dark:hover:text-white'}`}
          >
            नेपाली (Noto)
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-950 rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
      <ReactQuill
        {...{ref: reactQuillRef}}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="h-96"
      />
      </div>
    </div>
  );
}
