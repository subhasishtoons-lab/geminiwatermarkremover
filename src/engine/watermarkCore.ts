import { BG_48_BASE64, BG_96_BASE64 } from './constants';

export interface WatermarkBox {
  size: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoiBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WatermarkSettings {
  presetKey?: string;
  gain?: number;
  offsetX?: number;
  offsetY?: number;
  sizeScale?: number;
  smoothEdges?: boolean;
}

export interface DetectionResult {
  matchFound: boolean;
  score: number;
  presetKey: string;
  name: string;
  offsetX: number;
  offsetY: number;
  sizeScale: number;
  gain: number;
}

// Global cached image elements for the calibrated alpha references
let cachedImg48: HTMLImageElement | null = null;
let cachedImg96: HTMLImageElement | null = null;
let initPromise: Promise<{ bg48: HTMLImageElement; bg96: HTMLImageElement }> | null = null;

export function loadBaseImages(): Promise<{ bg48: HTMLImageElement; bg96: HTMLImageElement }> {
  if (cachedImg48 && cachedImg96) {
    return Promise.resolve({ bg48: cachedImg48, bg96: cachedImg96 });
  }
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    let loaded = 0;
    const check = () => {
      loaded++;
      if (loaded === 2 && cachedImg48 && cachedImg96) {
        resolve({ bg48: cachedImg48, bg96: cachedImg96 });
      }
    };

    const img48 = new Image();
    img48.onload = () => {
      cachedImg48 = img48;
      check();
    };
    img48.onerror = reject;
    img48.src = BG_48_BASE64;

    const img96 = new Image();
    img96.onload = () => {
      cachedImg96 = img96;
      check();
    };
    img96.onerror = reject;
    img96.src = BG_96_BASE64;
  });

  return initPromise;
}

export const ALPHA_THRESHOLD = 0.002;
export const MAX_ALPHA = 0.99;
export const LOGO_VALUE = 255;

export function calculateAlphaMap(bgCaptureImageData: ImageData): Float32Array {
  const { width, height, data } = bgCaptureImageData;
  const alphaMap = new Float32Array(width * height);
  for (let i = 0; i < alphaMap.length; i++) {
    const idx = i * 4;
    alphaMap[i] = Math.max(data[idx], data[idx + 1], data[idx + 2]) / 255.0;
  }
  return alphaMap;
}

/**
 * Mathematically precise reverse alpha unblending
 * Original = (Watermarked - Logo * Alpha) / (1 - Alpha)
 */
export function removeWatermark(
  imageData: ImageData,
  alphaMap: Float32Array,
  position: RoiBox,
  options: { alphaGain?: number; smoothEdges?: boolean } = {}
): void {
  const { x, y, width, height } = position;
  const gain = Number.isFinite(options.alphaGain) && (options.alphaGain ?? 0) > 0 ? options.alphaGain! : 1;

  for (let row = 0; row < height; row++) {
    const targetY = y + row;
    if (targetY < 0 || targetY >= imageData.height) continue;

    for (let col = 0; col < width; col++) {
      const targetX = x + col;
      if (targetX < 0 || targetX >= imageData.width) continue;

      const imgIdx = (targetY * imageData.width + targetX) * 4;
      const alphaIdx = row * width + col;
      let alpha = alphaMap[alphaIdx] * gain;

      if (alpha < ALPHA_THRESHOLD) continue;
      alpha = Math.min(alpha, MAX_ALPHA);

      for (let c = 0; c < 3; c++) {
        const watermarked = imageData.data[imgIdx + c];
        const original = (watermarked - alpha * LOGO_VALUE) / (1.0 - alpha);
        imageData.data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(original)));
      }
    }
  }
}

export function getWatermarkInfo(width: number, height: number): WatermarkBox {
  const minDim = Math.min(width, height);
  const ratio = minDim / 1536;
  const size = Math.max(16, Math.round(96 * ratio));
  const margin = Math.max(8, Math.round(64 * ratio));
  return {
    size,
    x: Math.max(0, width - margin - size),
    y: Math.max(0, height - margin - size),
    width: size,
    height: size,
  };
}

export function getVeoWatermark(width: number, height: number): WatermarkBox {
  const base = Math.min(width, height);
  const size = Math.max(24, Math.min(Math.round(base / 15), base));
  const margin = Math.round(base / 10);
  return {
    size,
    x: Math.max(0, width - margin - size),
    y: Math.max(0, height - margin - size),
    width: size,
    height: size,
  };
}

export function getRoi(width: number, height: number, wm: WatermarkBox): RoiBox {
  const pad = Math.round(wm.size * 0.6);
  const rx = Math.max(0, Math.min(width - 1, wm.x - pad));
  const ry = Math.max(0, Math.min(height - 1, wm.y - pad));
  const rw = Math.max(1, Math.min(width - rx, wm.width + pad * 2));
  const rh = Math.max(1, Math.min(height - ry, wm.height + pad * 2));
  return { x: rx, y: ry, width: rw, height: rh };
}

export function resolveBox(
  base: WatermarkBox,
  width: number,
  height: number,
  opts: WatermarkSettings = {}
): WatermarkBox {
  const sizeScale = opts.sizeScale || 1;
  const size = Math.max(8, Math.min(Math.round(base.size * sizeScale), Math.min(width, height)));
  const x = Math.max(0, Math.min(base.x + Math.round(opts.offsetX || 0), width - size));
  const y = Math.max(0, Math.min(base.y + Math.round(opts.offsetY || 0), height - size));
  return { size, x, y, width: size, height: size };
}

export function buildAlpha(
  bgImg: CanvasImageSource,
  roi: RoiBox,
  wm: WatermarkBox,
  gain: number
): Float32Array {
  const count = roi.width * roi.height;
  const alphaMap = new Float32Array(count);
  const offX = wm.x - roi.x;
  const offY = wm.y - roi.y;

  const c = document.createElement('canvas');
  c.width = wm.size;
  c.height = wm.size;
  const cx = c.getContext('2d', { willReadFrequently: true });
  if (!cx) return alphaMap;

  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(bgImg, 0, 0, wm.size, wm.size);
  const data = cx.getImageData(0, 0, wm.size, wm.size).data;

  for (let row = 0; row < wm.size; row++) {
    for (let col = 0; col < wm.size; col++) {
      const ri = (offY + row) * roi.width + (offX + col);
      if (ri < 0 || ri >= count) continue;
      const o = (row * wm.size + col) * 4;
      const a = (Math.max(data[o], data[o + 1], data[o + 2]) / 255) * gain;
      alphaMap[ri] = a > 0 ? Math.min(a, 0.99) : 0;
    }
  }
  return alphaMap;
}

export function cleanFrame(
  bgImg: CanvasImageSource,
  imageData: ImageData,
  width: number,
  height: number,
  base: WatermarkBox,
  opts: WatermarkSettings = {}
): { wm: WatermarkBox; roi: RoiBox } {
  const wm = resolveBox(base, width, height, opts);
  const roi = getRoi(width, height, wm);
  const alpha = buildAlpha(bgImg, roi, wm, opts.gain ?? 1);
  removeWatermark(
    imageData,
    alpha,
    { x: roi.x, y: roi.y, width: roi.width, height: roi.height },
    { alphaGain: 1, smoothEdges: opts.smoothEdges }
  );
  return { wm, roi };
}

export function getAdaptiveImagePreset(
  presetKey: string,
  width = 1536,
  height = 1536
): { gain: number; offsetX: number; offsetY: number; sizeScale: number } {
  if (presetKey === 'classic') {
    return { gain: 1.0, offsetX: 0, offsetY: 0, sizeScale: 1.0 };
  }
  const minDim = Math.min(width, height || width);
  const scaleRatio = Math.max(0.25, Math.min(1.5, minDim / 1536));
  const adaptiveOffset = Math.round(-128 * scaleRatio);
  return {
    gain: 0.6,
    offsetX: adaptiveOffset,
    offsetY: adaptiveOffset,
    sizeScale: 1.0,
  };
}

export function getAdaptiveVideoPreset(
  presetKey: string,
  width = 720,
  height = 720
): { gain: number; offsetX: number; offsetY: number; sizeScale: number } {
  if (presetKey === 'corner') {
    return { gain: 0.6, offsetX: 0, offsetY: 0, sizeScale: 1.0 };
  }
  if (presetKey === 'sparkle') {
    const minDim = Math.min(width, height || width);
    const m = Math.max(16, Math.round(192 * (minDim / 1536)));
    const s = Math.max(24, Math.round(96 * (minDim / 1536)));
    const baseDim = Math.min(width, height);
    const veoBase = {
      size: Math.max(24, Math.min(Math.round(baseDim / 15), baseDim)),
      margin: Math.round(baseDim / 10),
    };
    const baseX = Math.max(0, width - veoBase.margin - veoBase.size);
    const baseY = Math.max(0, height - veoBase.margin - veoBase.size);
    return {
      gain: 0.6,
      offsetX: Math.max(0, width - m - s) - baseX,
      offsetY: Math.max(0, height - m - s) - baseY,
      sizeScale: 1.0,
    };
  }
  const minDim = Math.min(width, height || width);
  const scaleRatio = Math.max(0.3, Math.min(1.5, minDim / 720));
  const adaptiveOffset = Math.round(-24 * scaleRatio);
  return {
    gain: 0.6,
    offsetX: adaptiveOffset,
    offsetY: adaptiveOffset,
    sizeScale: 1.0,
  };
}

// ── Watermark Auto-Detection System ──
interface AlphaTemplate {
  raw: Uint8ClampedArray;
  alphas: Float32Array;
  gradMag: Float32Array;
  size: number;
}

const alphaTemplateCache = new Map<number, AlphaTemplate>();

export function getAlphaTemplateData(bgImg: CanvasImageSource, size: number): AlphaTemplate {
  if (alphaTemplateCache.has(size)) {
    return alphaTemplateCache.get(size)!;
  }
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const cx = c.getContext('2d', { willReadFrequently: true });
  if (!cx) {
    const empty = { raw: new Uint8ClampedArray(0), alphas: new Float32Array(0), gradMag: new Float32Array(0), size };
    return empty;
  }
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(bgImg, 0, 0, size, size);
  const raw = cx.getImageData(0, 0, size, size).data;
  const alphas = new Float32Array(size * size);
  for (let i = 0; i < alphas.length; i++) {
    const o = i * 4;
    alphas[i] = Math.max(raw[o], raw[o + 1], raw[o + 2]) / 255.0;
  }
  const gradMag = new Float32Array(size * size);
  for (let r = 1; r < size - 1; r++) {
    for (let col = 1; col < size - 1; col++) {
      const idx = r * size + col;
      const gx = alphas[idx + 1] - alphas[idx - 1];
      const gy = alphas[(r + 1) * size + col] - alphas[(r - 1) * size + col];
      gradMag[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  const template: AlphaTemplate = { raw, alphas, gradMag, size };
  alphaTemplateCache.set(size, template);
  return template;
}

export function evaluateCandidateMatch(
  imageData: ImageData,
  width: number,
  height: number,
  bgImg: CanvasImageSource,
  box: { x: number; y: number; size: number }
): { score: number; variance: number } {
  const { x, y, size } = box;
  if (x < 0 || y < 0 || x + size > width || y + size > height || size <= 0) {
    return { score: -1, variance: 0 };
  }

  const template = getAlphaTemplateData(bgImg, size);
  const { alphas, gradMag } = template;
  let sumL = 0, sumA = 0;
  let sumL2 = 0, sumA2 = 0;
  let sumLA = 0;
  let sumG = 0, sumGA = 0;
  let sumG2 = 0, sumGA2 = 0;
  let sumGGA = 0;
  let n = 0;
  let nGrad = 0;

  const step = size > 80 ? 2 : 1;
  for (let r = 0; r < size; r += step) {
    const imgRow = y + r;
    for (let col = 0; col < size; col += step) {
      const imgCol = x + col;
      const imgIdx = (imgRow * width + imgCol) * 4;
      const alphaIdx = r * size + col;

      const rVal = imageData.data[imgIdx];
      const gVal = imageData.data[imgIdx + 1];
      const bVal = imageData.data[imgIdx + 2];
      const lum = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
      const alpha = alphas[alphaIdx];

      sumL += lum;
      sumA += alpha;
      sumL2 += lum * lum;
      sumA2 += alpha * alpha;
      sumLA += lum * alpha;
      n++;

      // Gradient analysis (high-frequency diamond sparkle edges)
      if (
        r > 0 &&
        r < size - 1 &&
        col > 0 &&
        col < size - 1 &&
        imgRow > 0 &&
        imgRow < height - 1 &&
        imgCol > 0 &&
        imgCol < width - 1
      ) {
        const leftIdx = (imgRow * width + (imgCol - 1)) * 4;
        const rightIdx = (imgRow * width + (imgCol + 1)) * 4;
        const topIdx = ((imgRow - 1) * width + imgCol) * 4;
        const botIdx = ((imgRow + 1) * width + imgCol) * 4;

        const lumL = 0.299 * imageData.data[leftIdx] + 0.587 * imageData.data[leftIdx + 1] + 0.114 * imageData.data[leftIdx + 2];
        const lumR = 0.299 * imageData.data[rightIdx] + 0.587 * imageData.data[rightIdx + 1] + 0.114 * imageData.data[rightIdx + 2];
        const lumT = 0.299 * imageData.data[topIdx] + 0.587 * imageData.data[topIdx + 1] + 0.114 * imageData.data[topIdx + 2];
        const lumB = 0.299 * imageData.data[botIdx] + 0.587 * imageData.data[botIdx + 1] + 0.114 * imageData.data[botIdx + 2];

        const gx = lumR - lumL;
        const gy = lumB - lumT;
        const gMag = Math.sqrt(gx * gx + gy * gy);
        const tGrad = gradMag[alphaIdx];

        sumG += gMag;
        sumGA += tGrad;
        sumG2 += gMag * gMag;
        sumGA2 += tGrad * tGrad;
        sumGGA += gMag * tGrad;
        nGrad++;
      }
    }
  }

  if (n === 0) return { score: -1, variance: 0 };

  const varL = sumL2 - (sumL * sumL) / n;
  const varA = sumA2 - (sumA * sumA) / n;
  let corrLum = 0;
  if (varL > 1e-4 && varA > 1e-4) {
    corrLum = (sumLA - (sumL * sumA) / n) / Math.sqrt(varL * varA);
  }

  let corrGrad = 0;
  if (nGrad > 0) {
    const varG = sumG2 - (sumG * sumG) / nGrad;
    const varGA = sumGA2 - (sumGA * sumGA) / nGrad;
    if (varG > 1e-4 && varGA > 1e-4) {
      corrGrad = (sumGGA - (sumG * sumGA) / nGrad) / Math.sqrt(varG * varGA);
    }
  }

  // Watermarks are bright/white semi-transparent sparkles, producing positive correlation
  const combinedScore = Math.max(0, corrLum * 0.6 + corrGrad * 0.4);
  return { score: combinedScore, variance: varL / n };
}

export function detectWatermarkCandidate(
  imageData: ImageData,
  width: number,
  height: number,
  bgImg: CanvasImageSource
): DetectionResult {
  const minDim = Math.min(width, height);
  const baseRatio = minDim / 1536;
  const base = getWatermarkInfo(width, height);

  const layoutFamilies = [
    {
      presetKey: 'new',
      name: 'Gemini & Nano Banana (Adaptive)',
      baseSize: base.size,
      calcPos: (s: number) => {
        const m = Math.max(8, Math.round(192 * baseRatio));
        return { x: Math.max(0, width - m - s), y: Math.max(0, height - m - s) };
      },
      gain: 0.6,
      prior: 1.08,
    },
    {
      presetKey: 'classic',
      name: 'Classic Corner (Adaptive)',
      baseSize: base.size,
      calcPos: (s: number) => {
        const m = Math.max(8, Math.round(64 * baseRatio));
        return { x: Math.max(0, width - m - s), y: Math.max(0, height - m - s) };
      },
      gain: 1.0,
      prior: 1.04,
    },
    {
      presetKey: 'new',
      name: 'Gemini & Nano Banana (Fixed 96px Inset)',
      baseSize: 96,
      calcPos: (s: number) => {
        const m = minDim >= 1400 ? 192 : Math.round(128 * Math.max(0.5, minDim / 1024));
        return { x: Math.max(0, width - m - s), y: Math.max(0, height - m - s) };
      },
      gain: 0.6,
      prior: 1.02,
    },
    {
      presetKey: 'classic',
      name: 'Classic Corner (Fixed 96px)',
      baseSize: 96,
      calcPos: (s: number) => {
        const m = minDim >= 1024 ? 64 : 32;
        return { x: Math.max(0, width - m - s), y: Math.max(0, height - m - s) };
      },
      gain: 1.0,
      prior: 1.01,
    },
  ];

  const scalePyramid = [0.55, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5, 1.7];
  let bestMatch: {
    layout: (typeof layoutFamilies)[0];
    size: number;
    scale: number;
    x: number;
    y: number;
    score: number;
  } | null = null;
  let bestScore = -1;

  for (const layout of layoutFamilies) {
    for (const scale of scalePyramid) {
      const s = Math.max(16, Math.min(Math.round(layout.baseSize * scale), Math.min(width, height) - 8));
      const pos = layout.calcPos(s);
      const { score } = evaluateCandidateMatch(imageData, width, height, bgImg, { x: pos.x, y: pos.y, size: s });
      const weightedScore = score * (layout.prior || 1.0);
      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        bestMatch = {
          layout,
          size: s,
          scale,
          x: pos.x,
          y: pos.y,
          score: weightedScore,
        };
      }
    }
  }

  if (bestMatch && bestMatch.score > 0.05) {
    let refinedX = bestMatch.x;
    let refinedY = bestMatch.y;
    let refinedSize = bestMatch.size;
    let refinedScore = bestMatch.score;

    const fineSizes = [
      Math.max(16, Math.round(bestMatch.size * 0.9)),
      Math.max(16, Math.round(bestMatch.size * 0.95)),
      bestMatch.size,
      Math.min(Math.min(width, height) - 8, Math.round(bestMatch.size * 1.05)),
      Math.min(Math.min(width, height) - 8, Math.round(bestMatch.size * 1.1)),
    ];
    const uniqueSizes = [...new Set(fineSizes)];

    for (const testSize of uniqueSizes) {
      for (let dy = -16; dy <= 16; dy += 4) {
        for (let dx = -16; dx <= 16; dx += 4) {
          const testX = Math.max(0, Math.min(width - testSize, bestMatch.x + dx));
          const testY = Math.max(0, Math.min(height - testSize, bestMatch.y + dy));
          const { score } = evaluateCandidateMatch(imageData, width, height, bgImg, {
            x: testX,
            y: testY,
            size: testSize,
          });
          const weightedScore = score * (bestMatch.layout.prior || 1.0);
          if (weightedScore > refinedScore) {
            refinedScore = weightedScore;
            refinedX = testX;
            refinedY = testY;
            refinedSize = testSize;
          }
        }
      }
    }

    const calculatedScale = Math.round((refinedSize / base.size) * 100) / 100;
    return {
      matchFound: refinedScore >= 0.1,
      score: Math.min(1.0, refinedScore),
      presetKey: bestMatch.layout.presetKey,
      name: `${bestMatch.layout.name} (${refinedSize}px)`,
      offsetX: refinedX - base.x,
      offsetY: refinedY - base.y,
      sizeScale: Math.max(0.5, Math.min(2.5, calculatedScale)),
      gain: bestMatch.layout.gain || 0.6,
    };
  }

  const fallbackOffset = Math.round(-128 * baseRatio);
  return {
    matchFound: false,
    score: 0,
    presetKey: 'new',
    name: 'Gemini & Flow (Standard Fallback)',
    offsetX: fallbackOffset,
    offsetY: fallbackOffset,
    sizeScale: 1.0,
    gain: 0.6,
  };
}

export function detectVideoWatermarkCandidate(
  imageData: ImageData,
  width: number,
  height: number,
  bgImg: CanvasImageSource
): DetectionResult {
  const veoBase = getVeoWatermark(width, height);
  const minDim = Math.min(width, height);
  const scaleRatio = Math.max(0.3, Math.min(1.5, minDim / 720));

  const candidateConfigs = [
    {
      name: 'Veo Video Corner (Standard)',
      presetKey: 'corner',
      offsetX: 0,
      offsetY: 0,
      sizeScale: 1.0,
      gain: 0.6,
      prior: 1.05,
    },
    {
      name: 'Veo Video Inset Sparkle',
      presetKey: 'sparkle',
      ...getAdaptiveVideoPreset('sparkle', width, height),
      prior: 1.08,
    },
    {
      name: 'Gemini Omni Video Adaptive',
      presetKey: 'corner',
      offsetX: Math.round(-24 * scaleRatio),
      offsetY: Math.round(-24 * scaleRatio),
      sizeScale: 1.0,
      gain: 0.6,
      prior: 1.02,
    },
  ];

  let best = candidateConfigs[0];
  let bestScore = -1;

  for (const cfg of candidateConfigs) {
    const wm = resolveBox(veoBase, width, height, cfg);
    const { score } = evaluateCandidateMatch(imageData, width, height, bgImg, wm);
    const weighted = score * cfg.prior;
    if (weighted > bestScore) {
      bestScore = weighted;
      best = cfg;
    }
  }

  return {
    matchFound: bestScore >= 0.08,
    score: Math.min(1.0, Math.max(0, bestScore)),
    presetKey: best.presetKey,
    name: best.name,
    offsetX: best.offsetX,
    offsetY: best.offsetY,
    sizeScale: best.sizeScale,
    gain: best.gain,
  };
}
