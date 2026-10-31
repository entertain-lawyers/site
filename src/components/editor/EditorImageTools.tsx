'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from 'lucide-react';

/* Minimal surface of the Quill 2 instance this component uses. */
type QuillBlot = object;
type QuillLike = {
  root: HTMLElement;
  getIndex: (blot: QuillBlot) => number;
  formatText: (index: number, length: number, name: string, value: unknown, source?: string) => void;
  formatLine: (index: number, length: number, name: string, value: unknown, source?: string) => void;
  getFormat: (index: number, length?: number) => Record<string, unknown>;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  constructor: { find: (node: Node, bubble?: boolean) => QuillBlot | null };
};

type Box = { top: number; left: number; width: number; height: number };

const MIN_WIDTH = 48;
const PRESETS = [25, 50, 75, 100] as const;

/**
 * Click an image in the editor to resize it (drag the corner handle or pick a
 * preset) and align it. Changes go through Quill's formatText/formatLine, so
 * they become part of the saved HTML (`<img width="…">` inside a
 * `ql-align-*` paragraph) rather than a visual-only tweak.
 */
export default function EditorImageTools({
  getQuill,
  containerRef,
}: {
  getQuill: () => QuillLike | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [align, setAlign] = useState<string | null>(null);
  // The dragged <img> lives in the ref: handlers mutate its inline width for live feedback.
  const dragRef = useRef<{ img: HTMLImageElement; startX: number; startWidth: number; maxWidth: number } | null>(null);

  const measure = useCallback(
    (img: HTMLImageElement | null) => {
      const container = containerRef.current;
      if (!img || !container || !img.isConnected) {
        setImage(null);
        setBox(null);
        return;
      }
      const c = container.getBoundingClientRect();
      const r = img.getBoundingClientRect();
      setBox({ top: r.top - c.top, left: r.left - c.left, width: r.width, height: r.height });
    },
    [containerRef]
  );

  const locate = useCallback(
    (img: HTMLImageElement) => {
      const quill = getQuill();
      if (!quill) return null;
      const blot = quill.constructor.find(img);
      if (!blot) return null;
      return { quill, index: quill.getIndex(blot) };
    },
    [getQuill]
  );

  const select = useCallback(
    (img: HTMLImageElement | null) => {
      setImage(img);
      measure(img);
      if (img) {
        const found = locate(img);
        setAlign((found && (found.quill.getFormat(found.index, 1).align as string)) || null);
      }
    },
    [locate, measure]
  );

  // Select on click inside the editor; deselect on any other click or Escape.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-image-tools]')) return;
      if (target.tagName === 'IMG' && target.closest('.ql-editor')) select(target as HTMLImageElement);
      else select(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null);
    };
    container.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      container.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [containerRef, select]);

  // Keep the overlay on the image while text reflows, the editor scrolls or the window resizes.
  useEffect(() => {
    if (!image) return;
    const quill = getQuill();
    const update = () => measure(image);
    quill?.on('text-change', update);
    quill?.root.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    image.addEventListener('load', update);
    return () => {
      quill?.off('text-change', update);
      quill?.root.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      image.removeEventListener('load', update);
    };
  }, [image, getQuill, measure]);

  const editorWidth = () => {
    const root = getQuill()?.root;
    if (!root) return 0;
    const style = getComputedStyle(root);
    return root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  };

  const setWidth = (width: number | null) => {
    if (!image) return;
    const found = locate(image);
    if (!found) return;
    // `false` removes the attribute, returning the image to its natural size.
    found.quill.formatText(found.index, 1, 'width', width ? String(Math.round(width)) : false, 'user');
    measure(image);
  };

  const setAlignment = (value: 'center' | 'right' | null) => {
    if (!image) return;
    const found = locate(image);
    if (!found) return;
    found.quill.formatLine(found.index, 1, 'align', value ?? false, 'user');
    setAlign(value);
    requestAnimationFrame(() => measure(image));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!image || !box) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { img: image, startX: e.clientX, startWidth: box.width, maxWidth: editorWidth() || box.width };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    // Right-aligned images grow to the left, so invert the drag direction.
    const dx = (e.clientX - drag.startX) * (align === 'right' ? -1 : 1);
    const width = Math.min(drag.maxWidth, Math.max(MIN_WIDTH, drag.startWidth + dx));
    drag.img.style.width = `${width}px`; // live feedback only; committed on release
    measure(drag.img);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const width = drag.img.getBoundingClientRect().width;
    drag.img.style.removeProperty('width');
    if (!drag.img.getAttribute('style')) drag.img.removeAttribute('style');
    setWidth(width >= drag.maxWidth - 1 ? drag.maxWidth : width);
  };

  if (!image || !box) return null;

  const currentWidth = Math.round(box.width);
  const toolbarAbove = box.top > 52;
  const button =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold text-navy transition hover:bg-slate-100 dark:text-white dark:hover:bg-zinc-800';
  const active = 'bg-accent/10 text-accent dark:bg-accent/20';

  return (
    <div data-image-tools className="pointer-events-none absolute inset-0 z-10">
      {/* Selection frame */}
      <div
        className="absolute rounded-sm outline outline-2 outline-accent"
        style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
      />

      {/* Resize handle (bottom-right; bottom-left for right-aligned images) */}
      <div
        role="slider"
        aria-label="Resize image"
        aria-valuenow={currentWidth}
        aria-valuemin={MIN_WIDTH}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const step = e.shiftKey ? 50 : 10;
            setWidth(Math.min(editorWidth() || Infinity, Math.max(MIN_WIDTH, box.width + (e.key === 'ArrowRight' ? step : -step))));
          }
        }}
        className="pointer-events-auto absolute h-4 w-4 touch-none rounded-sm border-2 border-white bg-accent shadow focus:outline-none focus:ring-2 focus:ring-accent/40"
        style={{
          top: box.top + box.height - 8,
          left: align === 'right' ? box.left - 8 : box.left + box.width - 8,
          cursor: align === 'right' ? 'nesw-resize' : 'nwse-resize',
        }}
      />

      {/* Floating toolbar */}
      <div
        className="pointer-events-auto absolute flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-black/10 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-zinc-900"
        style={{
          top: toolbarAbove ? box.top - 44 : box.top + box.height + 8,
          left: Math.max(0, box.left),
        }}
        onMouseDown={(e) => e.preventDefault() /* keep the editor selection */}
      >
        {PRESETS.map((pct) => (
          <button key={pct} type="button" className={button} onClick={() => setWidth((editorWidth() * pct) / 100)} title={`${pct}% of the column width`}>
            {pct}%
          </button>
        ))}
        <button type="button" className={button} onClick={() => setWidth(null)} title="Original size">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Original size</span>
        </button>
        <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" aria-hidden="true" />
        <button type="button" className={`${button} ${!align ? active : ''}`} onClick={() => setAlignment(null)} title="Align left" aria-pressed={!align}>
          <AlignLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={`${button} ${align === 'center' ? active : ''}`} onClick={() => setAlignment('center')} title="Center" aria-pressed={align === 'center'}>
          <AlignCenter className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={`${button} ${align === 'right' ? active : ''}`} onClick={() => setAlignment('right')} title="Align right" aria-pressed={align === 'right'}>
          <AlignRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="ml-1 px-1 text-[11px] tabular-nums text-text-secondary">{currentWidth}px</span>
      </div>
    </div>
  );
}
