import { useEffect, useMemo, useRef } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { PEAKS_PER_SECOND } from '../../utils/waveform';

interface TimelineWaveformProps {
  peaks: number[];
  pxPerSecond: number;
  height: number;
  trimStart: number;
  trimEnd: number | null;
}

/**
 * Bipolar bar waveform, mirrored around the center line. The bars
 * themselves never depend on the playhead — they're memoized purely from
 * peaks/pxPerSecond/height, so a long track's SVG isn't rebuilt every
 * animation frame. "Already played" used to be a per-bar class recomputed
 * on every currentTime tick; for a multi-minute track that's thousands of
 * <rect> elements re-diffed 60x/sec purely for a color change, which was
 * real, measurable main-thread contention — it showed up as stutter in the
 * live view *and* in anything sampling the canvas in real time (the manual
 * clip recorder), since both share the same thread. Instead, every bar
 * renders in the "played" color once, and a single translucent scrim
 * (like the trim mask below) covers the not-yet-played portion; its width
 * is written directly to the DOM via a ref, bypassing React entirely, so
 * the playhead animates without ever re-rendering this component.
 */
export function TimelineWaveform({ peaks, pxPerSecond, height, trimStart, trimEnd }: TimelineWaveformProps) {
  const barGap = pxPerSecond / PEAKS_PER_SECOND;
  const barWidth = Math.max(1, barGap - 1);
  const mid = height / 2;
  const totalWidth = (peaks.length / PEAKS_PER_SECOND) * pxPerSecond;
  const trimEndPx = (trimEnd ?? peaks.length / PEAKS_PER_SECOND) * pxPerSecond;
  const trimStartPx = trimStart * pxPerSecond;

  const bars = useMemo(
    () =>
      peaks.map((amplitude, i) => {
        const barTime = i / PEAKS_PER_SECOND;
        const barHeight = Math.max(1, amplitude * height);
        const x = barTime * pxPerSecond;
        return (
          <rect
            key={i}
            x={x}
            y={mid - barHeight / 2}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            className="timeline-waveform__bar timeline-waveform__bar--played"
          />
        );
      }),
    [peaks, pxPerSecond, height, barWidth, mid],
  );

  const scrimRef = useRef<SVGRectElement>(null);
  useEffect(() => {
    const update = (currentTime: number) => {
      const el = scrimRef.current;
      if (!el) return;
      const playedPx = Math.max(0, Math.min(totalWidth, currentTime * pxPerSecond));
      el.setAttribute('x', String(playedPx));
      el.setAttribute('width', String(Math.max(0, totalWidth - playedPx)));
    };
    update(usePlaybackStore.getState().currentTime);
    return usePlaybackStore.subscribe((state) => update(state.currentTime));
  }, [totalWidth, pxPerSecond]);

  return (
    <svg className="timeline-waveform" width={totalWidth} height={height}>
      <line x1={0} y1={mid} x2={totalWidth} y2={mid} className="timeline-waveform__centerline" />
      {bars}
      <rect ref={scrimRef} y={0} width={0} height={height} className="timeline-waveform__unplayed-scrim" />
      {trimStartPx > 0 && (
        <rect x={0} y={0} width={trimStartPx} height={height} className="timeline-waveform__trim-mask" />
      )}
      {trimEndPx < totalWidth && (
        <rect
          x={trimEndPx}
          y={0}
          width={totalWidth - trimEndPx}
          height={height}
          className="timeline-waveform__trim-mask"
        />
      )}
    </svg>
  );
}
