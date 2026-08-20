import type { TimelineEvent } from '../../types';

interface TimelineEventBlockProps {
  event: TimelineEvent;
  pxPerSecond: number;
  color: string;
  isSelected: boolean;
  isOutsideTrim: boolean;
  onPointerDown: (e: React.PointerEvent, event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
}

const MIN_WIDTH_PX = 8;

export function TimelineEventBlock({
  event,
  pxPerSecond,
  color,
  isSelected,
  isOutsideTrim,
  onPointerDown,
  onDelete,
}: TimelineEventBlockProps) {
  const width = Math.max(MIN_WIDTH_PX, event.duration * pxPerSecond);

  return (
    <div
      className={`timeline-event${isSelected ? ' timeline-event--selected' : ''}${isOutsideTrim ? ' timeline-event--outside-trim' : ''}`}
      style={{ left: event.time * pxPerSecond, width, background: color }}
      onPointerDown={(e) => onPointerDown(e, event)}
      onClick={(e) => e.stopPropagation()}
      title={
        isOutsideTrim
          ? `${event.action} @ ${event.time.toFixed(3)}s (outside the trimmed range — won't fire)`
          : `${event.action} @ ${event.time.toFixed(3)}s`
      }
    >
      {isSelected && (
        <button
          type="button"
          className="timeline-event__delete"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(event)}
        >
          ×
        </button>
      )}
    </div>
  );
}
