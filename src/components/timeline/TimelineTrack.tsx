import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { addTimelineEvent, removeTimelineEvent, updateTimelineEvent } from '../../commands';
import { moveTrackOrder, reorderTrack, setTrackFolder } from '../../timeline/trackOrganization';
import type { TimelineEvent, TimelineFolder, TimelineTargetType } from '../../types';
import { TimelineEventBlock, type TimelineResizeEdge } from './TimelineEventBlock';
import { Icon } from '../common/Icon';

/** Floor on a cue's duration when resizing — keeps a dragged handle from
 * collapsing it to zero/negative width. */
const MIN_DURATION_SECONDS = 0.05;

/** How close (in screen pixels) a dragged resize handle has to land next to
 * another cue's edge before it snaps there — an "invisible mark" the user
 * can drag onto so multiple simultaneous effects start/end together without
 * needing to type exact numbers. Independent of zoom (converted to seconds
 * against the current pxPerSecond below) so it feels the same at any zoom level. */
const SNAP_PIXELS = 8;

/** Every other cue's start/end time (across ALL tracks, not just this one —
 * the whole point is aligning effects on DIFFERENT devices), excluding the
 * cue currently being resized so it never snaps to its own edge. */
function collectSnapCandidates(excludeEventId: string): number[] {
  const candidates: number[] = [];
  useProjectStore
    .getState()
    .project.timeline.events.forEach((ev) => {
      if (ev.id === excludeEventId) return;
      candidates.push(ev.time, ev.time + ev.duration);
    });
  return candidates;
}

function snapToNearest(value: number, candidates: number[], thresholdSeconds: number): number {
  let snapped = value;
  let bestDistance = thresholdSeconds;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance <= bestDistance) {
      bestDistance = distance;
      snapped = candidate;
    }
  }
  return snapped;
}

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
  const resizeRef = useRef<{
    eventId: string;
    edge: TimelineResizeEdge;
    startClientX: number;
    startTime: number;
    startDuration: number;
  } | null>(null);
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

  const handleResizeStart = (e: React.PointerEvent, event: TimelineEvent, edge: TimelineResizeEdge) => {
    e.stopPropagation();
    onSelectEvent(event.id);
    resizeRef.current = {
      eventId: event.id,
      edge,
      startClientX: e.clientX,
      startTime: event.time,
      startDuration: event.duration,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (drag) {
        const deltaSeconds = (e.clientX - drag.startClientX) / pxPerSecond;
        const nextTime = Math.max(0, drag.startTime + deltaSeconds);
        useProjectStore.getState()._updateTimelineEvent(drag.eventId, { time: nextTime });
        forceRerender((n) => n + 1);
      }

      const resize = resizeRef.current;
      if (resize) {
        const deltaSeconds = (e.clientX - resize.startClientX) / pxPerSecond;
        const snapThreshold = SNAP_PIXELS / pxPerSecond;
        const candidates = collectSnapCandidates(resize.eventId);
        if (resize.edge === 'end') {
          const rawEnd = resize.startTime + resize.startDuration + deltaSeconds;
          const snappedEnd = snapToNearest(rawEnd, candidates, snapThreshold);
          const nextDuration = Math.max(MIN_DURATION_SECONDS, snappedEnd - resize.startTime);
          useProjectStore.getState()._updateTimelineEvent(resize.eventId, { duration: nextDuration });
        } else {
          // Dragging the start edge shifts `time` while keeping the cue's
          // end fixed, clamped so it can't cross 0 or eat past the end.
          const fixedEnd = resize.startTime + resize.startDuration;
          const rawStart = resize.startTime + deltaSeconds;
          const snappedStart = snapToNearest(rawStart, candidates, snapThreshold);
          const clampedStart = Math.max(0, Math.min(snappedStart, fixedEnd - MIN_DURATION_SECONDS));
          useProjectStore.getState()._updateTimelineEvent(resize.eventId, {
            time: clampedStart,
            duration: fixedEnd - clampedStart,
          });
        }
        forceRerender((n) => n + 1);
      }
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (drag) {
        const finalEvent = useProjectStore
          .getState()
          .project.timeline.events.find((ev) => ev.id === drag.eventId);
        if (finalEvent && finalEvent.time !== drag.startTime) {
          updateTimelineEvent(drag.eventId, { time: drag.startTime }, { time: finalEvent.time });
        }
        dragRef.current = null;
      }

      const resize = resizeRef.current;
      if (resize) {
        const finalEvent = useProjectStore
          .getState()
          .project.timeline.events.find((ev) => ev.id === resize.eventId);
        if (finalEvent && (finalEvent.time !== resize.startTime || finalEvent.duration !== resize.startDuration)) {
          updateTimelineEvent(
            resize.eventId,
            { time: resize.startTime, duration: resize.startDuration },
            { time: finalEvent.time, duration: finalEvent.duration },
          );
        }
        resizeRef.current = null;
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [pxPerSecond]);

  return (
    <div
      className="timeline-track"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedKey = e.dataTransfer.getData('text/plain');
        if (!draggedKey) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const insertAfter = e.clientY > rect.top + rect.height / 2;
        reorderTrack(draggedKey, trackKey, insertAfter, resolvedOrder);
      }}
    >
      <div className="timeline-track__label" style={{ borderLeftColor: color }}>
        <div
          className="timeline-track__drag-handle"
          draggable
          title="Arraste para reordenar"
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', trackKey);
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          <Icon name="drag-handle" size={11} />
        </div>
        <div className="timeline-track__reorder">
          <button
            type="button"
            className="timeline-track__reorder-btn"
            title="Mover para Cima"
            onClick={() => moveTrackOrder(trackKey, -1, resolvedOrder)}
          >
            <Icon name="chevron-right" size={9} className="timeline-track__chevron-up" />
          </button>
          <button
            type="button"
            className="timeline-track__reorder-btn"
            title="Mover para Baixo"
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
            title="Atribuir a uma Lista"
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
                Sem Lista
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
            onResizeStart={handleResizeStart}
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
