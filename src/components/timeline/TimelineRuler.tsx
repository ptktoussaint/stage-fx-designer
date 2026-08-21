import { useEffect, useMemo, useRef } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { formatTime } from '../../utils/time';

interface TimelineRulerProps {
  pxPerSecond: number;
  durationSeconds: number;
  onScrub: (time: number) => void;
  /**
   * Everything here is still positioned in absolute file time (unchanged —
   * the waveform, cue positions, and scrub math all stay anchored to the
   * real audio buffer). Only the printed label is renumbered so the ruler
   * reads 00:00 at the trim-start handle instead of the file's real start,
   * matching AudioConfig.trimStart. Pass 0 for an untrimmed track.
   */
  trimStart: number;
}

/**
 * Ticks are memoized from durationSeconds/pxPerSecond/trimStart alone — the
 * playhead marker no longer comes in as a `currentTime` prop (which used to
 * force this whole ruler, ticks included, to re-render every animation
 * frame during playback); instead its position is written straight to the
 * DOM via a ref on every playbackStore tick, same technique as the
 * waveform's played/unplayed scrim.
 */
export function TimelineRuler({ pxPerSecond, durationSeconds, onScrub, trimStart }: TimelineRulerProps) {
  const step = pxPerSecond < 30 ? 5 : pxPerSecond < 80 ? 2 : 1;
  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let t = 0; t <= durationSeconds; t += step) list.push(t);
    return list;
  }, [durationSeconds, step]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const time = (e.clientX - rect.left) / pxPerSecond;
    onScrub(Math.max(0, time));
  };

  const playheadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = (currentTime: number) => {
      const el = playheadRef.current;
      if (el) el.style.left = `${currentTime * pxPerSecond}px`;
    };
    update(usePlaybackStore.getState().currentTime);
    return usePlaybackStore.subscribe((state) => update(state.currentTime));
  }, [pxPerSecond]);

  return (
    <div className="timeline-ruler" style={{ width: durationSeconds * pxPerSecond }} onClick={handleClick}>
      {ticks.map((t) => (
        <div key={t} className="timeline-ruler__tick" style={{ left: t * pxPerSecond }}>
          <span>{formatTime(t - trimStart)}</span>
        </div>
      ))}
      <div ref={playheadRef} className="timeline-ruler__playhead" />
    </div>
  );
}
