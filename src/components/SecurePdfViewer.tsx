"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { BookOpen, FileText, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Serve the worker from our own origin. The previous cdnjs URL was blocked by
// the Content-Security-Policy, so the reader failed for every paid document.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export type PdfViewerMode = "book" | "single";

interface SecurePdfViewerProps {
  url: string;
  watermarkLines: string[];
  initialMode?: PdfViewerMode;
  initialNumPages?: number;
}

// Internal canvas resolution per page: crisp enough for reading, small enough
// that the window of painted pages stays affordable. Pages outside the window
// are dropped again.
const TARGET_RENDER_W = 1000;
// Pages painted either side of the current spread.
const RENDER_WINDOW = 2;
// Below this single-page width a two-page spread is unreadable → single page.
const MIN_SPREAD_PAGE_W = 300;

interface FlipApi {
  flipNext(): void;
  flipPrev(): void;
  flip(page: number): void;
  turnToPage(page: number): void;
}

async function paintPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  watermarkLines: string[],
) {
  const pdfPage = await doc.getPage(pageNumber);
  const base = pdfPage.getViewport({ scale: 1 });
  const viewport = pdfPage.getViewport({ scale: TARGET_RENDER_W / base.width });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pdfPage.render({ canvasContext: ctx, viewport } as any).promise;

  // Entitlement watermark burned into the pixels, so saved page images carry
  // it too. Sized relative to the canvas (was tuned for ~890px wide pages).
  ctx.font = `bold ${Math.round(canvas.width * 0.022)}px Arial`;
  ctx.fillStyle = "rgba(150, 150, 150, 0.25)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-45 * Math.PI) / 180);
  const lineGap = canvas.width * 0.032;
  const xStep = canvas.width * 0.45;
  const yStep = canvas.width * 0.34;
  for (let x = -canvas.width; x < canvas.width; x += xStep) {
    for (let y = -canvas.height * 1.5; y < canvas.height * 1.5; y += yStep) {
      watermarkLines.forEach((line, index) => {
        ctx.fillText(line, x, y + index * lineGap);
      });
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  canvas.dataset.rendered = "1";
}

export default function SecurePdfViewer({
  url,
  watermarkLines,
  initialMode = "book",
  initialNumPages,
}: SecurePdfViewerProps) {
  const [mode, setMode] = useState<PdfViewerMode>(initialMode);
  const [zoom, setZoom] = useState(1.0);
  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const measureRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<ReturnType<typeof pdfjsLib.getDocument> | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  // react-pageflip exposes its API only through the imperative ref.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);

  // Page painting is decoupled from effects: react-pageflip renders its
  // children one commit late, so canvases register themselves via ref
  // callbacks and a queue paints them nearest-to-current-page first.
  const pageRef = useRef(0);
  const pendingRef = useRef<Set<number>>(new Set());
  const paintingRef = useRef(false);
  const watermarkRef = useRef(watermarkLines);

  const [aspect, setAspect] = useState<number | null>(null);
  const [numPages, setNumPages] = useState<number | null>(initialNumPages ?? null);
  const [page, setPage] = useState(0); // 0-based first page of the spread / current page
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    watermarkRef.current = watermarkLines;
  }, [watermarkLines]);

  const drain = useCallback(async () => {
    if (paintingRef.current) return;
    paintingRef.current = true;
    try {
      while (pendingRef.current.size > 0) {
        const doc = pdfRef.current;
        if (!doc) {
          pendingRef.current.clear();
          break;
        }
        const cur = pageRef.current;
        let best = -1;
        pendingRef.current.forEach((i) => {
          if (best < 0 || Math.abs(i - cur) < Math.abs(best - cur)) best = i;
        });
        pendingRef.current.delete(best);
        const canvas = canvasRefs.current[best];
        if (!canvas || canvas.dataset.rendered === "1") continue;
        try {
          await paintPage(doc, best + 1, canvas, watermarkRef.current);
          if (best === pageRef.current) setReady(true);
        } catch {
          // Leave the page blank; it repaints next time its window opens.
        }
      }
    } finally {
      paintingRef.current = false;
    }
  }, []);

  const schedulePaint = useCallback(
    (i: number) => {
      pendingRef.current.add(i);
      void drain();
    },
    [drain],
  );

  // Measure the available area so the book always fits without scrolling.
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        setBox((prev) =>
          Math.abs(prev.w - w) > 2 || Math.abs(prev.h - h) > 2 ? { w, h } : prev,
        );
      }, 120);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const task = pdfjsLib.getDocument({ url });
        taskRef.current = task;
        const doc = await task.promise;
        if (cancelled) {
          task.destroy();
          return;
        }
        const first = await doc.getPage(1);
        const v = first.getViewport({ scale: 1 });
        if (cancelled) {
          task.destroy();
          return;
        }
        pdfRef.current = doc;
        canvasRefs.current = new Array(doc.numPages).fill(null);
        pendingRef.current.clear();
        pageRef.current = 0;
        setNumPages(doc.numPages);
        setAspect(v.height / v.width);
        setPage(0);
        setReady(false);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Failed to load PDF. It may have expired or is unavailable.");
        }
      }
    })();
    return () => {
      cancelled = true;
      taskRef.current?.destroy();
      taskRef.current = null;
      pdfRef.current = null;
    };
  }, [url]);

  // Single Page Mode renderer
  useEffect(() => {
    if (mode !== "single" || !pdfRef.current || numPages == null) return;
    let cancelled = false;
    const doc = pdfRef.current;
    const canvas = singleCanvasRef.current;
    if (!canvas) return;

    (async () => {
      try {
        await paintPage(doc, page + 1, canvas, watermarkRef.current);
        if (!cancelled) setReady(true);
      } catch {
        // Leave canvas empty on paint failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, page, numPages]);

  // Single-page size that fits both directions; two-page spread when there is
  // room, single page on narrow screens (the WordPress flipbook behavior).
  const geom = useMemo(() => {
    if (!aspect || box.w < 60 || box.h < 60) return null;
    let pageW = Math.min(box.w / 2, box.h / aspect);
    let portrait = false;
    if (pageW < MIN_SPREAD_PAGE_W) {
      portrait = true;
      pageW = Math.min(box.w, box.h / aspect);
    }
    return { pageW: Math.floor(pageW), pageH: Math.floor(pageW * aspect), portrait };
  }, [aspect, box]);

  // Queue the pages around the current spread; drop the ones far away (Book Mode).
  useEffect(() => {
    if (mode !== "book") return;
    const span = geom ? (geom.portrait ? 1 : 2) : 1;
    if (!geom || !numPages || !aspect) return;
    const from = Math.max(0, page - RENDER_WINDOW);
    const to = Math.min(numPages, page + span + RENDER_WINDOW);
    for (let i = from; i < to; i++) schedulePaint(i);
    canvasRefs.current.forEach((canvas, i) => {
      if (canvas && canvas.dataset.rendered === "1" && (i < from - 2 || i >= to + 2)) {
        canvas.width = 32;
        canvas.height = Math.round(32 * aspect);
        delete canvas.dataset.rendered;
      }
    });
  }, [mode, page, geom, numPages, aspect, schedulePaint]);

  const flipApi = useCallback((): FlipApi | undefined => bookRef.current?.pageFlip(), []);

  const goTo = (n: number) => {
    if (!numPages) return;
    const target = Math.min(Math.max(1, n), numPages) - 1;
    pageRef.current = target;
    setPage(target);
    if (mode === "book") {
      flipApi()?.flip(target);
    }
  };

  const flipNext = useCallback(() => {
    if (!numPages) return;
    if (mode === "book") {
      flipApi()?.flipNext();
    } else {
      if (page + 1 < numPages) {
        const next = page + 1;
        pageRef.current = next;
        setPage(next);
      }
    }
  }, [flipApi, mode, numPages, page]);

  const flipPrev = useCallback(() => {
    if (!numPages) return;
    if (mode === "book") {
      flipApi()?.flipPrev();
    } else {
      if (page > 0) {
        const prev = page - 1;
        pageRef.current = prev;
        setPage(prev);
      }
    }
  }, [flipApi, mode, numPages, page]);

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoom(1.0);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        flipNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipPrev();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipNext, flipPrev]);

  const pages = useMemo(() => {
    if (!geom || !numPages) return null;
    return Array.from({ length: numPages }, (_, i) => (
      <div
        key={i}
        style={{ width: geom.pageW, height: geom.pageH }}
        className="overflow-hidden bg-white"
      >
        <canvas
          ref={(el) => {
            canvasRefs.current[i] = el;
            if (el && mode === "book") schedulePaint(i);
          }}
          className="block h-full w-full"
        />
      </div>
    ));
  }, [geom, numPages, mode, schedulePaint]);

  const onFlip = (e: { data: number | { page: number } | undefined }) => {
    const p = typeof e.data === "number" ? e.data : (e.data?.page ?? 0);
    pageRef.current = p;
    setPage(p);
  };

  const atStart = page <= 0;
  const atEnd = !!numPages && (mode === "single" ? page + 1 >= numPages : page + (geom?.portrait ? 1 : 2) >= numPages);

  const spreadLabel = numPages
    ? mode === "single"
      ? `${page + 1} / ${numPages}`
      : geom?.portrait
        ? `${Math.min(page + 1, numPages)} / ${numPages}`
        : `${Math.min(page + 1, numPages)}${
            page + 1 < numPages ? `–${Math.min(page + 2, numPages)}` : ""
          } / ${numPages}`
    : "";

  return (
    <div className="flex h-full flex-col select-none" onContextMenu={(e) => e.preventDefault()}>
      {error && (
        <div className="m-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900/50">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden bg-slate-200 p-1.5 sm:p-2.5 dark:bg-zinc-900">
        <div ref={measureRef} className="relative h-full w-full flex items-center justify-center overflow-auto">
          {!ready && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-alt/60">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-border border-t-accent" />
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Preparing pages…
              </p>
            </div>
          )}

          {mode === "single" ? (
            <div className="h-full w-full overflow-auto flex items-center justify-center p-2 sm:p-4">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="flex items-center justify-center max-w-full max-h-full"
              >
                <canvas
                  ref={singleCanvasRef}
                  className="max-h-[80vh] max-w-full rounded shadow-xl border border-black/10 dark:border-white/10 bg-white"
                />
              </div>
            </div>
          ) : (
            geom && pages && numPages && (
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="h-full w-full flex items-center justify-center"
              >
                <HTMLFlipBook
                  key={`${geom.pageW}x${geom.pageH}x${geom.portrait}`}
                  ref={bookRef}
                  className="h-full w-full"
                  style={{}}
                  width={geom.pageW}
                  height={geom.pageH}
                  size="fixed"
                  minWidth={geom.pageW}
                  maxWidth={geom.pageW}
                  minHeight={geom.pageH}
                  maxHeight={geom.pageH}
                  startPage={Math.min(page, numPages - 1)}
                  usePortrait
                  showCover={false}
                  drawShadow
                  maxShadowOpacity={0.45}
                  flippingTime={650}
                  useMouseEvents
                  swipeDistance={25}
                  showPageCorners
                  mobileScrollSupport
                  clickEventForward={false}
                  disableFlipByClick={false}
                  startZIndex={1}
                  autoSize={false}
                  onFlip={onFlip}
                >
                  {pages}
                </HTMLFlipBook>
              </div>
            )
          )}
        </div>
      </div>

      {numPages != null && !error && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-2 bg-surface border-t border-border">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt/50 p-1 shadow-xs" role="tablist" aria-label="PDF viewing mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "book"}
              onClick={() => {
                setMode("book");
                setReady(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                mode === "book"
                  ? "bg-accent text-white shadow-xs"
                  : "text-text-secondary hover:text-navy dark:hover:text-white"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Book Mode</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "single"}
              onClick={() => {
                setMode("single");
                setReady(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                mode === "single"
                  ? "bg-accent text-white shadow-xs"
                  : "text-text-secondary hover:text-navy dark:hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Single Page</span>
            </button>
          </div>

          {/* Page Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1.5 py-1 shadow-sm">
              <button
                onClick={() => goTo(1)}
                disabled={atStart}
                className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                aria-label="First page"
              >
                First
              </button>
              <button
                onClick={flipPrev}
                disabled={atStart}
                className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                aria-label="Previous page"
              >
                ‹ Prev
              </button>
              <span className="min-w-[5.5rem] text-center text-xs font-semibold tabular-nums text-text-primary">
                {spreadLabel}
              </span>
              <button
                onClick={flipNext}
                disabled={atEnd}
                className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                aria-label="Next page"
              >
                Next ›
              </button>
              <button
                onClick={() => numPages && goTo(numPages)}
                disabled={atEnd}
                className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                aria-label="Last page"
              >
                Last
              </button>
            </div>
            <form
              className="hidden sm:flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("page") as HTMLInputElement;
                if (input?.value) goTo(parseInt(input.value, 10));
              }}
            >
              <input
                name="page"
                type="number"
                min={1}
                max={numPages}
                placeholder="Page"
                className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-xs tabular-nums text-text-primary"
                aria-label="Go to page"
              />
              <button
                type="submit"
                className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
              >
                Go
              </button>
            </form>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-1 shadow-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="rounded p-1 text-xs font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-text-primary">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 2.5}
              className="rounded p-1 text-xs font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="rounded px-1.5 py-0.5 text-[11px] font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary"
              title="Reset Zoom (Fit)"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
