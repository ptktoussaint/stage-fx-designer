import { useEffect, useRef } from 'react';
import { usePlaybackStore } from '../stores/playbackStore';
import { showEngine } from '../engine/showEngine';

/**
 * Drives playback: while isPlaying, advances currentTime every frame and
 * feeds it to the Show Engine so timeline events resolve into simulation
 * triggers. Mount once near the app root.
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
      if (lastFrameRef.current == null) lastFrameRef.current = timestampMs;
      const deltaSeconds = (timestampMs - lastFrameRef.current) / 1000;
      lastFrameRef.current = timestampMs;

      const nextTime = usePlaybackStore.getState().currentTime + deltaSeconds;
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
