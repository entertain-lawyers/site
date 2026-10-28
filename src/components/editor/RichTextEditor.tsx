'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Dynamically import react-quill-new to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// ─── Format whitelist ────────────────────────────────────────────────────────
// Every name here must exist in the Quill 2 registry.
// Quill 2 merged "bullet" into "list" (values: 'ordered' | 'bullet'): listing a
// nonexistent "bullet" format throws "Cannot register …" and breaks paste of
// <ul> content. Only "list" is valid here.
const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'indent',
  'link', 'image', 'video',
  'color', 'background',
];

// ─── Allowed image types ─────────────────────────────────────────────────────
type AllowedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);
function isAllowedImageMimeType(t: string): t is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.has(t);
}

// ─── Stable toolbar config ───────────────────────────────────────────────────
// Defined at module scope so the reference never changes between renders.
// react-quill-new uses lodash isEqual to compare "dirty" props (modules,
// formats, theme …); a new reference triggers destroyEditor() + re-init, which
// physically removes the toolbar from the DOM and causes the "toolbar
// disappearing on paste" bug.
const QUILL_TOOLBAR_CONTAINER = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['link', 'image', 'video'],
  [{ color: [] }, { background: [] }],
  ['clean'],
];

// ─── Module-scope image-handler relay ────────────────────────────────────────
// The toolbar image handler must live inside the modules object so Quill
// registers it at init time — but we need access to the live quill ref which
// only exists inside the component. We bridge this with a relay function stored
// at module scope. Each RichTextEditor instance overwrites it on mount and
// clears it on unmount. (Only one instance is active at a time in the admin.)
let _imageHandlerRelay: (() => void) | null = null;

// The full modules object is also at module scope (immutable reference).
const QUILL_MODULES: {
  toolbar: {
    container: typeof QUILL_TOOLBAR_CONTAINER;
    handlers: { image: () => void };
  };
  clipboard: { matchVisual: boolean };
} = {
  toolbar: {
    container: QUILL_TOOLBAR_CONTAINER,
    handlers: {
      // Quill calls this when the toolbar image button is clicked. It delegates
      // to the relay that points at the live component handler.
      image: () => _imageHandlerRelay?.(),
    },
  },
  // matchVisual: false prevents Quill from replicating visual-only formatting
  // (e.g. font sizes, background colours) when pasting rich text. This reduces
  // the paste processing overhead that was causing perceptible "stutter".
  clipboard: { matchVisual: false },
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
}: RichTextEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactQuillRef = useRef<any>(null);
  const [editorFont, setEditorFont] = useState<'english' | 'nepali'>('english');

  // Build the real image handler as a stable callback so the relay closure
  // holds the latest ref without creating a new relay function.
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
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
        if (!res.success) throw new Error(res.error || 'Upload initialization failed');

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
  }, []); // reactQuillRef is a stable ref object — empty deps is correct.

  // Register this instance's handler in the relay on mount; clear on unmount.
  useEffect(() => {
    _imageHandlerRelay = imageHandler;
    return () => {
      _imageHandlerRelay = null;
    };
  }, [imageHandler]);

  const fontFamily =
    editorFont === 'nepali'
      ? 'var(--font-chat-devanagari), "Noto Sans Devanagari", sans-serif'
      : 'inherit';

  return (
    <div className="editor-wrapper space-y-3">
      {/*
        Inline styles scoped to this instance's wrapper.
        Using a <style> tag with dangerouslySetInnerHTML is intentional here:
        the font-family rule must update when the user switches between English
        and Nepali, and Tailwind's JIT cannot express arbitrary font-family
        values. The rest of the toolbar rules are static and only need to be
        written once — React re-runs innerHTML only when __html changes (i.e.
        only when editorFont changes), so there is no per-keystroke style churn.
      */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .editor-wrapper .ql-editor {
            font-family: ${fontFamily} !important;
            min-height: 18rem;
          }
          .editor-wrapper .ql-toolbar.ql-snow {
            display: flex !important;
            flex-wrap: wrap;
            border-top-left-radius: 0.75rem;
            border-top-right-radius: 0.75rem;
          }
          .editor-wrapper .ql-container.ql-snow {
            border-bottom-left-radius: 0.75rem;
            border-bottom-right-radius: 0.75rem;
          }
        `
      }} />

      {/* Font switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <label className="text-sm font-bold text-navy dark:text-white">Typing Font:</label>
        <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-lg p-1 border border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={() => setEditorFont('english')}
            className={`px-4 py-1.5 min-h-[44px] inline-flex items-center justify-center rounded-md text-sm font-bold transition-all ${
              editorFont === 'english'
                ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
                : 'text-text-muted hover:text-navy dark:hover:text-white'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setEditorFont('nepali')}
            className={`px-4 py-1.5 min-h-[44px] inline-flex items-center justify-center rounded-md text-sm font-bold transition-all ${
              editorFont === 'nepali'
                ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
                : 'text-text-muted hover:text-navy dark:hover:text-white'
            }`}
          >
            नेपाली (Noto)
          </button>
        </div>
      </div>

      {/*
        The outer div intentionally does NOT use overflow-hidden so the Quill
        toolbar is never clipped during layout. The editor itself enforces a
        minimum height via the .ql-editor CSS rule above.
      */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/10 dark:border-white/10">
        <ReactQuill
          {...{ ref: reactQuillRef }}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          placeholder={placeholder}
          /*
           * useSemanticHTML={false}: react-quill-new v3 defaults to calling
           * getSemanticHTML() on every text-change event, which produces a
           * different HTML string than innerHTML on round-trips through
           * dangerouslyPasteHTML. Setting this to false uses innerHTML
           * (same as react-quill v2 behaviour) and eliminates the unnecessary
           * re-parse cycle that can stall the editor after paste.
           */
          useSemanticHTML={false}
        />
      </div>
    </div>
  );
}
