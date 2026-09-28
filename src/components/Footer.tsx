import React from 'react';
import { ShieldCheck, Heart, Sparkles, Lock, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950/60 mt-16 py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="font-bold text-slate-200">Gemini & Veo Watermark Remover</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Deterministic Math Engine
            </span>
          </div>
          <p className="text-slate-400">
            Powered by reverse alpha compositing mathematics. Free & open utility for AI creators.
          </p>
          <p className="text-xs text-slate-400 pt-1 flex items-center justify-center md:justify-start gap-1.5">
            Designed by <span className="font-semibold text-slate-200 hover:text-indigo-300 transition-colors">Subhasish Phukan</span>
          </p>
        </div>

        <div className="flex items-center gap-6 text-slate-400 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Zero Server Upload</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Browser WebCodecs</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
