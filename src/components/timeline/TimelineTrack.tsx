import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { addTimelineEvent, removeTimelineEvent, updateTimelineEvent } from '../../commands';
import { moveTrackOrder, setTrackFolder } from '../../timeline/trackOrganization';
import type { TimelineEvent, TimelineFolder, TimelineTargetType } from '../../types';
import { TimelineEventBlock } from './TimelineEventBlock';
import { Icon } from '../common/Icon';

interface TimelineTrackProps {
  trackKey: string;
  label: string;
  color: string;
  targetType: TimelineTargetType;
  targetId: string;
  events: TimelineEvent[];
  pxPerSecond: number;
  selectedEventIds: string[];
  onSelectEvent: (eventId: string | null) => void;
  /** A cue outside [trimStart, trimEnd) never fires during playback (the Show Engine never reaches it) — dimmed to match the waveform's trim mask rather than hidden, since it's still there if the trim moves back out. */
  trimStart: number;
  trimEnd: number | null;
  /** For reordering (see trackOrganization.moveTrackOrder) and the folder picker below. */
  resolvedOrder: string[];
  folders: TimelineFolder[];
  currentFolderId: string | null;
  isFolderMenuOpen: boolean;
  onToggleFolderMenu: () => void;
}

export function TimelineTrack({
  trackKey,
  label,
  color,
  targetType,
  targetId,
  events,
  pxPerSecond,
  selectedEventIds,
  onSelectEvent,
  trimStart,
  trimEnd,
  resolvedOrder,
  folders,
  currentFolderId,
  isFolderMenuOpen,
  onToggleFolderMenu,
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
        <div className="timeline-track__reorder">
          <button
            type="button"
            className="timeline-track__reorder-btn"
            title="Move Up"
            onClick={() => moveTrackOrder(trackKey, -1, resolvedOrder)}
          >
            <Icon name="chevron-right" size={9} className="timeline-track__chevron-up" />
          </button>
          <button
            type="button"
            className="timeline-track__reorder-btn"
            title="Move Down"
            onClick={() => moveTrackOrder(trackKey, 1, resolvedOrder)}
          >
            <Icon name="chevron-right" size={9} className="timeline-track__chevron-down" />
          </button>
        </div>
        <span className="timeline-track__name" title={label}>
          {label}
        </span>
        <div className="timeline-track__folder-picker">
          <button
            type="button"
            className="timeline-track__reorder-btn"
            title="Assign to Folder"
            onClick={onToggleFolderMenu}
          >
            <Icon name="platform" size={10} />
          </button>
          {isFolderMenuOpen && (
            <div className="timeline-track__folder-menu">
              <button
                type="button"
                className={currentFolderId === null ? 'is-active' : ''}
                onClick={() => {
                  setTrackFolder(trackKey, null);
                  onToggleFolderMenu();
                }}
              >
                No Folder
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={currentFolderId === folder.id ? 'is-active' : ''}
                  onClick={() => {
                    setTrackFolder(trackKey, folder.id);
                    onToggleFolderMenu();
                  }}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="timeline-track__lane" onDoubleClick={handleLaneDoubleClick}>
        {events.map((event) => (
          <TimelineEventBlock
            key={event.id}
            event={event}
            pxPerSecond={pxPerSecond}
            color={color}
            isSelected={selectedEventIds.includes(event.id)}
            isOutsideTrim={event.time < trimStart || (trimEnd != null && event.time >= trimEnd)}
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
