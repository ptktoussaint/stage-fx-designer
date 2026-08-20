import { useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { IconButton } from '../common/IconButton';
import { formatTime } from '../../utils/time';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';
import { TimelineWaveform } from './TimelineWaveform';
import { TimelineTrimHandles } from './TimelineTrimHandles';
import { AudioImportControl } from './AudioImportControl';
import './TimelinePanel.css';

const PX_PER_SECOND = 60;
/**
 * Must match .timeline-track__label's width in TimelinePanel.css. Each
 * TimelineTrack is a flex row of [label][lane], so a track's lane content
 * (and every TimelineEventBlock inside it, positioned via `left: event.time
 * * pxPerSecond` relative to the LANE's own box) starts this many pixels to
 * the right of this panel's x=0. The ruler, waveform, and playhead line
 * used to start at x=0 with no such offset, so cues never lined up with the
 * ruler tick / waveform position they were actually meant to sit under —
 * wrapping them in the same left offset makes every piece share one
 * coordinate system again.
 */
const TRACK_LABEL_WIDTH = 140;

export function TimelinePanel() {
  const devices = useProjectStore((s) => s.project.devices);
  const groups = useProjectStore((s) => s.project.groups);
  const events = useProjectStore((s) => s.project.timeline.events);
  const audio = useProjectStore((s) => s.project.audio);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const seek = usePlaybackStore((s) => s.seek);
  const isTimelineCollapsed = useUiStore((s) => s.isTimelineCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleTimelineCollapsed);

  const selectedEventId = useSelectionStore((s) => s.selectedTimelineEventId);
  const setSelectedEventId = useSelectionStore((s) => s.selectTimelineEvent);

  const durationSeconds = useMemo(() => {
    const lastEventEnd = events.reduce((max, e) => Math.max(max, e.time + e.duration), 0);
    return Math.max(60, audio.duration ?? 0, lastEventEnd + 15, currentTime + 15);
  }, [events, currentTime, audio.duration]);

  if (isTimelineCollapsed) {
    return (
      <div className="timeline-panel timeline-panel--collapsed">
        <span>TIMELINE</span>
        <span className="timeline-panel__time">{formatTime(Math.max(0, currentTime - audio.trimStart))}</span>
        <IconButton icon="chevron-right" label="Expand Timeline" onClick={toggleCollapsed} className="timeline-panel__collapse-toggle" />
      </div>
    );
  }

  return (
    <div className="timeline-panel">
      <div className="timeline-panel__header">
        <span className="panel-title" style={{ border: 'none', padding: 0 }}>
          TIMELINE
        </span>
        <span className="timeline-panel__hint">Double-click a lane to add an event · drag to reposition</span>
        <AudioImportControl />
        <IconButton icon="chevron-down" label="Collapse Timeline" onClick={toggleCollapsed} />
      </div>
      <div className="timeline-panel__scroll" onClick={() => setSelectedEventId(null)}>
        <div
          className="timeline-panel__content"
          style={{ width: TRACK_LABEL_WIDTH + durationSeconds * PX_PER_SECOND }}
        >
          <div style={{ marginLeft: TRACK_LABEL_WIDTH }}>
            <TimelineRuler
              pxPerSecond={PX_PER_SECOND}
              durationSeconds={durationSeconds}
              currentTime={currentTime}
              onScrub={seek}
              trimStart={audio.trimStart}
            />
            {audio.waveformPeaks && audio.duration != null && (
              <div className="timeline-panel__waveform">
                <TimelineWaveform
                  peaks={audio.waveformPeaks}
                  pxPerSecond={PX_PER_SECOND}
                  height={44}
                  currentTime={currentTime}
                  trimStart={audio.trimStart}
                  trimEnd={audio.trimEnd}
                />
                <TimelineTrimHandles pxPerSecond={PX_PER_SECOND} height={44} duration={audio.duration} />
              </div>
            )}
          </div>
          <div className="timeline-panel__tracks">
            {groups.map((group) => (
              <TimelineTrack
                key={group.id}
                label={group.name}
                color={group.color}
                targetType="group"
                targetId={group.id}
                events={events.filter((e) => e.targetType === 'group' && e.targetId === group.id)}
                pxPerSecond={PX_PER_SECOND}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                trimStart={audio.trimStart}
                trimEnd={audio.trimEnd}
              />
            ))}
            {devices.map((device) => (
              <TimelineTrack
                key={device.id}
                label={device.name}
                color="var(--accent)"
                targetType="device"
                targetId={device.id}
                events={events.filter((e) => e.targetType === 'device' && e.targetId === device.id)}
                pxPerSecond={PX_PER_SECOND}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                trimStart={audio.trimStart}
                trimEnd={audio.trimEnd}
              />
            ))}
            {devices.length === 0 && groups.length === 0 && (
              <div className="timeline-panel__empty">Add devices from the FX Library to create timeline tracks.</div>
            )}
            <div
              className="timeline-panel__playhead-line"
              style={{ left: TRACK_LABEL_WIDTH + currentTime * PX_PER_SECOND }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
