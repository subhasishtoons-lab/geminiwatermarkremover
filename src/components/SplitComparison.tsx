import React, { useState, useRef, useCallback } from 'react';
import { Eye, MoveHorizontal } from 'lucide-react';

interface SplitComparisonProps {
  originalUrl: string;
  cleanedUrl: string;
  originalLabel?: string;
  cleanedLabel?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const SplitComparison: React.FC<SplitComparisonProps> = ({
  originalUrl,
  cleanedUrl,
  originalLabel = 'Watermarked',
  cleanedLabel = 'Mathematically Cleaned',
  className = '',
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-xl checker-bg border border-slate-800 touch-none shadow-2xl ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: 'ew-resize' }}
    >
      {/* Cleaned Image (Bottom Layer) */}
      <img
        src={cleanedUrl}
        alt={cleanedLabel}
        className="w-full h-auto block max-h-[70vh] object-contain mx-auto pointer-events-none"
        draggable={false}
      />

      {/* Original Image (Top Layer clipped) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={originalUrl}
          alt={originalLabel}
          className="absolute inset-0 w-full h-full max-h-[70vh] object-contain pointer-events-none"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
          draggable={false}
        />
      </div>

      {/* Divider Bar */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 pointer-events-none shadow-[0_0_10px_rgba(99,102,241,0.8)]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white/90">
          <MoveHorizontal className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-md text-xs font-medium text-slate-300 border border-slate-700/60 pointer-events-none flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
        {originalLabel}
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-md text-xs font-medium text-indigo-300 border border-indigo-500/40 pointer-events-none flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
        {cleanedLabel}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] text-slate-400 pointer-events-none flex items-center gap-1.5 border border-white/10">
        <Eye className="w-3.5 h-3.5 text-indigo-400" />
        Drag slider to compare unblended pixels
      </div>
    </div>
  );
};
