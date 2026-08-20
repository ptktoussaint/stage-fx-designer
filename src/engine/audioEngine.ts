/**
 * Thin wrapper around a single HTMLAudioElement. Kept as a plain singleton
 * (not React state) for one reason: browsers only allow `audio.play()` to
 * resolve when it's called synchronously inside a real user-gesture handler
 * (a click). Routing play/pause through this engine lets playbackStore call
 * it directly from the Play button's onClick — going through a React effect
 * reacting to state would add a tick of async indirection that some
 * browsers treat as "not a user gesture" and silently block.
 */
class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;

  load(url: string, onEnded?: () => void): void {
    if (this.currentUrl && this.currentUrl !== url) {
      URL.revokeObjectURL(this.currentUrl);
    }
    this.audio = new Audio(url);
    this.currentUrl = url;
    if (onEnded) this.audio.addEventListener('ended', onEnded);
  }

  clear(): void {
    this.audio?.pause();
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
    this.audio = null;
    this.currentUrl = null;
  }

  play(): void {
    this.audio?.play().catch(() => {
      // Autoplay was blocked (e.g. no prior user gesture this session) —
      // playback stays paused; the transport UI reflects isPlaying from
      // playbackStore regardless, so this fails silently rather than
      // throwing into a click handler.
    });
  }

  pause(): void {
    this.audio?.pause();
  }

  seek(time: number): void {
    if (this.audio) this.audio.currentTime = time;
  }

  hasAudio(): boolean {
    return this.audio !== null;
  }

  getCurrentTime(): number | null {
    return this.audio ? this.audio.currentTime : null;
  }
}

export const audioEngine = new AudioEngine();
