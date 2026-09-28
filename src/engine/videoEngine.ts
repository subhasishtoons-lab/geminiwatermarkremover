import {
  loadBaseImages,
  getVeoWatermark,
  getWatermarkInfo,
  cleanFrame,
  detectVideoWatermarkCandidate,
  WatermarkSettings,
  DetectionResult,
} from './watermarkCore';

export interface VideoProcessingProgress {
  frame: number;
  totalFrames?: number;
  progress: number; // 0 to 1
  phase: 'extracting' | 'processing' | 'encoding' | 'finalizing';
  statusText: string;
}

export class VideoWatermarkProcessor {
  /**
   * Extract video frame at specified time (in seconds)
   */
  static async extractFrame(
    file: File | Blob,
    timeOffset = 1.0
  ): Promise<{ imageData: ImageData; width: number; height: number; duration: number }> {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const url = URL.createObjectURL(file);
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = (e) => reject(new Error('Failed to load video metadata: ' + e));
    });

    const duration = video.duration || 1;
    const seekTime = Math.min(Math.max(0.2, timeOffset), Math.max(0.2, duration - 0.2));
    video.currentTime = seekTime;

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 1500); // safety fallback
    });

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      URL.revokeObjectURL(url);
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    URL.revokeObjectURL(url);
    video.src = '';
    video.remove();

    return { imageData, width, height, duration };
  }

  /**
   * Run auto detection on a video
   */
  static async detectVideoWatermark(
    file: File | Blob,
    onProgress?: (text: string) => void
  ): Promise<{
    detection: DetectionResult;
    previewFrame: { imageData: ImageData; width: number; height: number };
  }> {
    onProgress?.('Extracting video candidate frame...');
    const { imageData, width, height } = await this.extractFrame(file, 1.0);
    const { bg96 } = await loadBaseImages();

    onProgress?.('Scanning for Veo / Gemini watermark signatures...');
    const detection = detectVideoWatermarkCandidate(imageData, width, height, bg96);

    return {
      detection,
      previewFrame: { imageData, width, height },
    };
  }

  /**
   * Clean a full video using mediabunny (WebCodecs) or MediaRecorder fallback
   */
  static async processVideo(
    file: File,
    settings: WatermarkSettings,
    onProgress?: (progress: VideoProcessingProgress) => void
  ): Promise<{ blob: Blob; url: string; format: string }> {
    const { bg96 } = await loadBaseImages();

    // Check if browser supports WebCodecs and mediabunny
    const hasWebCodecs =
      typeof window !== 'undefined' &&
      typeof (window as unknown as { VideoEncoder: unknown }).VideoEncoder !== 'undefined' &&
      typeof (window as unknown as { VideoDecoder: unknown }).VideoDecoder !== 'undefined';

    if (hasWebCodecs) {
      try {
        return await this.processWithMediaBunny(file, bg96, settings, onProgress);
      } catch (err) {
        console.warn('MediaBunny processing encountered an issue, falling back to MediaRecorder:', err);
      }
    }

    // Fallback: Real-time Canvas + MediaRecorder
    return await this.processWithMediaRecorder(file, bg96, settings, onProgress);
  }

  private static async processWithMediaBunny(
    file: File,
    bgImg: HTMLImageElement,
    settings: WatermarkSettings,
    onProgress?: (progress: VideoProcessingProgress) => void
  ): Promise<{ blob: Blob; url: string; format: string }> {
    onProgress?.({
      frame: 0,
      progress: 0.05,
      phase: 'extracting',
      statusText: 'Initializing video decoder engine...',
    });

    // Dynamic import mediabunny via dynamic loader
    const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const mb = await dynamicImport('https://cdn.jsdelivr.net/npm/mediabunny@1.52.3/+esm');
    const {
      ALL_FORMATS,
      BlobSource,
      BufferTarget,
      CanvasSource,
      EncodedAudioPacketSource,
      Input,
      Mp4OutputFormat,
      Output,
      QUALITY_HIGH,
      VideoSampleSink,
      canEncodeVideo,
    } = mb;

    if (canEncodeVideo && !(await canEncodeVideo('avc'))) {
      throw new Error('Your browser cannot encode H.264 video with WebCodecs');
    }

    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      input.dispose?.();
      throw new Error('No decodable video track found.');
    }

    const width = videoTrack.displayWidth ?? videoTrack.codedWidth;
    const height = videoTrack.displayHeight ?? videoTrack.codedHeight;
    const duration = (await input.computeDuration().catch(() => 0)) || 1;

    let frameRate = 30;
    try {
      const stats = await videoTrack.computePacketStats(120);
      if (stats?.averagePacketRate) frameRate = Math.round(stats.averagePacketRate);
    } catch {
      // default 30
    }

    const isGeminiMode = settings.presetKey === 'gemini';
    const base = isGeminiMode ? getWatermarkInfo(width, height) : getVeoWatermark(width, height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context unavailable');

    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    const videoSource = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate: QUALITY_HIGH,
      keyFrameInterval: 2,
      sizeChangeBehavior: 'passThrough',
    });
    output.addVideoTrack(videoSource, { frameRate });

    let audioSource: unknown = null;
    try {
      const audioTrack = await input.getPrimaryAudioTrack();
      if (audioTrack) {
        const audioCodec = await audioTrack.getCodec();
        const audioDecoderConfig = await audioTrack.getDecoderConfig().catch(() => null);
        if (audioCodec && audioDecoderConfig) {
          audioSource = new EncodedAudioPacketSource(audioCodec);
          output.addAudioTrack(audioSource as never);
        }
      }
    } catch {
      audioSource = null;
    }

    await output.start();

    const fallbackDur = frameRate > 0 ? 1 / frameRate : 1 / 30;
    const sink = new VideoSampleSink(videoTrack);
    let firstTimestamp: number | null = null;
    let lastTimestamp = -1;
    let frameIndex = 0;
    const estimatedTotalFrames = Math.max(1, Math.round(duration * frameRate));

    for await (const sample of sink.samples()) {
      if (firstTimestamp === null) firstTimestamp = sample.timestamp;
      let timestamp = sample.timestamp - (firstTimestamp ?? sample.timestamp);
      if (!(timestamp >= 0)) timestamp = 0;
      if (timestamp <= lastTimestamp) timestamp = lastTimestamp + fallbackDur;
      const dur = Number.isFinite(sample.duration) && sample.duration > 0 ? sample.duration : fallbackDur;

      // Draw original sample onto canvas
      ctx.drawImage(sample, 0, 0);
      sample.close?.();

      // Reverse alpha blend watermark region
      const imgData = ctx.getImageData(0, 0, width, height);
      cleanFrame(bgImg, imgData, width, height, base, settings);
      ctx.putImageData(imgData, 0, 0);

      await videoSource.add(timestamp, dur);
      lastTimestamp = timestamp;
      frameIndex++;

      const progressRatio = Math.min(0.98, timestamp / duration);
      onProgress?.({
        frame: frameIndex,
        totalFrames: estimatedTotalFrames,
        progress: progressRatio,
        phase: 'processing',
        statusText: `Unblending watermark frame ${frameIndex} / ${estimatedTotalFrames} (${Math.round(progressRatio * 100)}%)`,
      });
    }

    // Process audio track if present
    if (audioSource) {
      onProgress?.({
        frame: frameIndex,
        totalFrames: estimatedTotalFrames,
        progress: 0.98,
        phase: 'encoding',
        statusText: 'Preserving original audio track...',
      });
      try {
        const audioTrack = await input.getPrimaryAudioTrack();
        if (audioTrack) {
          const audioSink = new (mb as { EncodedPacketSink: new (track: unknown) => { packets: () => AsyncIterable<unknown> } }).EncodedPacketSink(audioTrack);
          for await (const packet of audioSink.packets()) {
            await (audioSource as { add: (packet: unknown) => Promise<void> }).add(packet);
          }
        }
      } catch (e) {
        console.warn('Audio transfer failed:', e);
      }
    }

    onProgress?.({
      frame: frameIndex,
      totalFrames: estimatedTotalFrames,
      progress: 0.99,
      phase: 'finalizing',
      statusText: 'Finalizing MP4 video container...',
    });

    await output.finalize();
    input.dispose?.();

    const buffer = target.buffer;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    return { blob, url, format: 'mp4' };
  }

  /**
   * MediaRecorder fallback for browsers without WebCodecs
   */
  private static async processWithMediaRecorder(
    file: File,
    bgImg: HTMLImageElement,
    settings: WatermarkSettings,
    onProgress?: (progress: VideoProcessingProgress) => void
  ): Promise<{ blob: Blob; url: string; format: string }> {
    onProgress?.({
      frame: 0,
      progress: 0.05,
      phase: 'extracting',
      statusText: 'Preparing video stream...',
    });

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
    });

    const width = video.videoWidth;
    const height = video.videoHeight;
    const duration = video.duration || 1;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas unavailable');

    const base = settings.presetKey === 'gemini' ? getWatermarkInfo(width, height) : getVeoWatermark(width, height);

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(100);

    const stepInterval = 1 / 30;
    let currentTime = 0;
    let frameCount = 0;
    const totalFrames = Math.max(1, Math.round(duration * 30));

    while (currentTime < duration) {
      video.currentTime = currentTime;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        setTimeout(resolve, 80);
      });

      ctx.drawImage(video, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      cleanFrame(bgImg, imgData, width, height, base, settings);
      ctx.putImageData(imgData, 0, 0);

      frameCount++;
      currentTime += stepInterval;

      const progress = Math.min(0.98, currentTime / duration);
      onProgress?.({
        frame: frameCount,
        totalFrames,
        progress,
        phase: 'processing',
        statusText: `Processing frame ${frameCount} of ${totalFrames} (${Math.round(progress * 100)}%)`,
      });
    }

    recorder.stop();
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    URL.revokeObjectURL(videoUrl);
    video.src = '';
    video.remove();

    const outputType = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);

    return { blob, url, format: outputType };
  }
}
