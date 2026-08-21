import { audioEngine } from './audioEngine';

const CANVAS_SELECTOR = '.stage-renderer-3d canvas';

const CANDIDATE_MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

function pickMimeType(): string {
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

/**
 * Records the 3D view (only the 3D renderer is a real <canvas> —
 * StageRenderer2D is SVG, which MediaRecorder/captureStream can't touch)
 * plus whatever audio is currently playing, into a downloadable video file.
 * A real screen/window recording tool this is not: it's exactly what's
 * rendered inside the 3D canvas, which for this app's purpose (capturing
 * the show simulation, not the editor chrome) is the right scope.
 */
class ClipRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private ownedTracks: MediaStreamTrack[] = [];

  isRecording(): boolean {
    return this.recorder != null && this.recorder.state === 'recording';
  }

  /** Returns an error message on failure, or null on success. */
  start(): string | null {
    if (this.isRecording()) return null;
    const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR);
    if (!canvas) return 'Switch to the 3D view to record — the 2D map can\'t be captured as video.';
    if (typeof canvas.captureStream !== 'function') return 'This browser can\'t record canvas video.';

    const canvasStream = canvas.captureStream(30);
    const audioStream = audioEngine.getRecordingAudioStream();
    const tracks = [...canvasStream.getVideoTracks(), ...(audioStream?.getAudioTracks() ?? [])];
    this.ownedTracks = canvasStream.getVideoTracks();
    const combined = new MediaStream(tracks);

    const mimeType = pickMimeType();
    try {
      // An explicit bitrate keeps the encoder from picking a low default
      // that has to drop/duplicate frames to keep up with a busy 3D scene —
      // that showed up as the "lower fps, small stutters" the recorded
      // clip had compared to the live view.
      this.recorder = new MediaRecorder(combined, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 8_000_000,
      });
    } catch {
      return 'Could not start the recorder.';
    }
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(250);
    return null;
  }

  /** Stops recording and triggers a browser download of the clip. Resolves once the file has been handed to the browser. */
  stop(showName: string): Promise<void> {
    return new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder) {
        resolve();
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = showName.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_') || 'show';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `${safeName}-${stamp}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this.ownedTracks.forEach((t) => t.stop());
        this.ownedTracks = [];
        this.recorder = null;
        this.chunks = [];
        resolve();
      };
      recorder.stop();
    });
  }
}

export const clipRecorder = new ClipRecorder();
