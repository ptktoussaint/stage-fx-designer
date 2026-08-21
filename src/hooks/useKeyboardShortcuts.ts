import { useEffect } from 'react';
import { useSelectionStore } from '../stores/selectionStore';
import { useProjectStore } from '../stores/projectStore';
import { usePlaybackStore } from '../stores/playbackStore';
import {
  undo,
  redo,
  removeDevices,
  duplicateDevices,
  createGroup,
  removePlatforms,
  removeFigures,
  moveDevices,
  movePlatform,
  moveFigure,
  removeTimelineEvents,
  updateTimelineEvent,
} from '../commands';
import { saveProjectToLocal } from '../persistence/autosave';
import { isTypingInField } from '../utils/dom';
import type { Vector3 } from '../types';

const GROUP_COLORS = ['#4f8cff', '#e0693f', '#4bbf7a', '#d6a23c', '#a06fe0', '#4fb8d6'];

/** project.x+ / project.y+ per arrow press. Matches the 2D top-down canvas
 * (project.y grows "down the screen," toward the back of the stage) and,
 * since it's a plain world-space offset with no camera math, works exactly
 * the same regardless of which 3D angle you're looking from. */
const ARROW_DELTA: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

/**
 * Copy/paste "clipboard" for devices. A plain module-level array rather
 * than store state — it's not part of the project (nothing to persist or
 * undo about the clipboard itself, only about the paste it produces) and
 * this hook is mounted exactly once near the app root.
 */
let deviceClipboard: string[] = [];

/** Mount once near the app root. Professional-editor shortcut set (see spec §20). */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const typing = isTypingInField(e.target);

      if (e.key === 'Escape') {
        useSelectionStore.getState().clear();
        (document.activeElement as HTMLElement | null)?.blur?.();
        return;
      }

      if (typing) return;

      if (isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'c') {
        const selected = useSelectionStore.getState().selectedDeviceIds;
        if (selected.length > 0) {
          e.preventDefault();
          deviceClipboard = selected;
        }
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'v') {
        if (deviceClipboard.length > 0) {
          e.preventDefault();
          // Reuses the same offset-and-rename logic as Duplicate — pasting
          // is "duplicate the copied devices," just decoupled from the
          // current selection so copy-then-select-elsewhere-then-paste works.
          duplicateDevices(deviceClipboard);
        }
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateDevices(useSelectionStore.getState().selectedDeviceIds);
        return;
      }
      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveProjectToLocal(useProjectStore.getState().project);
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        useSelectionStore.getState().setSelection(useProjectStore.getState().project.devices.map((d) => d.id));
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selection = useSelectionStore.getState();
        if (selection.selectedDeviceIds.length > 0) {
          e.preventDefault();
          removeDevices(selection.selectedDeviceIds);
        } else if (selection.selectedPlatformIds.length > 0) {
          e.preventDefault();
          removePlatforms(selection.selectedPlatformIds);
        } else if (selection.selectedFigureIds.length > 0) {
          e.preventDefault();
          removeFigures(selection.selectedFigureIds);
        } else if (selection.selectedTimelineEventIds.length > 0) {
          e.preventDefault();
          removeTimelineEvents(selection.selectedTimelineEventIds);
        }
        return;
      }

      if (e.key in ARROW_DELTA) {
        const selection = useSelectionStore.getState();
        const hasStageSelection =
          selection.selectedDeviceIds.length > 0 ||
          selection.selectedPlatformIds.length > 0 ||
          selection.selectedFigureIds.length > 0;

        if (!hasStageSelection) {
          // No device/platform/figure selected — timeline cues might be, in
          // which case Left/Right nudges their time instead of an x/y
          // position (cues are 1-D: a time, not a place on the stage).
          if (selection.selectedTimelineEventIds.length > 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            const allEvents = useProjectStore.getState().project.timeline.events;
            const selectedEvents = allEvents.filter((ev) => selection.selectedTimelineEventIds.includes(ev.id));
            if (selectedEvents.length > 0) {
              e.preventDefault();
              const step = e.shiftKey ? 1 : 0.1;
              const delta = e.key === 'ArrowLeft' ? -step : step;
              selectedEvents.forEach((event) => {
                const nextTime = Math.max(0, event.time + delta);
                updateTimelineEvent(event.id, { time: event.time }, { time: nextTime });
              });
            }
          }
          return;
        }
        e.preventDefault();

        const { dx, dy } = ARROW_DELTA[e.key];
        const project = useProjectStore.getState().project;
        const step = (e.shiftKey ? 5 : 1) * project.stage.gridSize;
        const offset = (pos: Vector3): Vector3 => ({
          x: pos.x + dx * step,
          y: pos.y + dy * step,
          z: pos.z,
        });

        if (selection.selectedDeviceIds.length > 0) {
          const moves = selection.selectedDeviceIds
            .map((id) => {
              const device = project.devices.find((d) => d.id === id);
              if (!device || device.locked) return null;
              return { deviceId: id, from: device.position, to: offset(device.position) };
            })
            .filter((m): m is { deviceId: string; from: Vector3; to: Vector3 } => m !== null);
          moveDevices(moves);
        }
        selection.selectedPlatformIds.forEach((id) => {
          const platform = project.platforms.find((p) => p.id === id);
          if (!platform || platform.locked) return;
          movePlatform(id, platform.position, offset(platform.position));
        });
        selection.selectedFigureIds.forEach((id) => {
          const figure = project.figures.find((f) => f.id === id);
          if (!figure || figure.locked) return;
          moveFigure(id, figure.position, offset(figure.position));
        });
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        usePlaybackStore.getState().togglePlay();
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        const selected = useSelectionStore.getState().selectedDeviceIds;
        if (selected.length > 0) {
          const name = window.prompt('Nome do grupo');
          if (name && name.trim()) {
            const groupCount = useProjectStore.getState().project.groups.length;
            createGroup(name.trim(), selected, GROUP_COLORS[groupCount % GROUP_COLORS.length]);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
