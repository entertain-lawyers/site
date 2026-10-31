'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';
import { articleFont } from '@/components/posts/article-font';
import { restoreVideoEmbeds } from '@/lib/editor-html';
import dynamic from 'next/dynamic';
import EditorImageTools from '@/components/editor/EditorImageTools';
import 'react-quill-new/dist/quill.snow.css';

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
  'color', 'background',
  // Used by the image tools to centre/right-align an image's paragraph; the
  // article CSS already styles the resulting ql-align-* classes.
  'align',
];

type AllowedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);
function isAllowedImageMimeType(t: string): t is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.has(t);
}

const QUILL_TOOLBAR_CONTAINER = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['link', 'image', 'video'],
  [{ color: [] }, { background: [] }],
  ['clean'],
];

let _imageHandlerRelay: (() => void) | null = null;

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
      image: () => _imageHandlerRelay?.(),
    },
  },
  clipboard: { matchVisual: false },
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
}: RichTextEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactQuillRef = useRef<any>(null);
  const quillBoxRef = useRef<HTMLDivElement>(null);
  const getQuill = useCallback(() => reactQuillRef.current?.getEditor?.() ?? null, []);
  const [editorFont, setEditorFont] = useState<'english' | 'nepali'>('english');

  // Quill's semantic HTML is what the public article CSS understands (real
  // <ul>/<ol>, no editor-only ql-* classes). It escapes every space as
  // &nbsp;, which would stop preview lines wrapping, so normalise those back.
  const handleChange = useCallback(
    (html: string) => onChange(restoreVideoEmbeds(html).replaceAll('&nbsp;', ' ')),
    [onChange]
  );

  // Build the real image handler as a stable callback so the relay closure
  // holds the latest ref without creating a new relay function.
  const imageHandler = useCallback(() => {
    // The editor loses its selection while the file picker is open, so
    // remember where the cursor was; otherwise the image lands at the top.
    const insertAt = reactQuillRef.current?.getEditor()?.getSelection(true)?.index ?? null;
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
          const index = insertAt ?? editor.getLength() - 1;
          editor.insertEmbed(index, 'image', res.data.publicUrl, 'user');
          editor.setSelection(index + 1, 0, 'user');
        }
      } catch (err) {
        alert('Failed to upload image: ' + (err as Error).message);
      }
    };
  }, []);

  useEffect(() => {
    _imageHandlerRelay = imageHandler;
    return () => {
      _imageHandlerRelay = null;
    };
  }, [imageHandler]);

  const fontFamily =
    editorFont === 'nepali'
      ? 'var(--font-mukta), var(--font-chat-devanagari), "Noto Sans Devanagari", Mukta, sans-serif'
      : 'var(--font-article), Roboto, "Noto Sans Devanagari", sans-serif';

  return (
    <div className={`editor-wrapper ${articleFont.variable} space-y-3`}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .editor-wrapper .ql-editor {
            font-family: ${fontFamily} !important;
            /* Same size/leading as the public reading column so line breaks
               in the editor match the preview. */
            font-size: 1rem !important;
            line-height: 2.25 !important;
            /* Quill's default 15px side padding would make the text column
               narrower than the article, shifting line breaks. */
            padding-left: 0 !important;
            padding-right: 0 !important;
            min-height: 18rem;
          }
          @media (min-width: 768px) {
            .editor-wrapper .ql-editor {
              font-size: 1.125rem !important;
              line-height: 2.14 !important;
            }
          }
          .editor-wrapper .ql-toolbar.ql-snow {
            display: flex !important;
            flex-wrap: wrap;
            border-top-left-radius: 0.75rem;
            border-top-right-radius: 0.75rem;
          }
          /* Images and headings as the article draws them, so the editor's
             line breaks and heights match the preview. */
          .editor-wrapper .ql-editor img {
            cursor: pointer;
            display: block;
            max-width: 100%;
            height: auto;
          }
          .editor-wrapper .ql-editor .ql-video {
            width: 100%;
            height: auto;
            aspect-ratio: 16 / 9;
            border-radius: 0.75rem;
          }
          .editor-wrapper .ql-editor .ql-align-center img { margin-inline: auto; }
          .editor-wrapper .ql-editor .ql-align-right img { margin-left: auto; }
          .editor-wrapper .ql-editor :is(h1, h2, h3, h4, h5, h6) {
            line-height: 1.3 !important;
          }
          .editor-wrapper .ql-editor h1 { font-size: 2em; }
          .editor-wrapper .ql-editor h2 { font-size: 1.75rem; }
          .editor-wrapper .ql-editor h3 { font-size: 1.5rem; }
          .editor-wrapper .ql-editor :is(h4, h5, h6) { font-size: 1.25rem; }
          .editor-wrapper .ql-container.ql-snow {
            border-bottom-left-radius: 0.75rem;
            border-bottom-right-radius: 0.75rem;
          }
        `
      }} />

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

      <div ref={quillBoxRef} className="relative bg-white dark:bg-zinc-950 rounded-xl border border-black/10 dark:border-white/10">
        <ReactQuill
          {...{ ref: reactQuillRef }}
          theme="snow"
          // Uncontrolled: keeping the editor in sync with the parent's HTML on
          // every keystroke makes react-quill re-parse content and reset the
          // cursor. The parent only needs onChange for preview/save.
          defaultValue={value}
          onChange={handleChange}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          placeholder={placeholder}
        />
        <EditorImageTools getQuill={getQuill} containerRef={quillBoxRef} />
      </div>
    </div>
  );
}
