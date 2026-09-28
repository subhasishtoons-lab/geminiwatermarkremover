import React from 'react';
import { Cpu, CheckCircle, XCircle, ShieldCheck, Zap, Sparkles, Layers } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Intro Hero */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Cpu className="w-3.5 h-3.5" />
          The Science of Reverse Alpha Blending
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
          Why Reverse Alpha Blending Outperforms Generative AI
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Google Gemini, Veo, and Flow embed visible watermarks using standard transparent alpha compositing.
          Because the original pixels still exist beneath the transparency, we can restore them with exact mathematics
          rather than guessing with AI.
        </p>
      </div>

      {/* The Math Formula Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto glow-card">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 text-center">
          The Fundamental Compositing Equation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-2 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
            <div className="text-xs font-semibold text-amber-400">1. How Gemini Watermarks Media:</div>
            <div className="font-mono text-sm sm:text-base text-slate-200 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              C<sub className="text-xs text-amber-400">blended</sub> = α · C<sub className="text-xs text-indigo-400">logo</sub> + (1 - α) · C<sub className="text-xs text-emerald-400">orig</sub>
            </div>
            <p className="text-[11px] text-slate-400">
              The visible 4-pointed sparkle is layered with opacity α over your original content.
            </p>
          </div>

          <div className="space-y-2 bg-slate-950/80 p-4 rounded-xl border border-indigo-500/30">
            <div className="text-xs font-semibold text-emerald-400">2. How Our Tool Unblends It:</div>
            <div className="font-mono text-sm sm:text-base text-slate-200 bg-slate-900/90 p-3 rounded-lg border border-indigo-500/20">
              C<sub className="text-xs text-emerald-400">orig</sub> = (C<sub className="text-xs text-amber-400">blended</sub> - α · 255) / (1 - α)
            </div>
            <p className="text-[11px] text-slate-400">
              We mathematically invert the linear equation pixel-by-pixel using calibrated reverse alpha masks.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Grid: Reverse Alpha vs Generative Inpainting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Reverse Alpha Blending (Our Tool) */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">Mathematical Alpha Unblending</h4>
              <p className="text-xs text-emerald-400 font-medium">Used by this tool</p>
            </div>
          </div>

          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">100% Original Pixels:</strong> Reconstructs the exact colors and
                sub-pixel details hidden beneath the semi-transparent logo.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">Zero Blur & Artifacts:</strong> Unlike AI inpainting models that smudge
                backgrounds, alpha unblending leaves clean sharp textures.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">Instant Execution:</strong> Runs in milliseconds directly on your
                CPU/GPU inside your browser. No wait times or queueing.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">Complete Privacy:</strong> Your personal media never touches any external
                server. 100% client-side privacy.
              </span>
            </li>
          </ul>
        </div>

        {/* Generative AI Inpainting */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">Generative AI Inpainting (Other Tools)</h4>
              <p className="text-xs text-rose-400 font-medium">E.g., LaMa, Stable Diffusion Erase</p>
            </div>
          </div>

          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">Hallucinates Pixels:</strong> Completely throws away the underlying
                data and attempts to invent new textures from surrounding pixels.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">Blurry Smudges:</strong> Leaves telltale smudged patches, melted text, or
                distorted patterns where the watermark was.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">Requires Server Upload:</strong> Most tools send your photos to external
                cloud servers with monthly subscriptions and quotas.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-100">Destroys Video Continuity:</strong> Causes flickering artifacts between
                consecutive video frames.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
