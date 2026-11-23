"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { BookOpen, FileText, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Serve the worker from our own origin.
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

const TARGET_RENDER_W = 1200;
const PRELOAD_WINDOW = 4;
const MIN_SPREAD_PAGE_W = 320;

interface FlipApi {
  flipNext(corner?: "top" | "bottom"): void;
  flipPrev(corner?: "top" | "bottom"): void;
  flip(page: number, corner?: "top" | "bottom"): void;
  turnToPage(page: number): void;
}

async function paintPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  watermarkLines: string[],
): Promise<string | undefined> {
  const pdfPage = await doc.getPage(pageNumber);
  const base = pdfPage.getViewport({ scale: 1 });
  const viewport = pdfPage.getViewport({ scale: TARGET_RENDER_W / base.width });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pdfPage.render({ canvasContext: ctx, viewport } as any).promise;

  // Entitlement watermark burned into the canvas pixels
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

  try {
    return canvas.toDataURL("image/webp", 0.92);
  } catch {
    return undefined;
  }
}

interface BookPageProps {
  pageNumber: number;
  width: number;
  height: number;
  imageSrc?: string;
  onCanvasMount: (el: HTMLCanvasElement | null) => void;
}

const BookPage = React.forwardRef<HTMLDivElement, BookPageProps>(
  ({ pageNumber, width, height, imageSrc, onCanvasMount }, ref) => {
    return (
      <div
        ref={ref}
        data-density="soft"
        style={{ width, height }}
        className="relative bg-white overflow-hidden shadow-md select-none"
      >
        <canvas
          ref={onCanvasMount}
          className="block w-full h-full"
          style={{ width, height }}
        />
        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={`Page ${pageNumber}`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        )}
        <div className="absolute bottom-2 right-2 text-[10px] font-semibold text-slate-400 select-none bg-white/70 px-1 py-0.5 rounded">
          {pageNumber}
        </div>
      </div>
    );
  }
);
BookPage.displayName = "BookPage";

export default function SecurePdfViewer({
  url,
  watermarkLines,
  initialMode = "book",
  initialNumPages,
}: SecurePdfViewerProps) {
  const [mode, setMode] = useState<PdfViewerMode>(initialMode);
  const [zoom, setZoom] = useState(1.0);

  const measureRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<ReturnType<typeof pdfjsLib.getDocument> | null>(null);

  // Cached rendered page images (data URLs) to preserve page content during react-pageflip cloning
  const [pageImages, setPageImages] = useState<{ [index: number]: string }>({});

  // Canvas refs
  const bookCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const singleCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const singlePageRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const singleScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // react-pageflip imperative ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);

  const pageRef = useRef(0);
  const watermarkRef = useRef(watermarkLines);
  const isScrollingRef = useRef(false);

  const [aspect, setAspect] = useState<number | null>(null);
  const [numPages, setNumPages] = useState<number | null>(initialNumPages ?? null);
  const [page, setPage] = useState(0); // 0-based index
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    watermarkRef.current = watermarkLines;
  }, [watermarkLines]);

  // Painting queue
  const pendingBookRef = useRef<Set<number>>(new Set());
  const paintingBookRef = useRef(false);
  const pendingSingleRef = useRef<Set<number>>(new Set());
  const paintingSingleRef = useRef(false);

  const drainBook = useCallback(async () => {
    if (paintingBookRef.current) return;
    paintingBookRef.current = true;
    try {
      while (pendingBookRef.current.size > 0) {
        const doc = pdfRef.current;
        if (!doc) {
          pendingBookRef.current.clear();
          break;
        }
        const cur = pageRef.current;
        let best = -1;
        pendingBookRef.current.forEach((i) => {
          if (best < 0 || Math.abs(i - cur) < Math.abs(best - cur)) best = i;
        });
        pendingBookRef.current.delete(best);
        const canvas = bookCanvasRefs.current[best];
        if (!canvas) continue;
        if (canvas.dataset.rendered === "1") {
          if (best === pageRef.current) setReady(true);
          continue;
        }
        try {
          const dataUrl = await paintPage(doc, best + 1, canvas, watermarkRef.current);
          if (dataUrl) {
            setPageImages((prev) => (prev[best] ? prev : { ...prev, [best]: dataUrl }));
          }
          if (best === pageRef.current) setReady(true);
        } catch {
          // ignore paint errors
        }
      }
    } finally {
      paintingBookRef.current = false;
    }
  }, []);

  const scheduleBookPaint = useCallback(
    (i: number) => {
      pendingBookRef.current.add(i);
      void drainBook();
    },
    [drainBook],
  );

  const drainSingle = useCallback(async () => {
    if (paintingSingleRef.current) return;
    paintingSingleRef.current = true;
    try {
      while (pendingSingleRef.current.size > 0) {
        const doc = pdfRef.current;
        if (!doc) {
          pendingSingleRef.current.clear();
          break;
        }
        const cur = pageRef.current;
        let best = -1;
        pendingSingleRef.current.forEach((i) => {
          if (best < 0 || Math.abs(i - cur) < Math.abs(best - cur)) best = i;
        });
        pendingSingleRef.current.delete(best);
        const canvas = singleCanvasRefs.current[best];
        if (!canvas) continue;
        if (canvas.dataset.rendered === "1") {
          if (best === pageRef.current) setReady(true);
          continue;
        }
        try {
          const dataUrl = await paintPage(doc, best + 1, canvas, watermarkRef.current);
          if (dataUrl) {
            setPageImages((prev) => (prev[best] ? prev : { ...prev, [best]: dataUrl }));
          }
          if (best === pageRef.current) setReady(true);
        } catch {
          // ignore paint errors
        }
      }
    } finally {
      paintingSingleRef.current = false;
    }
  }, []);

  const scheduleSinglePaint = useCallback(
    (i: number) => {
      pendingSingleRef.current.add(i);
      void drainSingle();
    },
    [drainSingle],
  );

  // Measure container area
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
      }, 100);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  // Load PDF document
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
        bookCanvasRefs.current = new Array(doc.numPages).fill(null);
        singleCanvasRefs.current = new Array(doc.numPages).fill(null);
        singlePageRowRefs.current = new Array(doc.numPages).fill(null);
        pendingBookRef.current.clear();
        pendingSingleRef.current.clear();
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

  // Book mode page geometry calculation
  const geom = useMemo(() => {
    if (!aspect || box.w < 60 || box.h < 60) return null;
    let pageW = Math.min(box.w / 2 - 16, (box.h - 16) / aspect);
    let portrait = false;
    if (pageW < MIN_SPREAD_PAGE_W || box.w < 720) {
      portrait = true;
      pageW = Math.min(box.w - 24, (box.h - 20) / aspect);
    }
    pageW = Math.max(180, Math.floor(pageW));
    return { pageW, pageH: Math.floor(pageW * aspect), portrait };
  }, [aspect, box]);

  // Single page base width calculation
  const singleBaseWidth = useMemo(() => {
    if (!box.w) return 720;
    const padding = box.w < 640 ? 16 : 48;
    const avail = Math.max(160, box.w - padding);
    return Math.min(avail, 900);
  }, [box.w]);

  // Preload pages around current spread in Book Mode
  useEffect(() => {
    if (mode !== "book" || !numPages) return;
    const from = Math.max(0, page - PRELOAD_WINDOW);
    const to = Math.min(numPages, page + PRELOAD_WINDOW + 2);
    for (let i = from; i < to; i++) {
      scheduleBookPaint(i);
    }
  }, [mode, page, numPages, scheduleBookPaint]);

  // Preload pages around current page in Single Page Mode
  useEffect(() => {
    if (mode !== "single" || !numPages) return;
    const from = Math.max(0, page - PRELOAD_WINDOW);
    const to = Math.min(numPages, page + PRELOAD_WINDOW + 2);
    for (let i = from; i < to; i++) {
      scheduleSinglePaint(i);
    }
  }, [mode, page, numPages, scheduleSinglePaint]);

  // IntersectionObserver for Single Page Mode scrolling
  useEffect(() => {
    if (mode !== "single" || !numPages) return;
    const container = singleScrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        let bestIndex = -1;
        let maxRatio = 0;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const idx = Number(entry.target.getAttribute("data-page-index"));
            if (!isNaN(idx)) bestIndex = idx;
          }
        });
        if (bestIndex >= 0 && bestIndex !== pageRef.current) {
          pageRef.current = bestIndex;
          setPage(bestIndex);
        }
      },
      {
        root: container,
        threshold: [0.1, 0.3, 0.5, 0.7],
      },
    );

    singlePageRowRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [mode, numPages]);

  // Scroll to page when switching to Single Page Mode
  useEffect(() => {
    if (mode === "single") {
      const el = singlePageRowRefs.current[page];
      if (el) {
        isScrollingRef.current = true;
        el.scrollIntoView({ behavior: "auto", block: "start" });
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 150);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const flipApi = useCallback((): FlipApi | undefined => bookRef.current?.pageFlip(), []);

  const goTo = (n: number) => {
    if (!numPages) return;
    const target = Math.min(Math.max(1, n), numPages) - 1;
    pageRef.current = target;
    setPage(target);

    if (mode === "book") {
      flipApi()?.flip(target);
    } else {
      const row = singlePageRowRefs.current[target];
      if (row) {
        isScrollingRef.current = true;
        row.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 500);
      }
    }
  };

  const flipNext = useCallback(() => {
    if (!numPages) return;
    if (mode === "book") {
      flipApi()?.flipNext();
    } else {
      if (page + 1 < numPages) {
        goTo(page + 2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipApi, mode, numPages, page]);

  const flipPrev = useCallback(() => {
    if (!numPages) return;
    if (mode === "book") {
      flipApi()?.flipPrev();
    } else {
      if (page > 0) {
        goTo(page);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipApi, mode, numPages, page]);

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoom(1.0);

  // Keyboard navigation
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

  // Book pages elements
  const bookPages = useMemo(() => {
    if (!geom || !numPages) return null;
    return Array.from({ length: numPages }, (_, i) => (
      <BookPage
        key={i}
        pageNumber={i + 1}
        width={geom.pageW}
        height={geom.pageH}
        imageSrc={pageImages[i]}
        onCanvasMount={(el) => {
          bookCanvasRefs.current[i] = el;
          if (el && mode === "book") scheduleBookPaint(i);
        }}
      />
    ));
  }, [geom, numPages, pageImages, mode, scheduleBookPaint]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playPageTurnSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextClass();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        void audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.16);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2 + white * 0.2) * 0.22;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(700, now + 0.14);
      filter.Q.setValueAtTime(1.6, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start(now);
      noise.stop(now + 0.16);
    } catch {
      // Audio autoplay restrictions or errors
    }
  };

  const onFlip = (e: { data: number | { page: number } | undefined }) => {
    const p = typeof e.data === "number" ? e.data : (e.data?.page ?? 0);
    if (p !== pageRef.current) {
      playPageTurnSound();
    }
    pageRef.current = p;
    setPage(p);
  };

  const atStart = page <= 0;
  const atEnd =
    !!numPages &&
    (mode === "single"
      ? page + 1 >= numPages
      : page + (geom?.portrait ? 1 : 2) >= numPages);


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
        <div ref={measureRef} className="relative h-full w-full flex items-center justify-center overflow-hidden">
          {!ready && !error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-surface-alt/70 backdrop-blur-xs">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-border border-t-accent" />
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Preparing pages…
              </p>
            </div>
          )}

          {mode === "single" ? (
            <div
              ref={singleScrollContainerRef}
              className="h-full w-full overflow-y-auto overflow-x-auto p-3 sm:p-6 flex flex-col items-center gap-4 sm:gap-6 bg-slate-200 dark:bg-zinc-900 scroll-smooth"
              tabIndex={0}
            >
              {Array.from({ length: numPages || 0 }, (_, i) => {
                const pageW = Math.max(280, Math.round(singleBaseWidth * zoom));
                const pageH = Math.round(pageW * (aspect || 1.414));
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      singlePageRowRefs.current[i] = el;
                    }}
                    data-page-index={i}
                    style={{
                      width: pageW,
                      height: pageH,
                      minWidth: pageW,
                      minHeight: pageH,
                    }}
                    className="relative flex-shrink-0 bg-white shadow-xl rounded-sm border border-slate-300 dark:border-zinc-700 overflow-hidden"
                  >
                    <canvas
                      ref={(el) => {
                        singleCanvasRefs.current[i] = el;
                        if (el && mode === "single") scheduleSinglePaint(i);
                      }}
                      className="block w-full h-full"
                    />
                    {pageImages[i] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pageImages[i]}
                        alt={`Page ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                        draggable={false}
                      />
                    )}
                    <div className="absolute bottom-2 right-2 text-[10px] font-semibold text-slate-400 select-none bg-white/80 px-1.5 py-0.5 rounded shadow-xs">
                      Page {i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            geom && bookPages && numPages && (
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                }}
                className="h-full w-full flex items-center justify-center overflow-hidden"
              >
                <HTMLFlipBook
                  ref={bookRef}
                  className="h-full w-full"
                  style={{ margin: "0 auto", willChange: "transform" }}
                  width={geom.pageW}
                  height={geom.pageH}
                  size="fixed"
                  minWidth={geom.pageW}
                  maxWidth={geom.pageW}
                  minHeight={geom.pageH}
                  maxHeight={geom.pageH}
                  startPage={Math.min(page, numPages - 1)}
                  usePortrait={geom.portrait}
                  showCover={false}
                  drawShadow={true}
                  maxShadowOpacity={0.2}
                  flippingTime={400}
                  useMouseEvents={true}
                  swipeDistance={30}
                  showPageCorners={true}
                  mobileScrollSupport={false}
                  clickEventForward={false}
                  disableFlipByClick={false}
                  startZIndex={1}
                  autoSize={false}
                  onFlip={onFlip}
                >
                  {bookPages}
                </HTMLFlipBook>
              </div>
            )
          )}
        </div>
      </div>

      {numPages != null && !error && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-surface border-t border-border">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt/50 p-1 shadow-xs" role="tablist" aria-label="PDF viewing mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "book"}
              onClick={() => {
                setMode("book");
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
