import { formatTime } from '../../utils/time';

interface TimelineRulerProps {
  pxPerSecond: number;
  durationSeconds: number;
  currentTime: number;
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

export function TimelineRuler({ pxPerSecond, durationSeconds, currentTime, onScrub, trimStart }: TimelineRulerProps) {
  const step = pxPerSecond < 30 ? 5 : pxPerSecond < 80 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= durationSeconds; t += step) ticks.push(t);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const time = (e.clientX - rect.left) / pxPerSecond;
    onScrub(Math.max(0, time));
  };

  return (
    <div className="timeline-ruler" style={{ width: durationSeconds * pxPerSecond }} onClick={handleClick}>
      {ticks.map((t) => (
        <div key={t} className="timeline-ruler__tick" style={{ left: t * pxPerSecond }}>
          <span>{formatTime(t - trimStart)}</span>
        </div>
      ))}
      <div className="timeline-ruler__playhead" style={{ left: currentTime * pxPerSecond }} />
    </div>
  );
}
