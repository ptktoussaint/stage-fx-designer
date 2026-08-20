const PEAKS_PER_SECOND = 4;

interface TimelineWaveformProps {
  peaks: number[];
  pxPerSecond: number;
  height: number;
}

/** Renders decoded amplitude peaks as a compact bar waveform above the tracks. */
export function TimelineWaveform({ peaks, pxPerSecond, height }: TimelineWaveformProps) {
  const barWidth = Math.max(1, pxPerSecond / PEAKS_PER_SECOND - 1);
  const mid = height / 2;

  return (
    <svg className="timeline-waveform" width={(peaks.length / PEAKS_PER_SECOND) * pxPerSecond} height={height}>
      {peaks.map((amplitude, i) => {
        const barHeight = Math.max(1, amplitude * height);
        const x = (i / PEAKS_PER_SECOND) * pxPerSecond;
        return (
          <rect
            key={i}
            x={x}
            y={mid - barHeight / 2}
            width={barWidth}
            height={barHeight}
            className="timeline-waveform__bar"
          />
        );
      })}
    </svg>
  );
}
