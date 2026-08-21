/**
 * Web Audio API playback engine (AudioContext + AudioBufferSourceNode),
 * not a plain HTMLAudioElement. That swap is deliberate: `<audio>`'s
 * `currentTime` is driven by the browser's media pipeline and can drift
 * tens to hundreds of milliseconds from what's actually reaching the
 * speakers — fine for a video player, not for a tool whose whole point is
 * firing effects in sync with the music. `AudioContext.currentTime` is the
 * same clock the audio hardware uses to schedule output, so deriving
 * playback position from it (see getCurrentTime) is sample-accurate.
 *
 * Trade-off: AudioBufferSourceNode has no native pause/resume — each
 * play() call creates a fresh node. play()/pause()/seek() below track
 * `startedAtContextTime` + `startOffset` to reconstruct "where we are" at
 * any moment without needing the node itself to expose it.
 */
class AudioEngine {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAtContextTime = 0;
  private startOffset = 0;
  private playing = false;
  private onEnded: (() => void) | null = null;
  /** A parallel tap on the same audio graph, always connected alongside
   * ctx.destination (see play()) so the clip recorder (src/engine/
   * clipRecorder.ts) can grab a MediaStream of exactly what's playing
   * without interrupting normal playback — nothing reads this stream
   * unless a recording is actually in progress. */
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new Ctor();
    }
    return this.context;
  }

  /** Decodes and loads a track for playback. Returns the decoded buffer so callers (waveform import) can derive peaks from it without decoding twice. */
  async loadFromArrayBuffer(arrayBuffer: ArrayBuffer, onEnded?: () => void): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    this.stopSourceOnly();
    this.buffer = await ctx.decodeAudioData(arrayBuffer);
    this.onEnded = onEnded ?? null;
    this.startOffset = 0;
    this.playing = false;
    return this.buffer;
  }

  clear(): void {
    this.stopSourceOnly();
    this.buffer = null;
    this.playing = false;
    this.startOffset = 0;
  }

  play(fromOffset?: number): void {
    if (!this.buffer) return;
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();

    const offset = fromOffset ?? this.startOffset;
    this.stopSourceOnly();

    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.connect(ctx.destination);
    if (this.recordingDestination) source.connect(this.recordingDestination);
    source.onended = () => {
      if (this.source !== source) return; // superseded by a later play()/seek(), not a real end
      this.playing = false;
      this.onEnded?.();
    };
    source.start(0, Math.max(0, offset));

    this.source = source;
    this.startedAtContextTime = ctx.currentTime;
    this.startOffset = Math.max(0, offset);
    this.playing = true;
  }

  pause(): void {
    if (!this.playing) return;
    this.startOffset = this.getCurrentTime() ?? this.startOffset;
    this.stopSourceOnly();
    this.playing = false;
  }

  seek(time: number): void {
    const clamped = Math.max(0, time);
    this.startOffset = clamped;
    if (this.playing) {
      this.play(clamped);
    }
  }

  private stopSourceOnly(): void {
    if (!this.source) return;
    this.source.onended = null;
    try {
      this.source.stop();
    } catch {
      // already stopped/never started — fine
    }
    this.source.disconnect();
    this.source = null;
  }

  hasAudio(): boolean {
    return this.buffer !== null;
  }

  /** The raw decoded PCM buffer, if a track is loaded — used by the offline
   * show renderer to encode audio directly instead of capturing real-time
   * playback (see engine/offlineShowRenderer.ts). */
  getDecodedBuffer(): AudioBuffer | null {
    return this.buffer;
  }

  getCurrentTime(): number | null {
    if (!this.buffer) return null;
    if (!this.playing || !this.context) return this.startOffset;
    return this.startOffset + (this.context.currentTime - this.startedAtContextTime);
  }

  /** A live MediaStreamTrack of whatever audio is currently playing, for
   * MediaRecorder to combine with the 3D canvas's video track. Returns null
   * if nothing has ever been loaded (no AudioContext to tap yet). */
  getRecordingAudioStream(): MediaStream | null {
    if (!this.context) return null;
    if (!this.recordingDestination) {
      this.recordingDestination = this.context.createMediaStreamDestination();
      // The current source (if one is already playing) was connected before
      // this tap existed — reconnect so recording can start mid-playback too.
      if (this.source) this.source.connect(this.recordingDestination);
    }
    return this.recordingDestination.stream;
  }
}

export const audioEngine = new AudioEngine();
