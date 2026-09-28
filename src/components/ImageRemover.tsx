import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  Download,
  Sparkles,
  Layers,
  Image as ImageIcon,
  CheckCircle,
  FileArchive,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import {
  loadBaseImages,
  getWatermarkInfo,
  cleanFrame,
  detectWatermarkCandidate,
  WatermarkSettings,
  DetectionResult,
  resolveBox,
} from '../engine/watermarkCore';
import { generateSampleImage } from '../engine/sampleGenerator';
import { SplitComparison } from './SplitComparison';
import { WatermarkTuner } from './WatermarkTuner';

interface ProcessedImageItem {
  id: string;
  name: string;
  originalFile: File;
  originalUrl: string;
  cleanedBlob: Blob;
  cleanedUrl: string;
  width: number;
  height: number;
  detection: DetectionResult;
  settings: WatermarkSettings;
}

export const ImageRemover: React.FC = () => {
  const [items, setItems] = useState<ProcessedImageItem[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'difference'>('split');
  const [showTuner, setShowTuner] = useState<boolean>(true);
  const [differenceUrl, setDifferenceUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeItem = items[activeIdx] || null;

  // Process a single file
  const processImageFile = async (
    file: File,
    customSettings?: WatermarkSettings
  ): Promise<ProcessedImageItem> => {
    const { bg96 } = await loadBaseImages();
    const objectUrl = URL.createObjectURL(file);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);

    const rawData = ctx.getImageData(0, 0, width, height);

    // Auto-detect watermark
    const detection = detectWatermarkCandidate(rawData, width, height, bg96);

    const settings: WatermarkSettings = customSettings || {
      presetKey: detection.presetKey,
      gain: detection.gain,
      offsetX: detection.offsetX,
      offsetY: detection.offsetY,
      sizeScale: detection.sizeScale,
    };

    const base = getWatermarkInfo(width, height);
    cleanFrame(bg96, rawData, width, height, base, settings);
    ctx.putImageData(rawData, 0, 0);

    const cleanedBlob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    const cleanedUrl = URL.createObjectURL(cleanedBlob);

    return {
      id: Math.random().toString(36).substring(2, 9),
      name: file.name.replace(/\.[^.]+$/, '') + '_cleaned.png',
      originalFile: file,
      originalUrl: objectUrl,
      cleanedBlob,
      cleanedUrl,
      width,
      height,
      detection,
      settings,
    };
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(`Analyzing & removing watermarks (1 of ${files.length})...`);

    const newProcessedItems: ProcessedImageItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setProcessingStatus(`Analyzing & unblending watermark (${i + 1} of ${files.length})...`);
        const item = await processImageFile(files[i]);
        newProcessedItems.push(item);
      }

      setItems((prev) => [...newProcessedItems, ...prev]);
      setActiveIdx(0);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Image processing failed:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Re-run cleaning on active item when settings change
  const handleSettingsChange = async (newSettings: WatermarkSettings) => {
    if (!activeItem) return;

    const { bg96 } = await loadBaseImages();
    const img = new Image();
    img.src = activeItem.originalUrl;
    await new Promise((r) => (img.onload = r));

    const width = activeItem.width;
    const height = activeItem.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);

    const rawData = ctx.getImageData(0, 0, width, height);
    const base = getWatermarkInfo(width, height);
    cleanFrame(bg96, rawData, width, height, base, newSettings);
    ctx.putImageData(rawData, 0, 0);

    const cleanedBlob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    const cleanedUrl = URL.createObjectURL(cleanedBlob);

    setItems((prev) =>
      prev.map((item, idx) =>
        idx === activeIdx
          ? {
              ...item,
              settings: newSettings,
              cleanedBlob,
              cleanedUrl,
            }
          : item
      )
    );
  };

  // Difference heatmap calculation
  useEffect(() => {
    if (!activeItem || viewMode !== 'difference') {
      setDifferenceUrl(null);
      return;
    }

    const computeDiff = async () => {
      const origImg = new Image();
      origImg.src = activeItem.originalUrl;
      const cleanImg = new Image();
      cleanImg.src = activeItem.cleanedUrl;
      await Promise.all([new Promise((r) => (origImg.onload = r)), new Promise((r) => (cleanImg.onload = r))]);

      const c = document.createElement('canvas');
      c.width = activeItem.width;
      c.height = activeItem.height;
      const ctx = c.getContext('2d')!;

      ctx.drawImage(origImg, 0, 0);
      const origData = ctx.getImageData(0, 0, c.width, c.height);

      ctx.drawImage(cleanImg, 0, 0);
      const cleanData = ctx.getImageData(0, 0, c.width, c.height);

      const diff = ctx.createImageData(c.width, c.height);
      for (let i = 0; i < origData.data.length; i += 4) {
        const dR = Math.abs(origData.data[i] - cleanData.data[i]);
        const dG = Math.abs(origData.data[i + 1] - cleanData.data[i + 1]);
        const dB = Math.abs(origData.data[i + 2] - cleanData.data[i + 2]);
        const maxDelta = Math.max(dR, dG, dB);

        if (maxDelta > 2) {
          // Amplify difference for visibility (glowing cyan watermark signature)
          diff.data[i] = 56;
          diff.data[i + 1] = 189;
          diff.data[i + 2] = 248;
          diff.data[i + 3] = Math.min(255, maxDelta * 6);
        } else {
          diff.data[i] = 15;
          diff.data[i + 1] = 23;
          diff.data[i + 2] = 42;
          diff.data[i + 3] = 240;
        }
      }
      ctx.putImageData(diff, 0, 0);
      setDifferenceUrl(c.toDataURL('image/png'));
    };

    computeDiff();
  }, [activeItem, viewMode]);

  const loadSample = async (theme: 'cosmic' | 'cyberpunk' | 'nature') => {
    setIsProcessing(true);
    setProcessingStatus(`Generating ${theme} Gemini watermarked test image...`);
    try {
      const file = await generateSampleImage(theme);
      await handleFiles([file]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDownloadSingle = (item: ProcessedImageItem) => {
    const a = document.createElement('a');
    a.href = item.cleanedUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAllZip = async () => {
    if (items.length === 0) return;
    const zip = new JSZip();
    items.forEach((item) => {
      zip.file(item.name, item.cleanedBlob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini_cleaned_images.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="relative group border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 bg-slate-900/60 hover:bg-slate-900/90 rounded-2xl p-8 sm:p-10 transition-all cursor-pointer text-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-500/20 transition-all shadow-lg">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-100">
              Drag & Drop Gemini or AI Images here
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Drop one or multiple images. Supports <span className="text-indigo-300">PNG, JPG, WebP, AVIF</span>.
              Mathematical alpha unblending with <span className="text-emerald-400 font-medium">zero blur</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Browse Image Files
            </button>
          </div>
        </div>

        {/* Sample chips */}
        <div
          className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Or try realistic samples:
          </span>
          <button
            type="button"
            onClick={() => loadSample('cosmic')}
            disabled={isProcessing}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            🌌 Cosmic Galaxy (1024px)
          </button>
          <button
            type="button"
            onClick={() => loadSample('cyberpunk')}
            disabled={isProcessing}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            🏙️ Cyberpunk Neon (1024px)
          </button>
          <button
            type="button"
            onClick={() => loadSample('nature')}
            disabled={isProcessing}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            🌿 Emerald Nature (1024px)
          </button>
        </div>
      </div>

      {/* Processing Loader */}
      {isProcessing && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 text-center shadow-lg">
          <div className="inline-block w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-indigo-200">{processingStatus}</p>
          <p className="text-xs text-slate-400 mt-1">Executing mathematical reverse alpha unblending...</p>
        </div>
      )}

      {/* Active Processed View */}
      {activeItem && !isProcessing && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-xs block">
                  {activeItem.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeItem.width} × {activeItem.height}px •{' '}
                  {activeItem.detection.matchFound
                    ? `Auto-Detected: ${activeItem.detection.name}`
                    : 'Calibrated Custom'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    viewMode === 'split'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Split Slider
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    viewMode === 'side-by-side'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('difference')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    viewMode === 'difference'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Difference Map
                </button>
              </div>

              {/* Tuner Toggle */}
              <button
                type="button"
                onClick={() => setShowTuner(!showTuner)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  showTuner
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showTuner ? 'Hide Tuner' : 'Adjust Watermark'}
              </button>

              {/* Download Active Image */}
              <button
                type="button"
                onClick={() => handleDownloadSingle(activeItem)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download Clean PNG
              </button>
            </div>
          </div>

          {/* Interactive Tuner Panel */}
          {showTuner && (
            <WatermarkTuner
              settings={activeItem.settings}
              detection={activeItem.detection}
              onChange={handleSettingsChange}
              onResetAuto={() => {
                handleSettingsChange({
                  presetKey: activeItem.detection.presetKey,
                  gain: activeItem.detection.gain,
                  offsetX: activeItem.detection.offsetX,
                  offsetY: activeItem.detection.offsetY,
                  sizeScale: activeItem.detection.sizeScale,
                });
              }}
            />
          )}

          {/* Preview Container */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-xl">
            {viewMode === 'split' && (
              <SplitComparison
                originalUrl={activeItem.originalUrl}
                cleanedUrl={activeItem.cleanedUrl}
                width={activeItem.width}
                height={activeItem.height}
              />
            )}

            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-300">Original Watermarked</span>
                    <span className="text-amber-400">Gemini Sparkle Embedded</span>
                  </div>
                  <div className="checker-bg rounded-lg overflow-hidden border border-slate-800">
                    <img
                      src={activeItem.originalUrl}
                      alt="Original"
                      className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-indigo-300">Mathematically Cleaned</span>
                    <span className="text-emerald-400">Zero Blur • Zero Loss</span>
                  </div>
                  <div className="checker-bg rounded-lg overflow-hidden border border-slate-800">
                    <img
                      src={activeItem.cleanedUrl}
                      alt="Cleaned"
                      className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                    />
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'difference' && differenceUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-cyan-400" />
                    Subtracted Watermark Delta Heatmap
                  </span>
                  <span>Cyan glow reveals the mathematically subtracted logo pixels</span>
                </div>
                <div className="checker-bg rounded-xl overflow-hidden border border-slate-800">
                  <img
                    src={differenceUrl}
                    alt="Difference"
                    className="w-full h-auto max-h-[65vh] object-contain mx-auto"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Batch Carousel if multiple files */}
          {items.length > 1 && (
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Batch Processed Queue ({items.length} images)
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  Download All as ZIP
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`shrink-0 w-32 p-2 rounded-xl border transition-all cursor-pointer ${
                      idx === activeIdx
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="aspect-square checker-bg rounded-lg overflow-hidden mb-2">
                      <img
                        src={item.cleanedUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[11px] font-medium text-slate-200 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {item.width}×{item.height}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
