"use client";

import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Serve the worker from our own origin. The previous cdnjs URL was blocked by
// the Content-Security-Policy, so the reader failed for every paid document.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface SecurePdfViewerProps {
  url: string;
  watermarkLines: string[];
}

export default function SecurePdfViewer({ url, watermarkLines }: SecurePdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isMounted = true;

    const renderPage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        
        if (!isMounted) return;
        
        setNumPages(pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext("2d");
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext: any = {
          canvasContext: context,
          viewport: viewport,
        };
        
        renderTask = page.render(renderContext);
        await renderTask.promise;
        
        if (!isMounted) return;

        // Apply watermark
        context.font = "bold 20px Arial";
        context.fillStyle = "rgba(150, 150, 150, 0.25)"; // Semi-transparent
        context.textAlign = "center";
        context.textBaseline = "middle";
        
        // Rotate canvas for diagonal text
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate((-45 * Math.PI) / 180);
        
        // Draw watermark multiple times across the page
        const lineHeight = 28;
        for (let x = -canvas.width; x < canvas.width; x += 400) {
          for (let y = -canvas.height * 1.5; y < canvas.height * 1.5; y += 300) {
            watermarkLines.forEach((line, index) => {
              context.fillText(line, x, y + (index * lineHeight));
            });
          }
        }
        
        // Reset transformation
        context.setTransform(1, 0, 0, 1, 0, 0);

      } catch (err: any) {
        if (isMounted) setError("Failed to load PDF. It may have expired.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTask) renderTask.cancel();
    };
  }, [url, pageNumber, scale, watermarkLines]);

  // Prevent right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center select-none w-full" onContextMenu={handleContextMenu}>
      {loading && <p className="text-text-muted mb-4 animate-pulse">Loading document...</p>}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded mb-4 border border-red-200 dark:border-red-900/50">
          {error}
        </div>
      )}
      
      {/* 
        CRITICAL: The PDF canvas container MUST remain pure white regardless of theme 
        to ensure proper contrast and reading experience. No inversion filters.
      */}
      <div className="relative border border-border shadow-premium bg-white overflow-hidden max-w-full" style={{ pointerEvents: 'none' }}>
        <canvas ref={canvasRef} className="max-w-full h-auto" />
      </div>

      {numPages && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 mb-4 select-none bg-surface border border-border rounded px-4 py-2 shadow-sm max-w-full">
          <div className="flex items-center gap-1 sm:gap-2 border-r border-border pr-4">
            <button 
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="p-2 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded transition-colors"
              aria-label="Zoom Out"
            >
              <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"/></svg>
            </button>
            <span className="text-xs text-text-muted font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
            <button 
              onClick={() => setScale(s => Math.min(3.0, s + 0.25))}
              className="p-2 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded transition-colors"
              aria-label="Zoom In"
            >
              <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7V5"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <button 
              disabled={pageNumber <= 1} 
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              className="px-2 sm:px-4 py-2 min-h-[44px] flex items-center justify-center text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-secondary transition-colors pointer-events-auto"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-text-primary tabular-nums px-2 whitespace-nowrap">
              {pageNumber} <span className="text-text-muted mx-1">/</span> {numPages}
            </span>
            <button 
              disabled={pageNumber >= numPages} 
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              className="px-2 sm:px-4 py-2 min-h-[44px] flex items-center justify-center text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-secondary transition-colors pointer-events-auto"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <div className="text-[10px] uppercase tracking-widest text-text-muted mt-6 text-center max-w-md">
        Securely watermarked for:
        <br />
        <span className="font-bold">{watermarkLines[1]}</span>
      </div>
    </div>
  );
}
