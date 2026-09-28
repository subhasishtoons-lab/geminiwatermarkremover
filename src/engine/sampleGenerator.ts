import { loadBaseImages, getWatermarkInfo } from './watermarkCore';

/**
 * Generates an AI-style sample image with a real Gemini alpha-blended watermark
 */
export async function generateSampleImage(theme: 'cosmic' | 'cyberpunk' | 'nature' = 'cosmic'): Promise<File> {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Background artwork
  if (theme === 'cosmic') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0d0824');
    grad.addColorStop(0.4, '#1b1b4b');
    grad.addColorStop(0.7, '#431459');
    grad.addColorStop(1, '#831843');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Nebula clouds
    for (let i = 0; i < 6; i++) {
      const x = (width * (i + 1)) / 7;
      const y = (height * (i % 2 === 0 ? 0.3 : 0.7));
      const rad = ctx.createRadialGradient(x, y, 10, x, y, 320);
      rad.addColorStop(0, i % 2 === 0 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(236, 72, 153, 0.35)');
      rad.addColorStop(0.6, 'rgba(59, 130, 246, 0.15)');
      rad.addColorStop(1, 'transparent');
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(x, y, 320, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 120; s++) {
      const sx = (s * 937) % width;
      const sy = (s * 541) % height;
      const sz = ((s % 3) + 1) * 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // Planetary orb
    const planetGrad = ctx.createRadialGradient(width * 0.72, height * 0.35, 20, width * 0.72, height * 0.35, 180);
    planetGrad.addColorStop(0, '#fde047');
    planetGrad.addColorStop(0.5, '#ea580c');
    planetGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(width * 0.72, height * 0.35, 140, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme === 'cyberpunk') {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.6, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Neon grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, height * 0.5);
      ctx.lineTo((x - width / 2) * 2.5 + width / 2, height);
      ctx.stroke();
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#064e3b');
    grad.addColorStop(0.5, '#047857');
    grad.addColorStop(1, '#10b981');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Overlay calibrated Gemini Watermark
  const { bg96 } = await loadBaseImages();
  const wm = getWatermarkInfo(width, height);
  // Adaptive offset: ~128 * (minDim / 1536)
  const offset = Math.round(-128 * (width / 1536));
  const posX = wm.x + offset;
  const posY = wm.y + offset;
  const wmSize = wm.size;

  // Real alpha blending: Draw watermark logo directly with 60% opacity (standard Gemini setting)
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.drawImage(bg96, posX, posY, wmSize, wmSize);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
  return new File([blob], `gemini_sample_${theme}_1024x1024.png`, { type: 'image/png' });
}

/**
 * Generates an animated sample video with Gemini / Veo watermark
 */
export async function generateSampleVideo(): Promise<File> {
  const width = 640;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const { bg96 } = await loadBaseImages();
  recorder.start();

  const totalFrames = 60; // 2 seconds
  const wmSize = 48;
  const margin = 32;
  const wmX = width - margin - wmSize;
  const wmY = height - margin - wmSize;

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / totalFrames;

    // Animated geometric background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, `hsl(${t * 360}, 65%, 15%)`);
    grad.addColorStop(1, `hsl(${(t * 360 + 120) % 360}, 75%, 25%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Glowing motion circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(
      width * 0.5 + Math.sin(t * Math.PI * 4) * 120,
      height * 0.5 + Math.cos(t * Math.PI * 4) * 80,
      60,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Veo / Gemini Sparkle watermark
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.drawImage(bg96, wmX, wmY, wmSize, wmSize);
    ctx.restore();

    await new Promise((r) => setTimeout(r, 25));
  }

  recorder.stop();
  await new Promise<void>((r) => {
    recorder.onstop = () => r();
  });

  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type: mimeType });
  return new File([blob], `veo_sample_video.${ext}`, { type: mimeType });
}
