import { PEAKS_PER_SECOND } from '../../utils/waveform';

interface TimelineWaveformProps {
  peaks: number[];
  pxPerSecond: number;
  height: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number | null;
}

/**
 * Bipolar bar waveform, mirrored around the center line. Two-tone by
 * playhead position rather than a fake frequency split (this app has no
 * real use for "which color is bass" — knowing what's already played vs
 * what's coming up next in the show is the actually useful distinction),
 * plus a dimmed overlay for anything outside the trim window.
 */
export function TimelineWaveform({ peaks, pxPerSecond, height, currentTime, trimStart, trimEnd }: TimelineWaveformProps) {
  const barGap = pxPerSecond / PEAKS_PER_SECOND;
  const barWidth = Math.max(1, barGap - 1);
  const mid = height / 2;
  const totalWidth = (peaks.length / PEAKS_PER_SECOND) * pxPerSecond;
  const trimEndPx = (trimEnd ?? peaks.length / PEAKS_PER_SECOND) * pxPerSecond;
  const trimStartPx = trimStart * pxPerSecond;

  return (
    <svg className="timeline-waveform" width={totalWidth} height={height}>
      <line x1={0} y1={mid} x2={totalWidth} y2={mid} className="timeline-waveform__centerline" />
      {peaks.map((amplitude, i) => {
        const barTime = i / PEAKS_PER_SECOND;
        const barHeight = Math.max(1, amplitude * height);
        const x = barTime * pxPerSecond;
        const played = barTime <= currentTime;
        return (
          <rect
            key={i}
            x={x}
            y={mid - barHeight / 2}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            className={played ? 'timeline-waveform__bar timeline-waveform__bar--played' : 'timeline-waveform__bar'}
          />
        );
      })}
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
