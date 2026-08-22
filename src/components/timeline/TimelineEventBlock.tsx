import type { TimelineEvent } from '../../types';

export type TimelineResizeEdge = 'start' | 'end';

interface TimelineEventBlockProps {
  event: TimelineEvent;
  pxPerSecond: number;
  color: string;
  isSelected: boolean;
  isOutsideTrim: boolean;
  onPointerDown: (e: React.PointerEvent, event: TimelineEvent) => void;
  onResizeStart: (e: React.PointerEvent, event: TimelineEvent, edge: TimelineResizeEdge) => void;
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
  onResizeStart,
  onDelete,
}: TimelineEventBlockProps) {
  const width = Math.max(MIN_WIDTH_PX, event.duration * pxPerSecond);

  return (
    <div
      className={`timeline-event${isSelected ? ' timeline-event--selected' : ''}${isOutsideTrim ? ' timeline-event--outside-trim' : ''}`}
      data-event-id={event.id}
      style={{ left: event.time * pxPerSecond, width, background: color }}
      onPointerDown={(e) => onPointerDown(e, event)}
      onClick={(e) => e.stopPropagation()}
      title={
        isOutsideTrim
          ? `disparo @ ${event.time.toFixed(3)}s, duração ${event.duration.toFixed(2)}s (fora do trecho selecionado — não vai disparar)`
          : `disparo @ ${event.time.toFixed(3)}s, duração ${event.duration.toFixed(2)}s`
      }
    >
      {/* Side handles to trim/extend the cue's duration by dragging — the
          left one also shifts `time` so the end stays put, the right one
          only changes `duration`. Always present (not just when selected)
          so they're discoverable without having to click first. */}
      <div
        className="timeline-event__handle timeline-event__handle--start"
        onPointerDown={(e) => onResizeStart(e, event, 'start')}
      />
      <div
        className="timeline-event__handle timeline-event__handle--end"
        onPointerDown={(e) => onResizeStart(e, event, 'end')}
      />
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
