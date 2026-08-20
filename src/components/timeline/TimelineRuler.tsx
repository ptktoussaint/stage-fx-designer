import { formatTime } from '../../utils/time';

interface TimelineRulerProps {
  pxPerSecond: number;
  durationSeconds: number;
  currentTime: number;
  onScrub: (time: number) => void;
}

export function TimelineRuler({ pxPerSecond, durationSeconds, currentTime, onScrub }: TimelineRulerProps) {
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
          <span>{formatTime(t)}</span>
        </div>
      ))}
      <div className="timeline-ruler__playhead" style={{ left: currentTime * pxPerSecond }} />
    </div>
  );
}
