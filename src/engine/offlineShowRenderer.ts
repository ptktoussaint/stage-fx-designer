import { Muxer, ArrayBufferTarget, FileSystemWritableFileStreamTarget } from 'webm-muxer';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { offlineRenderRoot } from './offlineRenderRoot';
import { showEngine } from './showEngine';
import { audioEngine } from './audioEngine';

const FPS = 30;
const VIDEO_BITRATE = 12_000_000;
const AUDIO_BITRATE = 192_000;
const AUDIO_CHUNK_FRAMES = 4800;

// Not part of TypeScript's DOM lib yet, even though FileSystemFileHandle /
// FileSystemWritableFileStream themselves are.
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

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

type OutputTarget =
  | { kind: 'file'; stream: FileSystemWritableFileStream; target: FileSystemWritableFileStreamTarget }
  | { kind: 'buffer'; target: ArrayBufferTarget }
  | { kind: 'cancelled' };

/**
 * Buffering the entire encoded file in memory (the old approach, via
 * ArrayBufferTarget) is what was crashing the tab with "Out of Memory" on
 * long shows — a multi-minute video at this bitrate is hundreds of MB to
 * begin with, and the writer's grow-by-doubling + the final `.slice()` +
 * wrapping it in a Blob each transiently need another full copy on top of
 * that, easily reaching a couple GB for a single show.
 *
 * Where the File System Access API is available (Chrome/Edge — the same
 * browsers this feature already requires for WebCodecs), writing straight
 * to disk as each chunk is encoded keeps memory flat regardless of how long
 * the show is. Must be requested here, right after the render button's own
 * click, while the click's user-activation is still active.
 */
async function pickOutputTarget(fileNameBase: string): Promise<OutputTarget> {
  if (typeof window.showSaveFilePicker !== 'function') return { kind: 'buffer', target: new ArrayBufferTarget() };
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: `${fileNameBase}.webm`,
      types: [{ description: 'Vídeo WebM', accept: { 'video/webm': ['.webm'] } }],
    });
    const stream = await handle.createWritable();
    return { kind: 'file', stream, target: new FileSystemWritableFileStreamTarget(stream) };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { kind: 'cancelled' };
    return { kind: 'buffer', target: new ArrayBufferTarget() };
  }
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
  /** Used to frame the standard show-facing camera angle below. */
  stage: { width: number; depth: number; height: number; frontMargin: number };
  onProgress?: (fraction: number) => void;
}

/**
 * A fixed eye-level, front-of-stage view — like standing at the front of an
 * audience looking at the show — instead of whatever angle the user happens
 * to have orbited the live editing camera to. The render always uses this,
 * regardless of the live view, so the exported video is consistent and
 * doesn't depend on where the camera was left.
 */
function computeStandardShowCamera(stage: OfflineRenderOptions['stage']): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const AVERAGE_EYE_HEIGHT = 1.7;
  const back = stage.frontMargin + Math.max(stage.width, stage.depth) * 0.9;
  return {
    position: [stage.width / 2, stage.height + AVERAGE_EYE_HEIGHT, -back],
    target: [stage.width / 2, stage.height + 0.6, stage.depth * 0.3],
  };
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

  // Requested as early as possible — still inside the render button click's
  // user-activation window, which the save picker requires — so the rest of
  // the (potentially long) render streams straight to disk instead of
  // building up in memory.
  const output = await pickOutputTarget(options.fileNameBase);
  if (output.kind === 'cancelled') return null;

  const frameCount = Math.max(1, Math.ceil(totalDuration * FPS));
  const decodedAudio = audioEngine.getDecodedBuffer();
  const hasAudio = decodedAudio != null;

  let controls: OrbitControlsImpl | null = null;
  let previousCamera: { position: [number, number, number]; target: [number, number, number] } | null = null;

  try {
    const muxer = new Muxer({
      target: output.target,
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
      // 'quality' mode is dramatically slower to encode (it's tuned for
      // offline transcoding where time doesn't matter) — for VP9 software
      // encode that was often slower than real playback, which is exactly
      // backwards for a feature whose whole point is not waiting out the
      // show. 'realtime' is the mode built for fast, continuous encoding;
      // at this bitrate the quality difference isn't visible.
      latencyMode: 'realtime',
      // NOT 'prefer-hardware': despite being documented as advisory, some
      // browser/GPU combinations (confirmed in testing) throw a hard
      // "Encoder creation error" instead of falling back to software when no
      // hardware VP9 encoder is available — which would break the entire
      // export for those users. 'no-preference' lets the browser pick
      // whichever path actually works, hardware included where it exists.
      hardwareAcceleration: 'no-preference',
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

    // Swing the camera to a standard show-facing angle for the render,
    // independent of wherever the live editing view happens to be orbited —
    // the export should look the same every time. OrbitControls owns the
    // camera each frame (its own useFrame subscription re-derives
    // position/rotation from its internal spherical state), so moving
    // state.camera directly wouldn't stick; going through the controls
    // instance and calling update() rebases that internal state to match.
    controls = offlineRenderRoot.getControls();
    const showCamera = computeStandardShowCamera(options.stage);
    previousCamera = controls
      ? {
          position: [controls.object.position.x, controls.object.position.y, controls.object.position.z] as [
            number,
            number,
            number,
          ],
          target: [controls.target.x, controls.target.y, controls.target.z] as [number, number, number],
        }
      : null;
    if (controls) {
      controls.object.position.set(...showCamera.position);
      controls.target.set(...showCamera.target);
      controls.update();
    } else {
      state.camera.position.set(...showCamera.position);
      state.camera.lookAt(...showCamera.target);
    }

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
    // Only flushes any last buffered chunk to the target — writing straight
    // to disk still needs the file stream explicitly closed below to commit.
    muxer.finalize();

    if (output.kind === 'file') {
      await output.stream.close();
      return null;
    }

    const blob = new Blob([output.target.buffer], { type: 'video/webm' });
    if (blob.size < 1000) return 'O arquivo renderizado saiu vazio — tente novamente.';
    triggerDownload(blob, `${options.fileNameBase}.webm`);
    return null;
  } catch (e) {
    console.error('Offline render failed', e);
    if (output.kind === 'file') {
      await output.stream.abort().catch(() => {});
    }
    return 'A renderização falhou — veja o console para detalhes e tente novamente.';
  } finally {
    state.setFrameloop('always');
    if (controls && previousCamera) {
      controls.object.position.set(...previousCamera.position);
      controls.target.set(...previousCamera.target);
      controls.update();
    }
  }
}
