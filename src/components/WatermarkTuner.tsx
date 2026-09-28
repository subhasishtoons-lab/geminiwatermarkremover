import React from 'react';
import { Sliders, RefreshCw, Wand2, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { WatermarkSettings, DetectionResult } from '../engine/watermarkCore';

interface WatermarkTunerProps {
  settings: WatermarkSettings;
  onChange: (newSettings: WatermarkSettings) => void;
  detection?: DetectionResult | null;
  onResetAuto?: () => void;
  isVideo?: boolean;
}

export const WatermarkTuner: React.FC<WatermarkTunerProps> = ({
  settings,
  onChange,
  detection,
  onResetAuto,
  isVideo = false,
}) => {
  const updateSetting = <K extends keyof WatermarkSettings>(key: K, val: WatermarkSettings[K]) => {
    onChange({
      ...settings,
      [key]: val,
    });
  };

  const currentPreset = settings.presetKey || 'auto';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Watermark Position & Alpha Tuner
              {detection?.matchFound ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Auto-Calibrated ({Math.round((detection.score || 0) * 100)}%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-3 h-3" />
                  Manual Position
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {detection?.name || 'Adjust reverse alpha blending parameters for perfect restoration'}
            </p>
          </div>
        </div>

        {onResetAuto && (
          <button
            type="button"
            onClick={onResetAuto}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            Reset to Auto
          </button>
        )}
      </div>

      {/* Preset Selector */}
      <div className="mb-5">
        <label className="text-xs font-medium text-slate-400 mb-2 block">Detection Preset</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {!isVideo ? (
            <>
              <button
                type="button"
                onClick={() => {
                  updateSetting('presetKey', 'new');
                  updateSetting('gain', 0.6);
                  updateSetting('offsetX', -24);
                  updateSetting('offsetY', -24);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'new'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Gemini & Nano Banana</div>
                <div className="text-[10px] opacity-75">Adaptive Inset (60% alpha)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateSetting('presetKey', 'classic');
                  updateSetting('gain', 1.0);
                  updateSetting('offsetX', 0);
                  updateSetting('offsetY', 0);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'classic'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Classic Corner</div>
                <div className="text-[10px] opacity-75">Bottom-Right (100% alpha)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateSetting('presetKey', 'fixed96');
                  updateSetting('gain', 0.6);
                  updateSetting('sizeScale', 1.0);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'fixed96'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Fixed 96px Inset</div>
                <div className="text-[10px] opacity-75">Large 2K/HD outputs</div>
              </button>

              <button
                type="button"
                onClick={() => updateSetting('presetKey', 'custom')}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'custom'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Custom Tuner</div>
                <div className="text-[10px] opacity-75">Manual slider adjustment</div>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  updateSetting('presetKey', 'sparkle');
                  updateSetting('gain', 0.6);
                  updateSetting('offsetX', -24);
                  updateSetting('offsetY', -24);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'sparkle'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Veo Video Sparkle</div>
                <div className="text-[10px] opacity-75">Veo 3 Standard Inset</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateSetting('presetKey', 'corner');
                  updateSetting('gain', 0.6);
                  updateSetting('offsetX', 0);
                  updateSetting('offsetY', 0);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'corner'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Veo Corner Standard</div>
                <div className="text-[10px] opacity-75">Corner Margin 10%</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateSetting('presetKey', 'gemini');
                  updateSetting('gain', 0.6);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'gemini'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Gemini Omni Video</div>
                <div className="text-[10px] opacity-75">Flow / Omni Video ratio</div>
              </button>

              <button
                type="button"
                onClick={() => updateSetting('presetKey', 'custom')}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  currentPreset === 'custom'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Custom Video Tuner</div>
                <div className="text-[10px] opacity-75">Manual box adjustment</div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Horizontal Offset X */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-300 font-medium">Horizontal (X Offset)</span>
            <span className="text-xs font-mono text-indigo-300">
              {(settings.offsetX || 0) > 0 ? `+${settings.offsetX}` : settings.offsetX || 0}px
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="80"
            step="1"
            value={settings.offsetX ?? 0}
            onChange={(e) => updateSetting('offsetX', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Vertical Offset Y */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-300 font-medium">Vertical (Y Offset)</span>
            <span className="text-xs font-mono text-indigo-300">
              {(settings.offsetY || 0) > 0 ? `+${settings.offsetY}` : settings.offsetY || 0}px
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="80"
            step="1"
            value={settings.offsetY ?? 0}
            onChange={(e) => updateSetting('offsetY', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Watermark Scale */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-300 font-medium">Scale (Size)</span>
            <span className="text-xs font-mono text-indigo-300">
              {Math.round((settings.sizeScale ?? 1.0) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.2"
            step="0.05"
            value={settings.sizeScale ?? 1.0}
            onChange={(e) => updateSetting('sizeScale', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Alpha Gain */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-300 font-medium">Alpha Strength (Gain)</span>
            <span className="text-xs font-mono text-indigo-300">
              {Math.round((settings.gain ?? 0.6) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.5"
            step="0.05"
            value={settings.gain ?? 0.6}
            onChange={(e) => updateSetting('gain', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};
