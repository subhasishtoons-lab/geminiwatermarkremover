/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageRemover } from './components/ImageRemover';
import { VideoRemover } from './components/VideoRemover';
import { HowItWorks } from './components/HowItWorks';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'how-it-works' | 'faq'>('image');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Deterministic Reverse Alpha Blending</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
            <span className="text-emerald-400">Zero AI Hallucination</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Gemini & Veo 3{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Watermark Remover
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Remove visible sparkle logos from Google Gemini, Google Flow, Gemini Omni, and Veo 3
            media. 100% private, processed in your browser with mathematical precision.
          </p>

          {/* Quick Pillars */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Lossless Pixel Restoration</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>100% Client-Side Privacy</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Film className="w-4 h-4 text-purple-400" />
              <span>Both Image & Veo Video</span>
            </div>
          </div>
        </section>

        {/* Tab Content Section */}
        <section className="space-y-6">
          {activeTab === 'image' && (
            <div className="space-y-12">
              <ImageRemover />
              <HowItWorks />
              <FaqSection />
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-12">
              <VideoRemover />
              <HowItWorks />
              <FaqSection />
            </div>
          )}

          {activeTab === 'how-it-works' && <HowItWorks />}

          {activeTab === 'faq' && <FaqSection />}
        </section>
      </main>

      <Footer />
    </div>
  );
}
