'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move, Crop } from 'lucide-react';

export interface CropResult {
  blob: Blob;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  filename: string;
}

interface ImageCropperModalProps {
  imageSrc: string;
  filename: string;
  mimeType: string;
  defaultAspectRatio?: number; // width / height, e.g. 4/5 = 0.8, 1/1 = 1
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: CropResult) => void;
  title?: string;
}

const ASPECT_RATIO_PRESETS = [
  { label: '4:5 Portrait', value: 4 / 5 },
  { label: '1:1 Square', value: 1 / 1 },
  { label: '16:9 Banner', value: 16 / 9 },
  { label: '3:2 Classic', value: 3 / 2 },
];

export default function ImageCropperModal({
  imageSrc,
  filename,
  mimeType,
  defaultAspectRatio = 4 / 5,
  isOpen,
  onClose,
  onConfirm,
  title = 'Crop & Position Photo',
}: ImageCropperModalProps) {
  const [aspectRatio, setAspectRatio] = useState<number>(defaultAspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load image object once when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      // Initialize scale and pan so portrait photos are top-aligned with headroom (head never chopped off)
      const container = containerRef.current;
      if (container) {
        const boxW = container.clientWidth || 320;
        const boxH = container.clientHeight || 400;
        const scale0 = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
        const h = img.naturalHeight * scale0;
        const maxPanY = Math.max(0, (h - boxH) / 2);
        // Default pan.y to top alignment with natural headroom (maxPanY * 0.9)
        setZoom(1);
        setPan({ x: 0, y: maxPanY > 0 ? maxPanY * 0.9 : 0 });
      }
    };
    img.src = imageSrc;
  }, [imageSrc, aspectRatio]);

  // Redraw canvas whenever zoom, pan, or aspectRatio changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !imageObj || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const boxW = container.clientWidth || 320;
    const boxH = container.clientHeight || 400;

    canvas.width = boxW * window.devicePixelRatio;
    canvas.height = boxH * window.devicePixelRatio;

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, boxW, boxH);

    const scale0 = Math.max(boxW / imageObj.naturalWidth, boxH / imageObj.naturalHeight);
    const w = imageObj.naturalWidth * scale0 * zoom;
    const h = imageObj.naturalHeight * scale0 * zoom;

    const imgLeft = (boxW - w) / 2 + pan.x;
    const imgTop = (boxH - h) / 2 + pan.y;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageObj, imgLeft, imgTop, w, h);
    ctx.restore();
  }, [zoom, pan, aspectRatio, imageObj]);

  const getClampedPan = useCallback(
    (newPan: { x: number; y: number }, currentZoom: number) => {
      const container = containerRef.current;
      if (!container || !imageObj) return newPan;

      const boxW = container.clientWidth || 320;
      const boxH = container.clientHeight || 400;
      const scale0 = Math.max(boxW / imageObj.naturalWidth, boxH / imageObj.naturalHeight);
      const w = imageObj.naturalWidth * scale0 * currentZoom;
      const h = imageObj.naturalHeight * scale0 * currentZoom;

      const marginX = currentZoom < 1 ? Math.max(0, (boxW - w) / 2) : boxW * 0.15;
      const marginY = currentZoom < 1 ? Math.max(0, (boxH - h) / 2) : boxH * 0.15;
      const limitX = Math.max(0, (w - boxW) / 2) + marginX;
      const limitY = Math.max(0, (h - boxH) / 2) + marginY;

      return {
        x: Math.min(limitX, Math.max(-limitX, newPan.x)),
        y: Math.min(limitY, Math.max(-limitY, newPan.y)),
      };
    },
    [imageObj]
  );

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(0.5, newZoom));
    setZoom(clampedZoom);
    setPan((current) => getClampedPan(current, clampedZoom));
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawPan = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
    setPan(getClampedPan(rawPan, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawPan = { x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y };
    setPan(getClampedPan(rawPan, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomChange(zoom + delta);
  };

  const handleReset = () => {
    const container = containerRef.current;
    if (imageObj && container) {
      const boxW = container.clientWidth || 320;
      const boxH = container.clientHeight || 400;
      const scale0 = Math.max(boxW / imageObj.naturalWidth, boxH / imageObj.naturalHeight);
      const h = imageObj.naturalHeight * scale0;
      const maxPanY = Math.max(0, (h - boxH) / 2);
      setZoom(1);
      setPan({ x: 0, y: maxPanY > 0 ? maxPanY * 0.9 : 0 });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Generate cropped output
  const handleApplyCrop = async () => {
    const container = containerRef.current;
    if (!container || !imageObj) return;

    setProcessing(true);
    try {
      const boxW = container.clientWidth || 320;
      const boxH = container.clientHeight || 400;
      const scale0 = Math.max(boxW / imageObj.naturalWidth, boxH / imageObj.naturalHeight);
      const w = imageObj.naturalWidth * scale0 * zoom;
      const h = imageObj.naturalHeight * scale0 * zoom;

      const imgLeft = (boxW - w) / 2 + pan.x;
      const imgTop = (boxH - h) / 2 + pan.y;

      let targetWidth = 1000;
      let targetHeight = Math.round(targetWidth / aspectRatio);
      if (aspectRatio < 1) {
        targetHeight = 1200;
        targetWidth = Math.round(targetHeight * aspectRatio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      const targetScale = targetWidth / boxW;
      const destW = w * targetScale;
      const destH = h * targetScale;
      const destX = imgLeft * targetScale;
      const destY = imgTop * targetScale;

      // Fill white background for clean margins if zoomed out
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageObj, destX, destY, destW, destH);

      const outMime: 'image/jpeg' | 'image/png' = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outMime, 0.92);
      });

      if (!blob) throw new Error('Failed to generate image crop blob');

      const cleanName = filename.replace(/\.[^/.]+$/, '');
      const ext = outMime === 'image/png' ? 'png' : 'jpg';
      const outputFilename = `${cleanName}-cropped.${ext}`;

      onConfirm({
        blob,
        mimeType: outMime,
        filename: outputFilename,
      });
    } catch (err) {
      console.error('Error cropping image:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropper-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="flex w-full max-w-xl flex-col rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 id="cropper-modal-title" className="text-base font-extrabold text-navy dark:text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-alt hover:text-text-primary"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-alt/50 px-6 py-2.5">
          <span className="text-xs font-bold text-text-muted">Aspect Ratio:</span>
          {ASPECT_RATIO_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setAspectRatio(preset.value);
                setZoom(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                Math.abs(aspectRatio - preset.value) < 0.01
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-accent'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Viewport Area with Interactive Canvas */}
        <div className="flex flex-1 items-center justify-center bg-black/90 p-4 sm:p-6 select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              aspectRatio: `${aspectRatio}`,
              maxHeight: '420px',
              maxWidth: '100%',
              width: aspectRatio < 1 ? '300px' : '440px',
            }}
            className={`relative overflow-hidden rounded-2xl ring-2 ring-accent/60 shadow-inner ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
              className="pointer-events-none select-none"
            />

            {/* 3x3 Rule of thirds grid overlay */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              <div className="border-b border-r border-white/25" />
              <div className="border-b border-r border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-b border-r border-white/25" />
              <div className="border-b border-r border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-white/25" />
              <div className="border-r border-white/25" />
              <div />
            </div>

            {/* Drag hint */}
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">
              <Move className="h-3 w-3" aria-hidden="true" /> Drag to position head & frame
            </div>
          </div>
        </div>

        {/* Controls: Zoom slider & Reset */}
        <div className="space-y-3 border-t border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              disabled={zoom <= 0.5}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-alt disabled:opacity-30"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-surface-alt accent-accent"
              aria-label="Zoom level"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              disabled={zoom >= 3}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-alt disabled:opacity-30"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:text-text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-alt/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-accent-hover disabled:opacity-50"
          >
            {processing ? (
              <>Processing...</>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Apply & Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
