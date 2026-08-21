import { Muxer, ArrayBufferTarget } from 'webm-muxer';
import { offlineRenderRoot } from './offlineRenderRoot';
import { showEngine } from './showEngine';
import { audioEngine } from './audioEngine';

const FPS = 30;
const VIDEO_BITRATE = 12_000_000;
const AUDIO_BITRATE = 192_000;
const AUDIO_CHUNK_FRAMES = 4800;

export function isOfflineRenderSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Feeds an AudioBuffer's PCM samples straight into an AudioEncoder — no
 * real-time playback involved, so this runs as fast as the encoder allows. */
function encodeAudioBuffer(buffer: AudioBuffer, startTime: number, endTime: number, encoder: AudioEncoder): void {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startTime * sampleRate));
  const endSample = Math.min(buffer.length, Math.ceil(endTime * sampleRate));
  const channels = buffer.numberOfChannels;

  for (let offset = startSample; offset < endSample; offset += AUDIO_CHUNK_FRAMES) {
    const frames = Math.min(AUDIO_CHUNK_FRAMES, endSample - offset);
    const planar = new Float32Array(frames * channels);
    for (let ch = 0; ch < channels; ch++) {
      planar.set(buffer.getChannelData(ch).subarray(offset, offset + frames), ch * frames);
    }
    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels: channels,
      timestamp: Math.round(((offset - startSample) / sampleRate) * 1_000_000),
      data: planar,
    });
    encoder.encode(audioData);
    audioData.close();
  }
}

export interface OfflineRenderOptions {
  startTime: number;
  endTime: number;
  fileNameBase: string;
  onProgress?: (fraction: number) => void;
}

/**
 * Renders the show to a .webm file without playing it in real time: drives
 * the live 3D canvas with a virtual clock (react-three-fiber's frameloop
 *="never" + advance()) so a frame only takes as long as it takes to render
 * and encode, not 1/30s of wall-clock waiting, and encodes audio straight
 * from the already-decoded PCM buffer instead of capturing real playback.
 * Returns an error string on failure, or null on success (file downloaded).
 */
export async function renderShowOffline(options: OfflineRenderOptions): Promise<string | null> {
  if (!isOfflineRenderSupported()) {
    return 'Este navegador não suporta renderização rápida (WebCodecs). Tente um Chrome/Edge recente.';
  }
  const state = offlineRenderRoot.get();
  if (!state) return 'A vista 3D ainda não está pronta — mude para 3D e tente novamente.';

  const canvas = state.gl.domElement;
  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return 'A vista 3D ainda não tem um tamanho visível.';

  const totalDuration = options.endTime - options.startTime;
  if (totalDuration <= 0) return 'Nada para renderizar — importe um áudio ou adicione marcações na timeline primeiro.';

  const frameCount = Math.max(1, Math.ceil(totalDuration * FPS));
  const decodedAudio = audioEngine.getDecodedBuffer();
  const hasAudio = decodedAudio != null;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'V_VP9', width, height, frameRate: FPS },
    audio: hasAudio
      ? { codec: 'A_OPUS', numberOfChannels: decodedAudio.numberOfChannels, sampleRate: decodedAudio.sampleRate }
      : undefined,
    firstTimestampBehavior: 'offset',
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('Offline render: video encoder error', e),
  });
  videoEncoder.configure({
    codec: 'vp09.00.10.08',
    width,
    height,
    bitrate: VIDEO_BITRATE,
    framerate: FPS,
    latencyMode: 'quality',
  });

  let audioEncoder: AudioEncoder | null = null;
  if (hasAudio) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => console.error('Offline render: audio encoder error', e),
    });
    audioEncoder.configure({
      codec: 'opus',
      numberOfChannels: decodedAudio.numberOfChannels,
      sampleRate: decodedAudio.sampleRate,
      bitrate: AUDIO_BITRATE,
    });
  }

  showEngine.reset(options.startTime);
  state.setFrameloop('never');

  try {
    for (let i = 0; i < frameCount; i++) {
      const showTime = options.startTime + i / FPS;
      showEngine.tick(showTime);

      const virtualElapsed = (i + 1) / FPS;
      state.advance(virtualElapsed);

      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1_000_000) / FPS) });
      videoEncoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
      frame.close();

      if (videoEncoder.encodeQueueSize > 6) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      options.onProgress?.((i + 1) / frameCount);
    }

    if (hasAudio && audioEncoder) {
      encodeAudioBuffer(decodedAudio, options.startTime, options.endTime, audioEncoder);
    }

    await videoEncoder.flush();
    videoEncoder.close();
    if (audioEncoder) {
      await audioEncoder.flush();
      audioEncoder.close();
    }
    muxer.finalize();
  } finally {
    state.setFrameloop('always');
  }

  const blob = new Blob([target.buffer], { type: 'video/webm' });
  if (blob.size < 1000) return 'O arquivo renderizado saiu vazio — tente novamente.';
  triggerDownload(blob, `${options.fileNameBase}.webm`);
  return null;
}
