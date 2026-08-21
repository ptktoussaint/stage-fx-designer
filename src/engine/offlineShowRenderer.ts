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

const MAX_PENDING_FILE_WRITES = 3;
const FILE_WRITE_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MiB, vs. webm-muxer's 16 MiB default

/**
 * webm-muxer's own disk writer never awaits its `stream.write()` calls — it
 * fires each one off and moves on to the next chunk as soon as it has one,
 * with no regard for whether the previous write actually finished. Its
 * internal buffer cap only limits how much UNFLUSHED data it holds before
 * starting a write; it does nothing to limit how many WRITES ARE ALREADY IN
 * FLIGHT. Normally the disk keeps up and this is invisible. But this
 * render's whole point is to blast through frames far faster than real
 * time — if the encoder can produce data faster than the disk can actually
 * write it, writes queue up faster than they drain, and every one of those
 * pending writes holds its own chunk of encoded data in memory. That's a
 * second, independent way to exhaust memory, on top of the "buffer the
 * whole file before writing anything" one already fixed — and the one
 * still happening even after switching to disk streaming.
 *
 * This wraps the real stream so the render loop can see how many writes are
 * still outstanding and pause until the disk catches up, the same way it
 * already pauses when the video encoder's own internal queue backs up.
 */
class TrackedWritable {
  pendingWrites = 0;
  private readonly real: FileSystemWritableFileStream;

  // Every method below is an instance field (an own property of `this`),
  // NOT a class-prototype method. That distinction matters here: this
  // instance's prototype gets swapped below to satisfy webm-muxer's
  // `instanceof FileSystemWritableFileStream` check, and a prototype-method
  // `write(...)` would have lived on TrackedWritable.prototype — exactly
  // the link that swap severs, leaving lookups fall through to the *real*
  // FileSystemWritableFileStream.prototype.write instead, which throws
  // "Illegal invocation" on an instance lacking its native internal state.
  // Own instance properties always win over whatever the prototype is, so
  // defining them this way survives the swap.
  write = (data: FileSystemWriteChunkType): Promise<void> => {
    this.pendingWrites++;
    return this.real.write(data).finally(() => {
      this.pendingWrites--;
    });
  };
  close = (): Promise<void> => this.real.close();
  abort = (reason?: unknown): Promise<void> => this.real.abort(reason);
  seek = (position: number): Promise<void> => this.real.seek(position);
  truncate = (size: number): Promise<void> => this.real.truncate(size);

  constructor(real: FileSystemWritableFileStream) {
    this.real = real;
    Object.setPrototypeOf(this, FileSystemWritableFileStream.prototype);
  }
}

type OutputTarget =
  | { kind: 'file'; stream: TrackedWritable; target: FileSystemWritableFileStreamTarget }
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
    const stream = new TrackedWritable(await handle.createWritable());
    // TrackedWritable satisfies webm-muxer's runtime `instanceof
    // FileSystemWritableFileStream` check (see its constructor) but not
    // TypeScript's structural type (it doesn't implement locked/getWriter,
    // which webm-muxer never calls) — safe to assert past that here.
    const target = new FileSystemWritableFileStreamTarget(stream as unknown as FileSystemWritableFileStream, {
      chunkSize: FILE_WRITE_CHUNK_SIZE,
    });
    return { kind: 'file', stream, target };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { kind: 'cancelled' };
    return { kind: 'buffer', target: new ArrayBufferTarget() };
  }
}

const FORCE_YIELD_INTERVAL_MS = 150;

/**
 * `await somePromise` only truly hands control back to the browser (letting
 * it run garbage collection, among other housekeeping) when that promise
 * resolves via a real macrotask — e.g. a `setTimeout`. An `await` on a
 * promise that resolves through microtasks alone (which is exactly what
 * `waitForBackpressure` below does whenever nothing is backed up — the
 * common case) never actually yields to the browser at all.
 *
 * For a short show that's irrelevant. For an 11-minute one at 30fps —
 * ~20,000 iterations — it means this loop can run for long stretches
 * without ever giving the browser a chance to reclaim the VideoFrames,
 * Three.js scratch objects, and encoder-internal buffers each iteration
 * allocates. Nothing here individually leaks, but with no opportunity to
 * collect any of it, memory climbs for the entire length of the render and
 * eventually exhausts the tab — which is exactly why this kept crashing
 * near the end even after the two write-side fixes (disk streaming, write
 * backpressure) that came before it: neither one forces a real yield when
 * the encoder and disk are actually keeping up fine.
 *
 * This forces one on a wall-clock cadence — not tied to frame count, so it
 * behaves the same whether a frame takes a fraction of a millisecond or
 * several — regardless of whether backpressure would have caused one
 * anyway.
 */
function createYieldGate(): () => Promise<void> {
  let last = performance.now();
  return async () => {
    if (performance.now() - last >= FORCE_YIELD_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      last = performance.now();
    }
  };
}

/** Pauses until both the encoder's own queue and (when writing straight to
 * disk) the number of in-flight file writes have drained enough to keep
 * memory bounded, no matter how much faster than the disk this loop runs —
 * and, via `forceYield`, at least periodically even when neither is. */
async function waitForBackpressure(
  encoder: VideoEncoder | AudioEncoder,
  output: OutputTarget,
  forceYield: () => Promise<void>,
): Promise<void> {
  await forceYield();
  while (encoder.encodeQueueSize > 6 || (output.kind === 'file' && output.stream.pendingWrites > MAX_PENDING_FILE_WRITES)) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Feeds an AudioBuffer's PCM samples straight into an AudioEncoder — no
 * real-time playback involved, so this runs as fast as the encoder (and,
 * where writing straight to disk, the disk itself) allows. */
async function encodeAudioBuffer(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
  encoder: AudioEncoder,
  output: OutputTarget,
  forceYield: () => Promise<void>,
): Promise<void> {
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
    await waitForBackpressure(encoder, output, forceYield);
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
  const forceYield = createYieldGate();

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

      await waitForBackpressure(videoEncoder, output, forceYield);
      options.onProgress?.((i + 1) / frameCount);
    }

    if (hasAudio && audioEncoder) {
      await encodeAudioBuffer(decodedAudio, options.startTime, options.endTime, audioEncoder, output, forceYield);
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
