import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  addTimelineFolder,
  deviceTrackKey,
  groupTrackKey,
  resolveTrackOrder,
  toggleTimelineFolderCollapsed,
} from '../../timeline/trackOrganization';
import { Icon } from '../common/Icon';
import { clipRecorder } from '../../engine/clipRecorder';
import { isOfflineRenderSupported, renderShowOffline } from '../../engine/offlineShowRenderer';
import type { TimelineEvent, TimelineTargetType } from '../../types';
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

function parseTrackKey(key: string): { targetType: TimelineTargetType; targetId: string } {
  const [targetType, targetId] = key.split(':') as [TimelineTargetType, string];
  return { targetType, targetId };
}

export function TimelinePanel() {
  const devices = useProjectStore((s) => s.project.devices);
  const groups = useProjectStore((s) => s.project.groups);
  const events = useProjectStore((s) => s.project.timeline.events);
  const folders = useProjectStore((s) => s.project.timeline.folders);
  const trackOrder = useProjectStore((s) => s.project.timeline.trackOrder);
  const trackFolder = useProjectStore((s) => s.project.timeline.trackFolder);
  const audio = useProjectStore((s) => s.project.audio);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const seek = usePlaybackStore((s) => s.seek);
  const isTimelineCollapsed = useUiStore((s) => s.isTimelineCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleTimelineCollapsed);

  const selectedEventIds = useSelectionStore((s) => s.selectedTimelineEventIds);
  const setSelectedEventId = useSelectionStore((s) => s.selectTimelineEvent);
  const setSelectedEventIds = useSelectionStore((s) => s.selectTimelineEvents);

  const viewMode = useProjectStore((s) => s.project.settings.viewMode);
  const setSettings = useProjectStore((s) => s._setSettings);
  const projectName = useProjectStore((s) => s.project.name);
  const isClipRecording = useUiStore((s) => s.isClipRecording);
  const setClipRecording = useUiStore((s) => s.setClipRecording);
  const [isAutoRendering, setIsAutoRendering] = useState(false);
  const [autoRenderProgress, setAutoRenderProgress] = useState(0);

  const [openFolderMenuKey, setOpenFolderMenuKey] = useState<string | null>(null);

  const tracksRef = useRef<HTMLDivElement | null>(null);
  /** Hot-path drag math lives in a ref (mutated per pointermove without a
   * re-render); `boxOverlay` state below mirrors it only for what actually
   * needs to render — the selection rectangle. */
  const dragBoxRef = useRef<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const [boxOverlay, setBoxOverlay] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragBoxRef.current;
      if (!drag || !tracksRef.current) return;
      const rect = tracksRef.current.getBoundingClientRect();
      drag.curX = e.clientX - rect.left;
      drag.curY = e.clientY - rect.top;
      setBoxOverlay({
        left: Math.min(drag.startX, drag.curX),
        top: Math.min(drag.startY, drag.curY),
        width: Math.abs(drag.curX - drag.startX),
        height: Math.abs(drag.curY - drag.startY),
      });
    };
    const onUp = () => {
      const drag = dragBoxRef.current;
      if (!drag || !tracksRef.current) return;
      const moved = Math.abs(drag.curX - drag.startX) > 4 || Math.abs(drag.curY - drag.startY) > 4;
      if (moved) {
        const boxLeft = Math.min(drag.startX, drag.curX);
        const boxRight = Math.max(drag.startX, drag.curX);
        const boxTop = Math.min(drag.startY, drag.curY);
        const boxBottom = Math.max(drag.startY, drag.curY);
        const containerRect = tracksRef.current.getBoundingClientRect();
        const matched: string[] = [];
        tracksRef.current.querySelectorAll<HTMLElement>('[data-event-id]').forEach((el) => {
          const r = el.getBoundingClientRect();
          const elLeft = r.left - containerRect.left;
          const elRight = r.right - containerRect.left;
          const elTop = r.top - containerRect.top;
          const elBottom = r.bottom - containerRect.top;
          if (elLeft < boxRight && elRight > boxLeft && elTop < boxBottom && elBottom > boxTop) {
            const id = el.dataset.eventId;
            if (id) matched.push(id);
          }
        });
        setSelectedEventIds(matched);
        suppressNextClickRef.current = true;
      }
      dragBoxRef.current = null;
      setBoxOverlay(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [setSelectedEventIds]);

  const handleTracksPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.timeline-event') || target.closest('.timeline-track__label')) return;
    if (!tracksRef.current) return;
    const rect = tracksRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragBoxRef.current = { startX: x, startY: y, curX: x, curY: y };
    setBoxOverlay({ left: x, top: y, width: 0, height: 0 });
  };

  /**
   * Renders the whole show to a video file without playing it in real time
   * (see engine/offlineShowRenderer.ts) — the 3D scene is driven by a
   * virtual clock and audio is encoded straight from the decoded buffer, so
   * this finishes in roughly however long encoding takes, not the show's
   * actual duration. Falls back to the old play-and-capture approach (which
   * does take real time) only if the browser lacks WebCodecs support.
   */
  const handleAutoRenderShow = async () => {
    if (isClipRecording || isAutoRendering) return;
    const { trimStart, trimEnd, duration } = audio;
    const lastEventEnd = events.reduce((max, e) => Math.max(max, e.time + e.duration), 0);
    // Trim end wins if set; otherwise the loaded track's length; otherwise
    // pad past the last cue so its effect has time to visually finish.
    const targetEnd = trimEnd ?? duration ?? (lastEventEnd > 0 ? lastEventEnd + 3 : 0);
    if (targetEnd <= trimStart) {
      window.alert('Nada para renderizar ainda — importe um áudio ou adicione marcações na timeline primeiro.');
      return;
    }

    setIsAutoRendering(true);
    setAutoRenderProgress(0);
    if (viewMode !== '3D') {
      setSettings({ viewMode: '3D' });
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (isOfflineRenderSupported()) {
      const wasPlaying = usePlaybackStore.getState().isPlaying;
      if (wasPlaying) usePlaybackStore.getState().stop();
      const error = await renderShowOffline({
        startTime: trimStart,
        endTime: targetEnd,
        fileNameBase: projectName.replace(/\s+/g, '_') || 'show',
        onProgress: setAutoRenderProgress,
      });
      if (error) window.alert(error);
      // Leave the transport where the render left the show engine — snap
      // the visible playhead back to where the render started so a manual
      // Play right after doesn't look like it jumped to the end.
      usePlaybackStore.getState().seek(trimStart);
      setIsAutoRendering(false);
      return;
    }

    // Fallback: play + capture in real time (older browser without WebCodecs).
    usePlaybackStore.getState().seek(trimStart);
    const error = clipRecorder.start();
    if (error) {
      window.alert(error);
      setIsAutoRendering(false);
      return;
    }
    setClipRecording(true);
    usePlaybackStore.getState().play();

    let finished = false;
    const finish = (state: { isPlaying: boolean }) => {
      if (finished) return;
      finished = true;
      unsubscribe();
      if (state.isPlaying) usePlaybackStore.getState().stop();
      setClipRecording(false);
      setIsAutoRendering(false);
      void clipRecorder.stop(projectName);
    };
    const unsubscribe = usePlaybackStore.subscribe((state) => {
      if (state.currentTime >= targetEnd || !state.isPlaying) finish(state);
    });
  };

  const durationSeconds = useMemo(() => {
    const lastEventEnd = events.reduce((max, e) => Math.max(max, e.time + e.duration), 0);
    return Math.max(60, audio.duration ?? 0, lastEventEnd + 15, currentTime + 15);
  }, [events, currentTime, audio.duration]);

  const resolvedOrder = useMemo(
    () =>
      resolveTrackOrder(
        trackOrder,
        groups.map((g) => g.id),
        devices.map((d) => d.id),
      ),
    [trackOrder, groups, devices],
  );

  const eventsByKey = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const event of events) {
      const key = event.targetType === 'group' ? groupTrackKey(event.targetId) : deviceTrackKey(event.targetId);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const labelByKey = useMemo(() => {
    const map = new Map<string, { label: string; color: string }>();
    groups.forEach((g) => map.set(groupTrackKey(g.id), { label: g.name, color: g.color }));
    devices.forEach((d) => map.set(deviceTrackKey(d.id), { label: d.name, color: 'var(--accent)' }));
    return map;
  }, [groups, devices]);

  const renderTrack = (key: string) => {
    const meta = labelByKey.get(key);
    if (!meta) return null;
    const { targetType, targetId } = parseTrackKey(key);
    return (
      <TimelineTrack
        key={key}
        trackKey={key}
        label={meta.label}
        color={meta.color}
        targetType={targetType}
        targetId={targetId}
        events={eventsByKey.get(key) ?? []}
        pxPerSecond={PX_PER_SECOND}
        selectedEventIds={selectedEventIds}
        onSelectEvent={setSelectedEventId}
        trimStart={audio.trimStart}
        trimEnd={audio.trimEnd}
        resolvedOrder={resolvedOrder}
        folders={folders}
        currentFolderId={trackFolder[key] ?? null}
        isFolderMenuOpen={openFolderMenuKey === key}
        onToggleFolderMenu={() => setOpenFolderMenuKey((prev) => (prev === key ? null : key))}
      />
    );
  };

  const ungroupedKeys = resolvedOrder.filter((key) => !trackFolder[key]);

  if (isTimelineCollapsed) {
    return (
      <div className="timeline-panel timeline-panel--collapsed">
        <span>TIMELINE</span>
        <span className="timeline-panel__time">{formatTime(Math.max(0, currentTime - audio.trimStart))}</span>
        <IconButton icon="chevron-right" label="Expandir Timeline" onClick={toggleCollapsed} className="timeline-panel__collapse-toggle" />
      </div>
    );
  }

  return (
    <div className="timeline-panel">
      <div className="timeline-panel__header">
        <span className="panel-title" style={{ border: 'none', padding: 0 }}>
          TIMELINE
        </span>
        <span className="timeline-panel__hint">Clique duas vezes na faixa para adicionar uma marcação · arraste para reposicionar</span>
        <IconButton
          icon="platform"
          label="Nova Lista (agrupa faixas em uma lista recolhível)"
          onClick={() => {
            const name = window.prompt('Nome da lista');
            if (name && name.trim()) addTimelineFolder(name.trim());
          }}
        />
        <IconButton
          icon="auto-render"
          label={
            isAutoRendering
              ? `Renderizando… ${Math.round(autoRenderProgress * 100)}% (não precisa esperar olhando — salva sozinho ao terminar)`
              : 'Renderizar Show Completo em Vídeo (renderiza instantaneamente em segundo plano, sem precisar gravar manualmente)'
          }
          active={isAutoRendering}
          disabled={isAutoRendering || isClipRecording}
          onClick={handleAutoRenderShow}
          className={isAutoRendering ? 'timeline-panel__auto-render-active' : undefined}
        />
        <AudioImportControl />
        <IconButton icon="chevron-down" label="Recolher Timeline" onClick={toggleCollapsed} />
      </div>
      <div
        className="timeline-panel__scroll"
        onClick={() => {
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
          }
          setSelectedEventId(null);
        }}
      >
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
          <div
            className="timeline-panel__tracks"
            ref={tracksRef}
            onPointerDown={handleTracksPointerDown}
          >
            {ungroupedKeys.map(renderTrack)}

            {folders.map((folder) => {
              const memberKeys = resolvedOrder.filter((key) => trackFolder[key] === folder.id);
              return (
                <div key={folder.id} className="timeline-folder">
                  <div className="timeline-folder__header" onClick={() => toggleTimelineFolderCollapsed(folder.id)}>
                    <Icon name={folder.collapsed ? 'chevron-right' : 'chevron-down'} size={11} />
                    <span>{folder.name}</span>
                    <span className="timeline-folder__count">{memberKeys.length}</span>
                  </div>
                  {!folder.collapsed && memberKeys.map(renderTrack)}
                </div>
              );
            })}

            {devices.length === 0 && groups.length === 0 && (
              <div className="timeline-panel__empty">Adicione efeitos da Biblioteca de Efeitos para criar faixas na timeline.</div>
            )}
            <div
              className="timeline-panel__playhead-line"
              style={{ left: TRACK_LABEL_WIDTH + currentTime * PX_PER_SECOND }}
            />
            {boxOverlay && <div className="timeline-panel__box-select" style={boxOverlay} />}
          </div>
        </div>
      </div>
    </div>
  );
}
