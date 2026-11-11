'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';
import { articleFont } from '@/components/posts/article-font';
import { restoreVideoEmbeds } from '@/lib/editor-html';
import { insertClipboardContent } from '@/lib/editor-clipboard';
import { syncListLineHeights } from '@/lib/editor-line-height';
import dynamic from 'next/dynamic';
import EditorImageTools from '@/components/editor/EditorImageTools';
import 'react-quill-new/dist/quill.snow.css';

// Custom attributors (wrap, lineheight) must exist before ReactQuill constructs Quill,
// so they are loaded (browser-only) in the same dynamic loader.
const ReactQuill = dynamic(
  async () => {
    await import('@/components/editor/quill-image-wrap');
    await import('@/components/editor/quill-line-height');
    return (await import('react-quill-new')).default;
  },
  { ssr: false }
);

type ScrollMode = 'fill-height' | 'document';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fillHeight?: boolean;
  scrollMode?: ScrollMode;
  className?: string;
}

// Format whitelist — every name here must exist in the Quill 2 registry.
// Quill 2 merged "bullet" into "list" (values: 'ordered' | 'bullet'): listing a
// nonexistent "bullet" format makes the editor throw "Cannot register …" and
// break while processing pasted content (e.g. <ul> lists). Only "list" is valid.
const QUILL_FORMATS = [
  'header',
  'lineheight',
  'bold', 'italic', 'underline', 'strike',
  // Superscript/subscript (e.g. "7th Semester" pasted from Word/Writer).
  'script',
  'list', 'indent',
  'link', 'image', 'video',
  'color', 'background',
  // Used by the image tools to centre/float an image; the article CSS styles
  // the resulting el-wrap-* class and the ql-align-* paragraph classes.
  'align',
  // Floats an image so text wraps beside it (src/components/editor/quill-image-wrap.ts).
  'wrap',
];

type AllowedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);
function isAllowedImageMimeType(t: string): t is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.has(t);
}

const QUILL_TOOLBAR_CONTAINER = [
  [
    { header: [1, 2, 3, 4, 5, 6, false] },
    { lineheight: ['1.0', '1.15', '1.5', '1.75', '2.0', false] },
  ],
  ['bold', 'italic', 'underline', 'strike'],
  [{ script: 'super' }, { script: 'sub' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  // Individual align buttons (left/center/right/justify); "align" is already
  // in QUILL_FORMATS for the image tools.
  [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
  ['link', 'image', 'video'],
  [{ color: [] }, { background: [] }],
  ['clean'],
];

let _imageHandlerRelay: (() => void) | null = null;

// Node.TEXT_NODE; a literal because this module is also evaluated on the server.
const TEXT_NODE = 3;
type PasteDelta = { ops: Array<{ insert?: unknown }> };

/**
 * Word and LibreOffice Writer wrap long lines in their HTML, so the text after
 * a <br> starts with a newline that Quill turns into a leading space. Drop
 * whitespace at the start of a line that follows a line break.
 */
function trimAfterLineBreak(node: Node, delta: PasteDelta): PasteDelta {
  if (node.previousSibling?.nodeName !== 'BR') return delta;
  const first = delta.ops[0];
  if (first && typeof first.insert === 'string') {
    first.insert = first.insert.replace(/^\s+/, '');
    if (first.insert === '') delta.ops.shift();
  }
  return delta;
}

/**
 * LibreOffice Writer exports an empty paragraph as <p><br/><br/></p>, which
 * Quill would turn into two blank lines; the document showed one.
 */
function oneBlankLinePerEmptyParagraph(node: Node, delta: PasteDelta): PasteDelta {
  const el = node as Element;
  if (el.textContent?.trim() || el.querySelector?.('img, iframe, video')) return delta;
  delta.ops = [{ insert: '\n' }];
  return delta;
}

const QUILL_MODULES: {
  toolbar: {
    container: typeof QUILL_TOOLBAR_CONTAINER;
    handlers: { image: () => void };
  };
  clipboard: { matchVisual: boolean; matchers: Array<[number | string, (node: Node, delta: PasteDelta) => PasteDelta]> };
} = {
  toolbar: {
    container: QUILL_TOOLBAR_CONTAINER,
    handlers: {
      image: () => _imageHandlerRelay?.(),
    },
  },
  clipboard: {
    matchVisual: false,
    matchers: [
      [TEXT_NODE, trimAfterLineBreak],
      ['p', oneBlankLinePerEmptyParagraph],
    ],
  },
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  fillHeight = false,
  scrollMode = 'fill-height',
  className = '',
}: RichTextEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactQuillRef = useRef<any>(null);
  const quillBoxRef = useRef<HTMLDivElement>(null);
  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDocumentMode = scrollMode === 'document';

  // In document-scroll mode the Quill toolbar sticks directly below the
  // sticky font-selector row, so its `top` offset must equal the row's real
  // rendered height (fonts, wrapping, and mobile stacking change it). A fixed
  // rem guess would leave a gap (page background showing through) or overlap,
  // so the row is measured and published as a CSS variable, live-updated.
  useEffect(() => {
    if (!isDocumentMode) return;
    const row = toolbarRowRef.current;
    const wrapper = wrapperRef.current;
    const apply = () => {
      if (row && wrapper) {
        wrapper.style.setProperty('--editor-toolbar-row-h', `${row.offsetHeight}px`);
      }
    };
    apply();
    if (!row) return;
    const observer = new ResizeObserver(apply);
    observer.observe(row);
    return () => {
      observer.disconnect();
      if (wrapper) wrapper.style.removeProperty('--editor-toolbar-row-h');
    };
  }, [isDocumentMode]);

  const getQuill = useCallback(() => reactQuillRef.current?.getEditor?.() ?? null, []);
  const [editorFont, setEditorFont] = useState<'english' | 'nepali'>('english');

  // Quill's semantic HTML is what the public article CSS understands (real
  // <ul>/<ol>, no editor-only ql-* classes). It escapes every space as
  // &nbsp;, which would stop preview lines wrapping, so normalise those back.
  // Preserves block line-height styles on lists (which Quill's semantic HTML drops).
  const handleChange = useCallback(
    (html: string) => {
      const editor = reactQuillRef.current?.getEditor?.();
      const withListStyles = editor?.root ? syncListLineHeights(html, editor.root) : html;
      onChange(restoreVideoEmbeds(withListStyles).replaceAll('&nbsp;', ' '));
    },
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

  // Hook rich paste (Ctrl+Shift+V and Ctrl+V) and attach toolbar tooltips
  useEffect(() => {
    let cancelled = false;
    let cleanupListeners: (() => void) | null = null;

    const setup = () => {
      if (cancelled) return;
      const editor = reactQuillRef.current?.getEditor?.();
      if (!editor || !editor.root) {
        requestAnimationFrame(setup);
        return;
      }

      const root: HTMLElement = editor.root;

      // Handle Ctrl+Shift+V / Cmd+Shift+V to preserve rich formatting from clipboard
      const handleKeyDown = async (e: KeyboardEvent) => {
        const isPasteCombo = (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V' || e.code === 'KeyV');
        if (isPasteCombo && e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();

          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.read === 'function') {
            try {
              const items = await navigator.clipboard.read();
              let html = '';
              let text = '';
              for (const item of items) {
                if (item.types.includes('text/html')) {
                  const blob = await item.getType('text/html');
                  html = await blob.text();
                }
                if (item.types.includes('text/plain')) {
                  const blob = await item.getType('text/plain');
                  text = await blob.text();
                }
              }
              if (html || text) {
                insertClipboardContent(editor, { html, text });
                return;
              }
            } catch {
              try {
                const text = await navigator.clipboard.readText();
                if (text) {
                  insertClipboardContent(editor, { text });
                  return;
                }
              } catch {}
            }
          }
        }
      };

      // Capture standard paste events (Ctrl+V, context menu) to sanitize and preserve formatting
      const handlePasteCapture = (e: ClipboardEvent) => {
        const html = e.clipboardData?.getData('text/html');
        const text = e.clipboardData?.getData('text/plain');
        if (html || text) {
          e.preventDefault();
          e.stopImmediatePropagation();
          insertClipboardContent(editor, { html, text });
        }
      };

      root.addEventListener('keydown', handleKeyDown, true);
      root.addEventListener('paste', handlePasteCapture, true);

      // Attach accessible tooltips and titles to toolbar controls
      const container = quillBoxRef.current;
      let cleanupPickerEvents: (() => void) | null = null;
      if (container) {
        const TOOLBAR_TOOLTIPS: Array<[string, string]> = [
          ['.ql-bold', 'Bold (Ctrl+B)'],
          ['.ql-italic', 'Italic (Ctrl+I)'],
          ['.ql-underline', 'Underline (Ctrl+U)'],
          ['.ql-strike', 'Strikethrough'],
          ['.ql-script[value="super"]', 'Superscript'],
          ['.ql-script[value="sub"]', 'Subscript'],
          ['.ql-list[value="ordered"]', 'Numbered list'],
          ['.ql-list[value="bullet"]', 'Bullet list'],
          ['.ql-indent[value="-1"]', 'Decrease indent'],
          ['.ql-indent[value="+1"]', 'Increase indent'],
          ['.ql-link', 'Insert link'],
          ['.ql-image', 'Insert image'],
          ['.ql-video', 'Insert video embed'],
          ['.ql-clean', 'Clear formatting'],
          ['.ql-header', 'Heading style'],
          ['.ql-lineheight', 'Line spacing'],
          ['.ql-lineheight .ql-picker-label', 'Line spacing'],
          ['.ql-color', 'Text color'],
          ['.ql-background', 'Highlight color'],
        ];
        for (const [selector, title] of TOOLBAR_TOOLTIPS) {
          const el = container.querySelector(selector);
          if (el && !el.getAttribute('title')) {
            el.setAttribute('title', title);
            el.setAttribute('aria-label', title);
          }
        }

        // Accessible labels on line-height picker options
        const LINE_HEIGHT_LABELS: Record<string, string> = {
          '1.0': 'Single (1.0)',
          '1.15': '1.15',
          '1.5': '1.5',
          '1.75': '1.75',
          '2.0': 'Double (2.0)',
        };
        const items = container.querySelectorAll<HTMLElement>('.ql-picker.ql-lineheight .ql-picker-item');
        items.forEach((item) => {
          const val = item.getAttribute('data-value');
          const label = val ? (LINE_HEIGHT_LABELS[val] || val) : 'Default / Reset';
          if (!item.getAttribute('title')) {
            item.setAttribute('title', label);
            item.setAttribute('aria-label', label);
          }
        });

        // Accessible keyboard navigation for line spacing picker
        const linePicker = container.querySelector<HTMLElement>('.ql-picker.ql-lineheight');
        if (linePicker) {
          const onPickerKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const isLabel = target.classList.contains('ql-picker-label');
            const isItem = target.classList.contains('ql-picker-item');

            if (isLabel && (e.key === 'ArrowDown' || e.key === ' ')) {
              e.preventDefault();
              if (!linePicker.classList.contains('ql-expanded')) {
                target.click();
              }
              setTimeout(() => {
                const selected =
                  linePicker.querySelector<HTMLElement>('.ql-picker-item.ql-selected') ||
                  linePicker.querySelector<HTMLElement>('.ql-picker-item');
                selected?.focus();
              }, 10);
              return;
            }

            if (isItem) {
              const optionItems = Array.from(
                linePicker.querySelectorAll<HTMLElement>('.ql-picker-item')
              );
              const idx = optionItems.indexOf(target);

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = (idx + 1) % optionItems.length;
                optionItems[next]?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = (idx - 1 + optionItems.length) % optionItems.length;
                optionItems[prev]?.focus();
              } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                target.click();
              }
            }
          };

          linePicker.addEventListener('keydown', onPickerKeyDown);
          cleanupPickerEvents = () => linePicker.removeEventListener('keydown', onPickerKeyDown);
        }
      }

      cleanupListeners = () => {
        root.removeEventListener('keydown', handleKeyDown, true);
        root.removeEventListener('paste', handlePasteCapture, true);
        cleanupPickerEvents?.();
      };
    };

    setup();

    return () => {
      cancelled = true;
      cleanupListeners?.();
    };
  }, []);

  const fontFamily =
    editorFont === 'nepali'
      ? 'var(--font-mukta), var(--font-chat-devanagari), "Noto Sans Devanagari", Mukta, sans-serif'
      : 'var(--font-article), Roboto, "Noto Sans Devanagari", sans-serif';

  return (
    <div
      ref={wrapperRef}
      className={`editor-wrapper ${articleFont.variable} space-y-3 ${
        isDocumentMode
          ? 'document-scroll-mode'
          : fillHeight
          ? 'fill-height flex-1 flex flex-col min-h-0 h-full'
          : ''
      } ${className}`.trim()}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Toolbar: Sticky at top of editor container with glassmorphic backdrop */
          .editor-wrapper .ql-toolbar.ql-snow {
            position: sticky !important;
            top: 0 !important;
            z-index: 20 !important;
            background: rgba(248, 250, 252, 0.96) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
            border-top-left-radius: 1rem !important;
            border-top-right-radius: 1rem !important;
            padding: 0.5rem 0.75rem !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 0.25rem 0.35rem !important;
          }
          .dark .editor-wrapper .ql-toolbar.ql-snow {
            background: rgba(24, 24, 27, 0.96) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            border-bottom-color: rgba(255, 255, 255, 0.08) !important;
          }

          /* Toolbar Groups & Logical Dividers */
          .editor-wrapper .ql-toolbar.ql-snow .ql-formats {
            display: inline-flex !important;
            align-items: center !important;
            margin-right: 0.5rem !important;
            padding-right: 0.5rem !important;
            border-right: 1px solid rgba(0, 0, 0, 0.1) !important;
          }
          .dark .editor-wrapper .ql-toolbar.ql-snow .ql-formats {
            border-right-color: rgba(255, 255, 255, 0.12) !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-formats:last-child {
            border-right: none !important;
            margin-right: 0 !important;
            padding-right: 0 !important;
          }

          /* Toolbar Button States */
          .editor-wrapper .ql-toolbar.ql-snow button {
            width: 32px !important;
            height: 32px !important;
            padding: 4px !important;
            border-radius: 0.5rem !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.15s ease !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow button:hover {
            background: rgba(0, 0, 0, 0.06) !important;
          }
          .dark .editor-wrapper .ql-toolbar.ql-snow button:hover {
            background: rgba(255, 255, 255, 0.1) !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow button.ql-active {
            background: rgba(14, 165, 233, 0.14) !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow button.ql-active .ql-stroke {
            stroke: #0284c7 !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow button.ql-active .ql-fill {
            fill: #0284c7 !important;
          }

          /* Dropdown Pickers */
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker {
            height: 32px !important;
            border-radius: 0.5rem !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker-label {
            padding: 4px 8px !important;
            border-radius: 0.5rem !important;
            font-weight: 600 !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker-options {
            border-radius: 0.75rem !important;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
            padding: 6px !important;
            z-index: 30 !important;
          }
          .dark .editor-wrapper .ql-toolbar.ql-snow .ql-picker-options {
            background: #18181b !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          /* Line Spacing Dropdown Picker */
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight {
            width: 140px !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label::before,
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-item::before {
            content: 'Default' !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label:not([data-value])::before {
            content: 'Line Spacing' !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-item:not([data-value])::before {
            content: 'Default / Reset' !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label:is([data-value="1.0"], [data-value="1"])::before,
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-item:is([data-value="1.0"], [data-value="1"])::before {
            content: '1.0 (Single)' !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1.15"]::before,
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1.15"]::before {
            content: '1.15' !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1.5"]::before,
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1.5"]::before {
            content: '1.5' !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1.75"]::before,
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1.75"]::before {
            content: '1.75' !important;
          }
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-label:is([data-value="2.0"], [data-value="2"])::before,
          .editor-wrapper .ql-toolbar.ql-snow .ql-picker.ql-lineheight .ql-picker-item:is([data-value="2.0"], [data-value="2"])::before {
            content: '2.0 (Double)' !important;
          }

          /* Container & Canvas */
          .editor-wrapper .ql-container.ql-snow {
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
            border-top: none !important;
            border-bottom-left-radius: 1rem !important;
            border-bottom-right-radius: 1rem !important;
            background: #ffffff !important;
          }
          .dark .editor-wrapper .ql-container.ql-snow {
            border-color: rgba(255, 255, 255, 0.1) !important;
            background: #09090b !important;
          }

          /* Editor Writing Surface (non-fill-height mode) */
          .editor-wrapper .ql-editor {
            font-family: ${fontFamily} !important;
            font-size: 1.05rem !important;
            line-height: 2;
            padding: 1.75rem 2rem !important;
            min-height: 24rem !important;
            max-height: clamp(28rem, 72vh, 48rem) !important;
            overflow-y: auto !important;
            overscroll-behavior-y: contain !important;
          }

          /* Fill-height mode: editor stretches nicely alongside sidebar with smooth internal scrolling */
          .editor-wrapper.fill-height {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            height: 100% !important;
          }
          .editor-wrapper.fill-height .editor-toolbar-row {
            flex: 0 0 auto !important;
          }
          .editor-wrapper.fill-height .quill-box-container {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          .editor-wrapper.fill-height .quill {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 0% !important;
            min-height: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          .editor-wrapper.fill-height .ql-container.ql-snow {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 0% !important;
            min-height: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
            border-radius: 0 !important;
            border-bottom-left-radius: 1rem !important;
            border-bottom-right-radius: 1rem !important;
          }
          .editor-wrapper.fill-height .ql-editor {
            flex: 1 1 0% !important;
            min-height: 0 !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow-y: auto !important;
            overscroll-behavior-y: contain !important;
            border-radius: 0 !important;
            border-bottom-left-radius: 1rem !important;
            border-bottom-right-radius: 1rem !important;
          }
          /* Fill mode floor: when an ancestor region must scroll (e.g. the
             resource form's metadata panel on short viewports) the flex chain
             refuses to shrink below this, so the canvas stays usable. */
          @media (min-width: 768px) {
            .editor-wrapper.fill-height .ql-editor {
              min-height: clamp(14rem, 30vh, 44rem) !important;
            }
          }
          /* Below md, fill wrappers size naturally with the flowing page; keep
             a comfortable base canvas height for touch use. */
          @media (max-width: 767px) {
            .editor-wrapper.fill-height .ql-editor {
              min-height: 24rem !important;
            }
          }
          /* Below lg the page itself is the scroll container; let the Quill
             toolbar escape the fill-height overflow chain so it can stick to
             the viewport under the fixed admin top bar. */
          @media (max-width: 1023px) {
            .editor-wrapper.fill-height .quill-box-container,
            .editor-wrapper.fill-height .quill,
            .editor-wrapper.fill-height .ql-container.ql-snow {
              overflow: visible !important;
            }
            .editor-wrapper.fill-height .ql-toolbar.ql-snow {
              top: 4rem !important;
            }
          }
          /* Desktop: while the region containing the editor scrolls (resource
             form card), keep the font selector pinned above the canvas. Where
             nothing scrolls (posts workspace), sticky is inert. */
          @media (min-width: 1024px) {
            .editor-wrapper.fill-height .editor-toolbar-row {
              position: sticky !important;
              top: 0 !important;
              z-index: 30 !important;
              background: rgb(248 250 252 / 0.95) !important;
              backdrop-filter: blur(8px) !important;
              -webkit-backdrop-filter: blur(8px) !important;
            }
            .dark .editor-wrapper.fill-height .editor-toolbar-row {
              background: rgb(24 24 27 / 0.95) !important;
            }
            /* Pin Quill's toolbar just below the font selector row so they
               stack instead of overlapping in scrollable regions. */
            .editor-wrapper.fill-height .ql-toolbar.ql-snow {
              top: 2.75rem !important;
            }
          }
          /* Desktop: writing canvas fills remaining space, never below the 560px target floor */
          @media (min-width: 768px) {
            .editor-wrapper:not(.fill-height) .ql-editor {
              min-height: clamp(35rem, 65vh, 44rem) !important;
              max-height: clamp(35rem, 70vh, 46rem) !important;
            }
          }
          @media (min-width: 640px) {
            .editor-wrapper .ql-editor {
              padding: 2.25rem 2.75rem !important;
            }
          }
          @media (min-width: 768px) {
            .editor-wrapper .ql-editor {
              font-size: 1.125rem !important;
              line-height: 2.14;
            }
          }

          /* Typography Hierarchy */
          .editor-wrapper .ql-editor :is(h1, h2, h3, h4, h5, h6):not([style*="line-height"]) {
            line-height: 1.3 !important;
          }
          .editor-wrapper .ql-editor :is(h1, h2, h3, h4, h5, h6) {
            font-weight: 800 !important;
            margin-top: 1.5rem !important;
            margin-bottom: 0.75rem !important;
          }
          .editor-wrapper .ql-editor h1 { font-size: 2rem !important; }
          .editor-wrapper .ql-editor h2 { font-size: 1.65rem !important; }
          .editor-wrapper .ql-editor h3 { font-size: 1.35rem !important; }
          .editor-wrapper .ql-editor :is(h4, h5, h6) { font-size: 1.15rem !important; }

          .editor-wrapper .ql-editor blockquote {
            border-left: 4px solid #0284c7 !important;
            padding-left: 1rem !important;
            margin: 1.25rem 0 !important;
            font-style: italic !important;
            color: #475569 !important;
          }
          .dark .editor-wrapper .ql-editor blockquote {
            color: #94a3b8 !important;
          }

          .editor-wrapper .ql-editor a {
            color: #0284c7 !important;
            text-decoration: underline !important;
            text-underline-offset: 3px !important;
          }

          /* Images & Wrapping */
          .editor-wrapper .ql-editor img {
            cursor: pointer;
            display: block;
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
          }
          .editor-wrapper .ql-editor .el-wrap-left img {
            float: left;
            max-width: 60%;
            margin: 0.25rem 1.25rem 1rem 0;
          }
          .editor-wrapper .ql-editor .el-wrap-right img {
            float: right;
            max-width: 60%;
            margin: 0.25rem 0 1rem 1.25rem;
          }
          .editor-wrapper .ql-editor .el-wrap-center img {
            display: block;
            float: none;
            clear: both;
            margin-inline: auto;
          }
          @media (max-width: 639px) {
            .editor-wrapper .ql-editor :is(.el-wrap-left, .el-wrap-right) img {
              float: none;
              max-width: 100%;
              margin: 0 0 1rem;
            }
          }
          .editor-wrapper .ql-editor .ql-video {
            width: 100%;
            height: auto;
            aspect-ratio: 16 / 9;
            border-radius: 0.75rem;
          }
          .editor-wrapper .ql-editor .ql-align-center img { margin-inline: auto; }
          .editor-wrapper .ql-editor .ql-align-right img { margin-left: auto; }

          /* ============================================================
             DOCUMENT-SCROLL MODE
             ============================================================
             In this mode the editor grows naturally with content. The page
             scrolls, not the .ql-editor. The toolbar row + Quill toolbar
             become sticky at the top of the viewport (accounting for the
             fixed admin header on mobile/tablet) and stop sticking at the
             bottom boundary of the editor container.
          ============================================================ */

          /* Document-scroll wrapper: natural flow, no forced heights */
          .editor-wrapper.document-scroll-mode {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            flex: none !important;
          }
          .editor-wrapper.document-scroll-mode .editor-toolbar-row {
            flex: 0 0 auto !important;
          }
          .editor-wrapper.document-scroll-mode .quill-box-container {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            flex: none !important;
          }
          .editor-wrapper.document-scroll-mode .quill {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            flex: none !important;
          }
          .editor-wrapper.document-scroll-mode .ql-container.ql-snow {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            flex: none !important;
            border-radius: 1rem !important;
          }

          /* In document mode, .ql-editor grows naturally with content */
          .editor-wrapper.document-scroll-mode .ql-editor {
            flex: none !important;
            height: auto !important;
            min-height: 24rem !important;
            max-height: none !important;
            overflow: visible !important;
            overscroll-behavior-y: auto !important;
            border-radius: 0 !important;
            border-bottom-left-radius: 1rem !important;
            border-bottom-right-radius: 1rem !important;
          }
          @media (min-width: 768px) {
            .editor-wrapper.document-scroll-mode .ql-editor {
              min-height: 35rem !important;
            }
          }

          /* Sticky toolbar stack in document-scroll mode.
             The editor-toolbar-row (font selector) sits above the Quill toolbar.
             Both become sticky together within the editor-wrapper boundary. */
          .editor-wrapper.document-scroll-mode .editor-toolbar-row {
            position: sticky !important;
            top: 0 !important;
            z-index: 30 !important;
            background: rgb(248 250 252 / 0.98) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
          }
          .dark .editor-wrapper.document-scroll-mode .editor-toolbar-row {
            background: rgb(24 24 27 / 0.98) !important;
            border-bottom-color: rgba(255, 255, 255, 0.08) !important;
          }

          /* Quill toolbar sticks just below the font selector row. The offset
             is the row's measured height (--editor-toolbar-row-h, set from JS
             with a rem fallback), so the two rows always touch without
             overlapping or leaving a page-background gap between them. */
          .editor-wrapper.document-scroll-mode .ql-toolbar.ql-snow {
            position: sticky !important;
            top: var(--editor-toolbar-row-h, 2.75rem) !important;
            z-index: 25 !important;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
            border-top: none !important;
          }

          /* Mobile/Tablet: account for fixed admin top bar (64px = 4rem) */
          @media (max-width: 1023px) {
            .editor-wrapper.document-scroll-mode .editor-toolbar-row {
              top: 4rem !important;
            }
            .editor-wrapper.document-scroll-mode .ql-toolbar.ql-snow {
              top: calc(4rem + var(--editor-toolbar-row-h, 2.75rem)) !important;
            }
          }

          /* Ensure picker dropdowns stay above sticky toolbars */
          .editor-wrapper.document-scroll-mode .ql-picker-options {
            z-index: 40 !important;
          }

          /* Sticky elements are already bounded by their containing block, so
             the editor-wrapper alone provides the sticky boundary (the toolbar
             releases at the wrapper's bottom edge). Paint containment is
             deliberately NOT used here: clipping dropdown menus or toolbar
             controls at the wrapper edge is worse than any residual benefit. */

          /* Prevent content jump when toolbar becomes sticky */
          .editor-wrapper.document-scroll-mode .editor-toolbar-row,
          .editor-wrapper.document-scroll-mode .ql-toolbar.ql-snow {
            will-change: transform;
          }
        `
      }} />

      <div className="editor-toolbar-row flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-1 shrink-0" ref={toolbarRowRef}>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wider font-bold text-text-secondary">Font Mode:</label>
          <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => setEditorFont('english')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
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
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                editorFont === 'nepali'
                  ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
                  : 'text-text-muted hover:text-navy dark:hover:text-white'
              }`}
            >
              नेपाली (Noto)
            </button>
          </div>
        </div>

        <span className="text-xs text-text-muted">
          Rich paste supported (<kbd className="rounded border border-black/10 dark:border-white/10 px-1 py-0.5 font-mono text-[10px] bg-slate-50 dark:bg-zinc-900">Ctrl+Shift+V</kbd> or <kbd className="rounded border border-black/10 dark:border-white/10 px-1 py-0.5 font-mono text-[10px] bg-slate-50 dark:bg-zinc-900">Ctrl+V</kbd>)
        </span>
      </div>

      <div
        ref={quillBoxRef}
        className={`quill-box-container relative bg-white dark:bg-zinc-950 rounded-2xl border border-black/10 dark:border-white/10 shadow-sm hover:shadow transition-shadow ${
          isDocumentMode
            ? ''
            : fillHeight
            ? 'flex-1 flex flex-col min-h-0'
            : ''
        }`}
      >
        <ReactQuill
          {...{ ref: reactQuillRef }}
          theme="snow"
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
