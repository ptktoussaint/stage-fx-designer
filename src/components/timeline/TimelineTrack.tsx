import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { addTimelineEvent, removeTimelineEvent, updateTimelineEvent } from '../../commands';
import type { TimelineEvent, TimelineTargetType } from '../../types';
import { TimelineEventBlock } from './TimelineEventBlock';

interface TimelineTrackProps {
  label: string;
  color: string;
  targetType: TimelineTargetType;
  targetId: string;
  events: TimelineEvent[];
  pxPerSecond: number;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
}

export function TimelineTrack({
  label,
  color,
  targetType,
  targetId,
  events,
  pxPerSecond,
  selectedEventId,
  onSelectEvent,
}: TimelineTrackProps) {
  const dragRef = useRef<{ eventId: string; startClientX: number; startTime: number } | null>(null);
  const [, forceRerender] = useState(0);

  const handleLaneDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const time = Math.max(0, (e.clientX - rect.left) / pxPerSecond);
    addTimelineEvent({ time, duration: 0.5, targetType, targetId, action: 'trigger', parameters: {} });
  };

  const handleEventPointerDown = (e: React.PointerEvent, event: TimelineEvent) => {
    e.stopPropagation();
    onSelectEvent(event.id);
    dragRef.current = { eventId: event.id, startClientX: e.clientX, startTime: event.time };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaSeconds = (e.clientX - drag.startClientX) / pxPerSecond;
      const nextTime = Math.max(0, drag.startTime + deltaSeconds);
      useProjectStore.getState()._updateTimelineEvent(drag.eventId, { time: nextTime });
      forceRerender((n) => n + 1);
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      const finalEvent = useProjectStore
        .getState()
        .project.timeline.events.find((ev) => ev.id === drag.eventId);
      if (finalEvent && finalEvent.time !== drag.startTime) {
        updateTimelineEvent(drag.eventId, { time: drag.startTime }, { time: finalEvent.time });
      }
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [pxPerSecond]);

  return (
    <div className="timeline-track">
      <div className="timeline-track__label" style={{ borderLeftColor: color }}>
        {label}
      </div>
      <div className="timeline-track__lane" onDoubleClick={handleLaneDoubleClick}>
        {events.map((event) => (
          <TimelineEventBlock
            key={event.id}
            event={event}
            pxPerSecond={pxPerSecond}
            color={color}
            isSelected={selectedEventId === event.id}
            onPointerDown={handleEventPointerDown}
            onDelete={(ev) => {
              removeTimelineEvent(ev);
              onSelectEvent(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}
