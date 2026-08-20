import { useEffect, useRef } from 'react';
import { usePlaybackStore } from '../stores/playbackStore';
import { showEngine } from '../engine/showEngine';
import { audioEngine } from '../engine/audioEngine';

/**
 * Drives playback: while isPlaying, advances currentTime every frame and
 * feeds it to the Show Engine so timeline events resolve into simulation
 * triggers. Mount once near the app root.
 *
 * When a track is loaded, the HTMLAudioElement's own clock is the source of
 * truth (audio playback rate isn't exactly requestAnimationFrame's delta,
 * and drifting out of sync with the music defeats the point of a show).
 * Without a track, currentTime is a synthetic clock accumulated from rAF
 * deltas so playback still works for silent programming/rehearsal.
 */
export function useShowEngineLoop(): void {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return;
    }

    showEngine.reset(usePlaybackStore.getState().currentTime);

    const step = (timestampMs: number) => {
      const audioTime = audioEngine.getCurrentTime();
      let nextTime: number;

      if (audioTime != null) {
        nextTime = audioTime;
      } else {
        if (lastFrameRef.current == null) lastFrameRef.current = timestampMs;
        const deltaSeconds = (timestampMs - lastFrameRef.current) / 1000;
        nextTime = usePlaybackStore.getState().currentTime + deltaSeconds;
      }
      lastFrameRef.current = timestampMs;

      usePlaybackStore.getState().setCurrentTime(nextTime);
      showEngine.tick(nextTime);

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);
}
