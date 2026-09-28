import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Film,
  Download,
  Sparkles,
  SlidersHorizontal,
  Volume2,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  VideoWatermarkProcessor,
  VideoProcessingProgress,
} from '../engine/videoEngine';
import {
  cleanFrame,
  loadBaseImages,
  getVeoWatermark,
  getWatermarkInfo,
  WatermarkSettings,
  DetectionResult,
} from '../engine/watermarkCore';
import { generateSampleVideo } from '../engine/sampleGenerator';
import { SplitComparison } from './SplitComparison';
import { WatermarkTuner } from './WatermarkTuner';

export const VideoRemover: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<{
    originalUrl: string;
    cleanedUrl: string;
    imageData: ImageData;
    width: number;
    height: number;
  } | null>(null);

  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings>({
    presetKey: 'sparkle',
    gain: 0.6,
    offsetX: -24,
    offsetY: -24,
    sizeScale: 1.0,
  });

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<VideoProcessingProgress | null>(null);
  const [resultVideo, setResultVideo] = useState<{
    blob: Blob;
    url: string;
    format: string;
  } | null>(null);

  const [showTuner, setShowTuner] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) return;

    setVideoFile(file);
    const videoUrl = URL.createObjectURL(file);
    setOriginalVideoUrl(videoUrl);
    setResultVideo(null);
    setIsAnalyzing(true);

    try {
      const { detection: detected, previewFrame: frame } =
        await VideoWatermarkProcessor.detectVideoWatermark(file);

      const activeSettings: WatermarkSettings = {
        presetKey: detected.presetKey,
        gain: detected.gain,
        offsetX: detected.offsetX,
        offsetY: detected.offsetY,
        sizeScale: detected.sizeScale,
      };

      setDetection(detected);
      setSettings(activeSettings);

      // Render cleaned preview frame
      await updatePreviewFrame(frame.imageData, frame.width, frame.height, activeSettings);
    } catch (err) {
      console.error('Error analyzing video:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updatePreviewFrame = async (
    rawImageData: ImageData,
    width: number,
    height: number,
    activeSettings: WatermarkSettings
  ) => {
    const { bg96 } = await loadBaseImages();

    // Create copy for original
    const origCanvas = document.createElement('canvas');
    origCanvas.width = width;
    origCanvas.height = height;
    const origCtx = origCanvas.getContext('2d')!;
    origCtx.putImageData(rawImageData, 0, 0);
    const originalUrl = origCanvas.toDataURL('image/png');

    // Create copy for cleaned
    const cleanCanvas = document.createElement('canvas');
    cleanCanvas.width = width;
    cleanCanvas.height = height;
    const cleanCtx = cleanCanvas.getContext('2d', { willReadFrequently: true })!;
    cleanCtx.putImageData(rawImageData, 0, 0);
    const cleanData = cleanCtx.getImageData(0, 0, width, height);

    const isGeminiMode = activeSettings.presetKey === 'gemini';
    const base = isGeminiMode ? getWatermarkInfo(width, height) : getVeoWatermark(width, height);
    cleanFrame(bg96, cleanData, width, height, base, activeSettings);
    cleanCtx.putImageData(cleanData, 0, 0);
    const cleanedUrl = cleanCanvas.toDataURL('image/png');

    setPreviewFrame({
      originalUrl,
      cleanedUrl,
      imageData: rawImageData,
      width,
      height,
    });
  };

  const handleSettingsChange = async (newSettings: WatermarkSettings) => {
    setSettings(newSettings);
    if (previewFrame) {
      await updatePreviewFrame(
        previewFrame.imageData,
        previewFrame.width,
        previewFrame.height,
        newSettings
      );
    }
  };

  const handleExportVideo = async () => {
    if (!videoFile) return;

    setIsExporting(true);
    setProgress({
      frame: 0,
      progress: 0,
      phase: 'extracting',
      statusText: 'Starting hardware video encoding...',
    });

    try {
      const result = await VideoWatermarkProcessor.processVideo(
        videoFile,
        settings,
        (p) => setProgress(p)
      );

      setResultVideo(result);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Video processing failed:', err);
      alert('Video export error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const loadSample = async () => {
    setIsAnalyzing(true);
    try {
      const sample = await generateSampleVideo();
      await handleVideoFile(sample);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleVideoFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className="relative group border-2 border-dashed border-slate-700/80 hover:border-purple-500/80 bg-slate-900/60 hover:bg-slate-900/90 rounded-2xl p-8 sm:p-10 transition-all cursor-pointer text-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-500/20 transition-all shadow-lg">
            <Film className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-100">
              Drag & Drop Veo 3, Google Flow, or Gemini Omni Video
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Hardware-accelerated client-side video unblending. Supports{' '}
              <span className="text-purple-300">MP4, WebM, MOV</span>. Preserves original audio tracks.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <Film className="w-4 h-4" />
              Browse Video File
            </button>
          </div>
        </div>

        {/* 1-Click Sample Video Button */}
        <div
          className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            No video on hand?
          </span>
          <button
            type="button"
            onClick={loadSample}
            disabled={isAnalyzing || isExporting}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            🎥 Generate Test Veo Video Sample
          </button>
        </div>
      </div>

      {/* Analysis State */}
      {isAnalyzing && (
        <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-6 text-center shadow-lg">
          <div className="inline-block w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-purple-200">
            Extracting candidate frames & detecting watermark position...
          </p>
          <p className="text-xs text-slate-400 mt-1">Calibrating reverse alpha coordinates...</p>
        </div>
      )}

      {/* Video Preview & Configuration */}
      {previewFrame && !isAnalyzing && (
        <div className="space-y-4">
          {/* Top Info & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
              <div>
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-xs block">
                  {videoFile?.name || 'Selected Video'}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>
                    {previewFrame.width} × {previewFrame.height}px
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Volume2 className="w-3 h-3" />
                    Audio Retained
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTuner(!showTuner)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  showTuner
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showTuner ? 'Hide Tuner' : 'Adjust Watermark'}
              </button>

              <button
                type="button"
                onClick={handleExportVideo}
                disabled={isExporting}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Film className="w-4 h-4" />
                {isExporting ? 'Exporting Video...' : 'Unblend & Export Video'}
              </button>
            </div>
          </div>

          {/* Watermark Tuner */}
          {showTuner && (
            <WatermarkTuner
              settings={settings}
              detection={detection}
              onChange={handleSettingsChange}
              isVideo={true}
              onResetAuto={() => {
                if (detection) {
                  handleSettingsChange({
                    presetKey: detection.presetKey,
                    gain: detection.gain,
                    offsetX: detection.offsetX,
                    offsetY: detection.offsetY,
                    sizeScale: detection.sizeScale,
                  });
                }
              }}
            />
          )}

          {/* Keyframe Preview Split Slider */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
              <span className="font-semibold text-slate-200">
                Keyframe Reverse Alpha Unblending Preview
              </span>
              <span>Slide to inspect watermark removal on representative frame</span>
            </div>
            <SplitComparison
              originalUrl={previewFrame.originalUrl}
              cleanedUrl={previewFrame.cleanedUrl}
              originalLabel="Original Video Frame"
              cleanedLabel="Cleaned Frame"
              width={previewFrame.width}
              height={previewFrame.height}
            />
          </div>

          {/* Export Progress Modal / Banner */}
          {isExporting && progress && (
            <div className="bg-purple-950/70 border border-purple-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-200 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                  {progress.statusText}
                </span>
                <span className="text-sm font-mono font-bold text-purple-300">
                  {Math.round(progress.progress * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-purple-900">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-200 shadow-sm"
                  style={{ width: `${Math.round(progress.progress * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Phase: {progress.phase.toUpperCase()}</span>
                {progress.totalFrames && (
                  <span>
                    Frame {progress.frame} of {progress.totalFrames}
                  </span>
                )}
                <span>Please keep this tab open</span>
              </div>
            </div>
          )}

          {/* Export Result Player */}
          {resultVideo && (
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Video Watermark Successfully Removed!
                    </h4>
                    <p className="text-xs text-slate-400">
                      Exported in {resultVideo.format.toUpperCase()} format with original audio track preserved.
                    </p>
                  </div>
                </div>

                <a
                  href={resultVideo.url}
                  download={
                    (videoFile?.name.replace(/\.[^.]+$/, '') || 'veo_video') +
                    `_cleaned.${resultVideo.format}`
                  }
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Clean Video
                </a>
              </div>

              {/* Side-by-side video playback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                    <span>Original Watermarked</span>
                    <span className="text-amber-400 text-[11px]">Visible Sparkle</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                    <video
                      src={originalVideoUrl!}
                      controls
                      playsInline
                      className="w-full max-h-[45vh] mx-auto block"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold">Mathematically Restored</span>
                    <span className="text-emerald-400 text-[11px]">Zero Quality Loss</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-emerald-500/40 bg-black shadow-lg">
                    <video
                      src={resultVideo.url}
                      controls
                      playsInline
                      autoPlay
                      className="w-full max-h-[45vh] mx-auto block"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
