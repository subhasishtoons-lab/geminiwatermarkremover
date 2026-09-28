import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Shield, Check, FileQuestion } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'How is this different from standard watermark removers and AI inpainting?',
    answer:
      'Standard AI inpainting tools erase the watermarked area and use neural networks to hallucinate or guess replacement pixels, which results in obvious blurring, smearing, and loss of original texture. Our tool uses Reverse Alpha Blending: because Google Gemini and Veo embed watermarks using transparent alpha blending, the true original pixels are still preserved beneath the logo. By solving the blending equation backwards with calibrated reference masks, we restore the genuine original pixels with zero quality loss.',
  },
  {
    question: 'Which AI models and video formats are supported?',
    answer:
      'Images: Google Gemini 3.5, Gemini 3.6, Gemini 3.8, Nano Banana, and Google Flow outputs in PNG, JPG, WebP, and AVIF. Videos: Veo 3, Google Flow, and Gemini Omni in MP4, WebM, and MOV formats. All resolutions including 720p, 1080p, and 2K are supported with automatic ratio scaling.',
  },
  {
    question: 'Does this remove Google SynthID watermarks?',
    answer:
      'No. This tool removes the VISIBLE 4-pointed sparkle watermark logo placed in the corner or inset of the media. Google SynthID is an invisible, imperceptible steganographic signal embedded directly into pixel frequency distributions for algorithmic provenance detection. Stripping SynthID would require lossy degradation of the entire image, whereas our tool is designed to clean the visual aesthetic of your content losslessly.',
  },
  {
    question: 'Is my data and media private?',
    answer:
      'Yes, 100%. All processing—including video decoding, frame-by-frame alpha unblending, and video encoding—happens strictly inside your web browser on your own device using WebCodecs and HTML5 Canvas. Your files are never transmitted to any external server or third party.',
  },
  {
    question: 'Are original video audio tracks preserved?',
    answer:
      'Yes! When processing Veo or Gemini video clips, the tool preserves original AAC or Opus audio streams so your exported MP4 or WebM video retains full fidelity audio.',
  },
  {
    question: 'Can I batch-process multiple images at once?',
    answer:
      'Yes! You can drag and drop dozens of images simultaneously. Each image will be analyzed, auto-detected, and mathematically unblended, and you can download them all together in a single ZIP archive.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <HelpCircle className="w-3.5 h-3.5" />
          Frequently Asked Questions
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-100">
          Everything You Need to Know
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Technical insights into client-side alpha unblending for Gemini & Veo
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all ${
                isOpen
                  ? 'bg-slate-900/90 border-indigo-500/40 shadow-lg'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
              >
                <span className="text-sm font-semibold text-slate-200">{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    isOpen ? 'rotate-180 text-indigo-400' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
