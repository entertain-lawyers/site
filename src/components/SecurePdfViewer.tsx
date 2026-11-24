"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  BookOpen,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  initialFullscreen?: boolean;
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
  initialMode,
  initialNumPages,
  initialFullscreen = false,
}: SecurePdfViewerProps) {
  const [mode, setMode] = useState<PdfViewerMode>(initialMode ?? "book");
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [isQuickJumpOpen, setIsQuickJumpOpen] = useState(false);
  const [bookPan, setBookPan] = useState({ x: 0, y: 0 });
  const [isBookDragging, setIsBookDragging] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // On small mobile screens (< 768px), default to continuous single-page mode for immediate reading comfort
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768 && !initialMode) {
      setMode("single");
    }
  }, [initialMode]);

  // Track native fullscreen changes (syncing exit when user leaves native fullscreen)
  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

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

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const isPinchingRef = useRef(false);
  const didPinchJustEndRef = useRef(false);

  // Multi-touch pinch-to-zoom gesture and double-tap zoom for mobile/tablet touchscreens
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    let initialDist = 0;
    let initialZ = 1.0;
    let pinchRaf: number | null = null;
    let pendingZoom: number | null = null;
    let midX = 0;
    let midY = 0;
    let initialScrollLeft = 0;
    let initialScrollTop = 0;
    let initialBoxRect: DOMRect | null = null;
    let lastTapTime = 0;

    const getDistance = (e: TouchEvent) => {
      if (e.touches.length < 2) return 0;
      return Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      // Double tap on single page mode toggles zoom between 1.0x (Fit Width) and 1.5x
      if (e.touches.length === 1) {
        const now = performance.now();
        if (now - lastTapTime < 280) {
          lastTapTime = 0;
          if (zoomRef.current > 1.05) {
            handleResetZoom();
          } else {
            setZoom(1.5);
          }
          return;
        }
        lastTapTime = now;
      }

      if (e.touches.length === 2) {
        const d = getDistance(e);
        if (d >= 20) {
          isPinchingRef.current = true;
          initialDist = d;
          initialZ = zoomRef.current;
          midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

          const container = singleScrollContainerRef.current;
          if (container) {
            initialScrollLeft = container.scrollLeft;
            initialScrollTop = container.scrollTop;
            initialBoxRect = container.getBoundingClientRect();
          }
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Prevent browser native viewport zoom from conflicting with PDF zoom
        if (e.cancelable) e.preventDefault();

        const curDist = getDistance(e);
        // Guard against zero/near-zero distance causing extreme zoom multipliers
        if (initialDist <= 20) {
          if (curDist >= 20) {
            initialDist = curDist;
            initialZ = zoomRef.current;
            midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const container = singleScrollContainerRef.current;
            if (container) {
              initialScrollLeft = container.scrollLeft;
              initialScrollTop = container.scrollTop;
              initialBoxRect = container.getBoundingClientRect();
            }
          }
          return;
        }

        if (curDist > 20 && initialDist > 20) {
          const rawScale = curDist / initialDist;
          const nextZ = Math.min(2.5, Math.max(0.5, +(initialZ * rawScale).toFixed(2)));
          pendingZoom = nextZ;

          const curMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const curMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

          if (!pinchRaf) {
            pinchRaf = requestAnimationFrame(() => {
              if (pendingZoom !== null && pendingZoom !== zoomRef.current) {
                const prevZ = zoomRef.current;
                zoomRef.current = pendingZoom;
                setZoom(pendingZoom);

                // Natural focal-point zoom adjustment around the fingers + pan tracking
                const c = singleScrollContainerRef.current;
                if (c && prevZ > 0 && initialBoxRect && mode === "single") {
                  const focalX = midX - initialBoxRect.left;
                  const focalY = midY - initialBoxRect.top;
                  const panDx = curMidX - midX;
                  const panDy = curMidY - midY;
                  const ratio = pendingZoom / initialZ;
                  c.scrollLeft = (initialScrollLeft + focalX) * ratio - (focalX + panDx);
                  c.scrollTop = (initialScrollTop + focalY) * ratio - (focalY + panDy);
                }
              }
              pinchRaf = null;
            });
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        if (pinchRaf) {
          cancelAnimationFrame(pinchRaf);
          pinchRaf = null;
        }
        if (pendingZoom !== null) {
          zoomRef.current = pendingZoom;
          setZoom(pendingZoom);
          pendingZoom = null;
        }
        initialDist = 0;
        didPinchJustEndRef.current = true;
        setTimeout(() => {
          isPinchingRef.current = false;
          didPinchJustEndRef.current = false;
        }, 120);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      if (pinchRaf) cancelAnimationFrame(pinchRaf);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [mode]);

  // Desktop trackpad pinch and Ctrl+mousewheel zooming support
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.008);
        setZoom((z) => {
          const next = Math.min(2.5, Math.max(0.5, +(z * factor).toFixed(2)));
          zoomRef.current = next;
          return next;
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
  const handleResetZoom = () => {
    setZoom(1.0);
    setBookPan({ x: 0, y: 0 });
    if (singleScrollContainerRef.current) {
      singleScrollContainerRef.current.scrollLeft = 0;
    }
  };

  const handleFitWidth = useCallback(() => {
    setBookPan({ x: 0, y: 0 });
    if (mode === "single") {
      setZoom(1.0);
      if (singleScrollContainerRef.current) {
        singleScrollContainerRef.current.scrollLeft = 0;
      }
    } else if (geom && box.w > 0) {
      const totalSpreadW = geom.portrait ? geom.pageW : geom.pageW * 2;
      const targetScale = Math.min(2.5, Math.max(0.5, +((box.w - 24) / totalSpreadW).toFixed(2)));
      setZoom(targetScale);
    }
  }, [mode, geom, box.w]);

  const handleFitPage = useCallback(() => {
    setBookPan({ x: 0, y: 0 });
    if (mode === "single" && aspect && box.h > 0) {
      const baseH = singleBaseWidth * aspect;
      const targetScale = Math.min(2.5, Math.max(0.5, +((box.h - 48) / baseH).toFixed(2)));
      setZoom(targetScale);
    } else {
      setZoom(1.0);
    }
  }, [mode, aspect, box.h, singleBaseWidth]);

  // Zoom-anchoring: preserves center reading focus point when zooming in or out via toolbar controls
  const prevZoomRef = useRef(zoom);
  useEffect(() => {
    const prev = prevZoomRef.current;
    prevZoomRef.current = zoom;
    // Never interfere with active or just-completed pinch-to-zoom gestures
    if (isPinchingRef.current || didPinchJustEndRef.current) return;

    if (mode === "single" && singleScrollContainerRef.current && prev !== zoom && prev > 0) {
      const container = singleScrollContainerRef.current;
      const ratio = zoom / prev;

      // Maintain vertical reading focus point, but preserve top anchor if near page start
      if (container.scrollTop < 10) {
        container.scrollTop = 0;
      } else {
        const centerY = container.scrollTop + container.clientHeight / 2;
        container.scrollTop = Math.max(0, centerY * ratio - container.clientHeight / 2);
      }

      // Maintain horizontal center focus point
      if (zoom > 1.02) {
        const centerX = container.scrollLeft + container.clientWidth / 2;
        container.scrollLeft = Math.max(0, centerX * ratio - container.clientWidth / 2);
      } else {
        container.scrollLeft = 0;
      }
    } else if (mode === "book" && zoom <= 1.02) {
      setBookPan({ x: 0, y: 0 });
    }
  }, [zoom, mode]);

  // Desktop mouse drag panning in Single Page Mode when zoomed in (touchscreens use native GPU scrolling)
  useEffect(() => {
    const container = singleScrollContainerRef.current;
    if (!container || mode !== "single") return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let activePointerId: number | null = null;
    let lastTime = 0;
    let lastX = 0;
    let lastY = 0;
    let velX = 0;
    let velY = 0;
    let rafId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      // ONLY intercept mouse on desktop! Touch screens use native hardware-accelerated scrolling.
      if (e.pointerType !== 'mouse') return;
      if (zoomRef.current <= 1.02) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'A')) return;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      isDragging = true;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = performance.now();
      velX = 0;
      velY = 0;
      startScrollLeft = container.scrollLeft;
      startScrollTop = container.scrollTop;

      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture fallback
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId || zoomRef.current <= 1.02) return;
      e.preventDefault();

      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      velX = (e.clientX - lastX) / dt;
      velY = (e.clientY - lastY) / dt;
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = now;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      container.scrollLeft = startScrollLeft - dx;
      container.scrollTop = startScrollTop - dy;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === activePointerId) {
        isDragging = false;
        activePointerId = null;
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }

        // Apply smooth momentum/inertia on flick
        const speed = Math.hypot(velX, velY);
        if (speed > 0.3) {
          let currentVelX = velX * 16;
          let currentVelY = velY * 16;
          const friction = 0.92;

          const step = () => {
            if (Math.abs(currentVelX) < 0.5 && Math.abs(currentVelY) < 0.5) {
              rafId = null;
              return;
            }
            container.scrollLeft -= currentVelX;
            container.scrollTop -= currentVelY;
            currentVelX *= friction;
            currentVelY *= friction;
            rafId = requestAnimationFrame(step);
          };
          rafId = requestAnimationFrame(step);
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', onPointerUp, { passive: true });
    container.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
    };
  }, [mode]);

  const bookPanRef = useRef(bookPan);
  useEffect(() => {
    bookPanRef.current = bookPan;
  }, [bookPan]);

  // Pointer drag panning in Book Mode when zoomed in
  useEffect(() => {
    const el = bookContainerRef.current;
    if (!el || mode !== "book" || zoom <= 1.02) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialPanX = 0;
    let initialPanY = 0;
    let activePointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      setIsBookDragging(true);
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      initialPanX = bookPanRef.current.x;
      initialPanY = bookPanRef.current.y;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setBookPan({
        x: initialPanX + dx,
        y: initialPanY + dy,
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === activePointerId) {
        isDragging = false;
        setIsBookDragging(false);
        activePointerId = null;
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          // Fallback
        }
      }
    };

    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', onPointerUp, { passive: true });
    el.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [mode, zoom]);

  const toggleFullscreen = useCallback(() => {
    if (!rootRef.current) return;
    if (isFullscreen) {
      setIsFullscreen(false);
      if (document.fullscreenElement) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = document as any;
        if (doc.exitFullscreen) {
          void doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          void doc.webkitExitFullscreen().catch(() => {});
        }
      }
    } else {
      setIsFullscreen(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el = rootRef.current as any;
      if (el.requestFullscreen) {
        void el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        void el.webkitRequestFullscreen().catch(() => {});
      }
    }
  }, [isFullscreen]);

  // Gracefully preserve scroll position across mobile orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setTimeout(() => {
        if (mode === "single") {
          const el = singlePageRowRefs.current[pageRef.current];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 200);
    };
    window.addEventListener("orientationchange", handleOrientationChange);
    return () => window.removeEventListener("orientationchange", handleOrientationChange);
  }, [mode]);

  // Seamlessly maintain active page view when transitioning between fullscreen and embedded mode
  useEffect(() => {
    if (mode === "single") {
      const el = singlePageRowRefs.current[pageRef.current];
      if (el) {
        isScrollingRef.current = true;
        el.scrollIntoView({ behavior: "auto", block: "start" });
        const timer = setTimeout(() => {
          isScrollingRef.current = false;
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isFullscreen, mode]);

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
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipNext, flipPrev, toggleFullscreen, isFullscreen]);

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
    <div
      ref={rootRef}
      className={`flex h-full flex-col select-none ${
        isFullscreen
          ? "fixed inset-0 z-[100] bg-slate-900 w-full h-[100dvh] max-h-[100dvh] overflow-hidden"
          : "relative w-full h-full min-h-0"
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {error && (
        <div className="m-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900/50">
          {error}
        </div>
      )}

      {/* Floating Exit Fullscreen Button in Fullscreen mode */}
      {isFullscreen && (
        <div className="absolute top-[calc(0.75rem+env(safe-area-inset-top,0px))] right-[calc(0.75rem+env(safe-area-inset-right,0px))] z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-full bg-slate-800/80 hover:bg-slate-700/90 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 shadow-lg transition-all active:scale-[0.98]"
            aria-label="Exit Fullscreen"
            title="Exit Fullscreen (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden bg-slate-200 p-1 sm:p-2.5 dark:bg-zinc-900">
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
              className={`h-full w-full overflow-y-auto overflow-x-auto px-2 py-3 sm:px-6 sm:py-6 flex flex-col gap-3 sm:gap-6 bg-slate-200 dark:bg-zinc-900 ${
                zoom > 1.02 ? "items-start cursor-grab active:cursor-grabbing" : "items-center"
              }`}
              style={{
                touchAction: "pan-x pan-y",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
              }}
              tabIndex={0}
            >
              {Array.from({ length: numPages || 0 }, (_, i) => {
                const pageW = Math.max(260, Math.round(singleBaseWidth * zoom));
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
                    className={`relative flex-shrink-0 bg-white shadow-xl rounded-xs sm:rounded-sm border border-slate-300 dark:border-zinc-700 overflow-hidden ${
                      zoom <= 1.02 ? "mx-auto" : ""
                    }`}
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
                ref={bookContainerRef}
                style={{
                  transform: `scale(${zoom}) translate(${bookPan.x / zoom}px, ${bookPan.y / zoom}px)`,
                  transformOrigin: "center center",
                  transition: isBookDragging ? "none" : "transform 0.15s ease-out",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  touchAction: zoom > 1.02 ? "none" : "auto",
                }}
                className={`h-full w-full flex items-center justify-center overflow-hidden ${
                  zoom > 1.02 ? "cursor-grab active:cursor-grabbing" : ""
                }`}
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
                  useMouseEvents={zoom <= 1.02}
                  swipeDistance={zoom > 1.02 ? 99999 : 30}
                  showPageCorners={zoom <= 1.02}
                  mobileScrollSupport={false}
                  clickEventForward={false}
                  disableFlipByClick={zoom > 1.02}
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
        <div className="relative bg-surface border-t border-border z-20 shrink-0 shadow-lg">
          {/* Quick Page Scrubber Popover */}
          {isQuickJumpOpen && (
            <div className="border-b border-border bg-surface-alt/95 p-3 shadow-md animate-in slide-in-from-bottom-2 duration-150">
              <div className="max-w-md mx-auto space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-navy dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                    Quick Page Jump
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickJumpOpen(false)}
                    className="p-1 rounded text-text-muted hover:text-navy dark:hover:text-white"
                    aria-label="Close page jump"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold tabular-nums text-text-muted">1</span>
                  <input
                    type="range"
                    min={1}
                    max={numPages}
                    value={page + 1}
                    onChange={(e) => goTo(Number(e.target.value))}
                    className="flex-1 accent-accent h-2 bg-border rounded-lg cursor-pointer"
                    aria-label="Page scrubber slider"
                  />
                  <span className="text-xs font-semibold tabular-nums text-text-muted">{numPages}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      goTo(1);
                      setIsQuickJumpOpen(false);
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-surface border border-border text-text-secondary hover:text-navy dark:hover:text-white"
                  >
                    Page 1
                  </button>
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem("page") as HTMLInputElement;
                      if (input?.value) {
                        goTo(parseInt(input.value, 10));
                        setIsQuickJumpOpen(false);
                      }
                    }}
                  >
                    <input
                      name="page"
                      type="number"
                      min={1}
                      max={numPages}
                      placeholder={String(page + 1)}
                      className="w-16 rounded border border-border bg-surface px-2 py-1 text-xs tabular-nums text-text-primary text-center"
                      aria-label="Go to page"
                    />
                    <button
                      type="submit"
                      className="rounded bg-accent text-white px-2.5 py-1 text-xs font-bold hover:bg-accent-hover transition-colors"
                    >
                      Go
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => {
                      goTo(numPages);
                      setIsQuickJumpOpen(false);
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-surface border border-border text-text-secondary hover:text-navy dark:hover:text-white"
                  >
                    Page {numPages}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Toolbar (sm and up) */}
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt/50 p-1 shadow-xs" role="tablist" aria-label="PDF viewing mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "book"}
                onClick={() => setMode("book")}
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
                onClick={() => setMode("single")}
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
                  type="button"
                  onClick={() => goTo(1)}
                  disabled={atStart}
                  className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                  aria-label="First page"
                >
                  First
                </button>
                <button
                  type="button"
                  onClick={flipPrev}
                  disabled={atStart}
                  className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                  aria-label="Previous page"
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickJumpOpen(!isQuickJumpOpen)}
                  className="min-w-[5.5rem] px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-text-primary hover:bg-surface-alt rounded transition-colors"
                  title="Click to jump to page"
                >
                  {spreadLabel}
                </button>
                <button
                  type="button"
                  onClick={flipNext}
                  disabled={atEnd}
                  className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                  aria-label="Next page"
                >
                  Next ›
                </button>
                <button
                  type="button"
                  onClick={() => numPages && goTo(numPages)}
                  disabled={atEnd}
                  className="rounded px-1.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                  aria-label="Last page"
                >
                  Last
                </button>
              </div>
              <form
                className="flex items-center gap-1"
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

            {/* Zoom & Fullscreen Controls */}
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
              <button
                type="button"
                onClick={handleResetZoom}
                className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-text-primary hover:text-accent transition-colors"
                title="Reset zoom to 100%"
                aria-label="Reset zoom to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
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
              <button
                type="button"
                onClick={handleFitWidth}
                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary border-l border-border/60 ml-0.5 pl-1.5"
                title="Fit to Width"
                aria-label="Fit to Width"
              >
                Fit Width
              </button>
              <button
                type="button"
                onClick={handleFitPage}
                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                title="Fit to Page"
                aria-label="Fit to Page"
              >
                Fit Page
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded p-1 text-xs font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary border-l border-border/60 ml-0.5 pl-1.5"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-accent" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Mobile Toolbar (< sm) — compact, ergonomic, touch-friendly */}
          <div className="flex sm:hidden flex-col gap-1.5 px-2.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Mobile Row 1: Primary Navigation with large touch targets */}
            <div className="flex items-center justify-between gap-1 w-full">
              <button
                type="button"
                onClick={() => goTo(1)}
                disabled={atStart}
                className="min-h-[44px] px-2 text-xs font-bold text-text-secondary hover:text-navy dark:hover:text-white disabled:opacity-30 rounded-lg bg-surface-alt/50 active:bg-surface-alt shrink-0"
                aria-label="First page"
              >
                First
              </button>
              <button
                type="button"
                onClick={flipPrev}
                disabled={atStart}
                className="min-h-[44px] flex-1 flex items-center justify-center gap-1 rounded-lg bg-surface-alt hover:bg-surface-alt/80 border border-border text-xs font-bold text-navy dark:text-white disabled:opacity-30 active:scale-[0.98] transition-all"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQuickJumpOpen(!isQuickJumpOpen)}
                className="min-h-[44px] px-3 flex items-center justify-center gap-1 rounded-lg bg-accent/10 border border-accent/20 text-xs font-extrabold tabular-nums text-accent active:scale-[0.98] transition-all shrink-0"
                aria-label="Open page jump menu"
              >
                <span>{spreadLabel}</span>
                <SlidersHorizontal className="h-3 w-3 opacity-70" />
              </button>
              <button
                type="button"
                onClick={flipNext}
                disabled={atEnd}
                className="min-h-[44px] flex-1 flex items-center justify-center gap-1 rounded-lg bg-surface-alt hover:bg-surface-alt/80 border border-border text-xs font-bold text-navy dark:text-white disabled:opacity-30 active:scale-[0.98] transition-all"
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => numPages && goTo(numPages)}
                disabled={atEnd}
                className="min-h-[44px] px-2 text-xs font-bold text-text-secondary hover:text-navy dark:hover:text-white disabled:opacity-30 rounded-lg bg-surface-alt/50 active:bg-surface-alt shrink-0"
                aria-label="Last page"
              >
                Last
              </button>
            </div>

            {/* Mobile Row 2: Mode Toggle, Zoom & Fullscreen */}
            <div className="flex items-center justify-between gap-1 w-full pt-0.5">
              {/* Compact Mode Switcher */}
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-alt/50 p-0.5 shadow-xs shrink-0" role="tablist" aria-label="PDF viewing mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "book"}
                  onClick={() => setMode("book")}
                  className={`min-h-[40px] inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    mode === "book"
                      ? "bg-accent text-white shadow-xs"
                      : "text-text-secondary hover:text-navy dark:hover:text-white"
                  }`}
                >
                  <BookOpen className="h-3 w-3" aria-hidden="true" />
                  <span>Book</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "single"}
                  onClick={() => setMode("single")}
                  className={`min-h-[40px] inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    mode === "single"
                      ? "bg-accent text-white shadow-xs"
                      : "text-text-secondary hover:text-navy dark:hover:text-white"
                  }`}
                >
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  <span>Single</span>
                </button>
              </div>

              {/* Mobile Zoom & Fullscreen Controls */}
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="min-h-[40px] min-w-[38px] flex items-center justify-center rounded p-1 text-xs font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="min-w-[2.5rem] px-1 text-center text-[11px] font-bold tabular-nums text-text-primary hover:text-accent transition-colors"
                  title="Reset zoom to 100%"
                  aria-label="Reset zoom to 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 2.5}
                  className="min-h-[40px] min-w-[38px] flex items-center justify-center rounded p-1 text-xs font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleFitWidth}
                  className="min-h-[40px] min-w-[38px] px-2 text-[11px] font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary border-l border-border/60"
                  aria-label="Fit to Width"
                >
                  Fit
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="min-h-[40px] min-w-[38px] flex items-center justify-center rounded p-1 text-xs font-bold text-text-secondary hover:bg-surface-alt hover:text-text-primary border-l border-border/60"
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-accent" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
