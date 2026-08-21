import { create } from 'zustand';
import { eventBus } from '../engine/eventBus';

interface SelectionState {
  selectedDeviceIds: string[];
  /**
   * Platforms/figures currently only support single-select (dragging a box
   * over them isn't wired up yet — see StageRenderer2D's box-select, which
   * still only hit-tests devices). Kept as arrays anyway so multi-select can
   * be added later without another store shape change.
   */
  selectedPlatformIds: string[];
  selectedFigureIds: string[];
  /** The selected timeline cue(s) (TimelineEvent), if any. Independent of
   * the stage selection above — kept in this shared store (rather than as
   * local component state, which is where it lived before) specifically so
   * the global keyboard shortcut handler can reach it for Delete/arrow-key
   * support, the same way it already reaches device/platform/figure
   * selection. An array (not a single id) so the timeline's mouse-drag
   * box-select can mark several cues at once for bulk deletion. */
  selectedTimelineEventIds: string[];
  /** True while a box-selection drag is in progress on the Stage Editor. */
  isBoxSelecting: boolean;

  select: (deviceId: string) => void;
  toggle: (deviceId: string) => void;
  setSelection: (deviceIds: string[]) => void;
  addToSelection: (deviceIds: string[]) => void;
  clear: () => void;
  isSelected: (deviceId: string) => boolean;

  /** Selecting a platform/figure clears device selection and vice versa —
   * the Inspector shows properties for exactly one kind of thing at a time. */
  selectPlatform: (platformId: string) => void;
  selectFigure: (figureId: string) => void;
  selectTimelineEvent: (eventId: string | null) => void;
  /** Replaces the whole timeline cue selection — used by the timeline's
   * mouse-drag box-select to mark everything the drag rectangle covered. */
  selectTimelineEvents: (eventIds: string[]) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedDeviceIds: [],
  selectedPlatformIds: [],
  selectedFigureIds: [],
  selectedTimelineEventIds: [],
  isBoxSelecting: false,

  select: (deviceId) => {
    set({
      selectedDeviceIds: [deviceId],
      selectedPlatformIds: [],
      selectedFigureIds: [],
      selectedTimelineEventIds: [],
    });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: [deviceId] });
  },

  toggle: (deviceId) => {
    const current = get().selectedDeviceIds;
    const next = current.includes(deviceId)
      ? current.filter((id) => id !== deviceId)
      : [...current, deviceId];
    set({
      selectedDeviceIds: next,
      selectedPlatformIds: [],
      selectedFigureIds: [],
      selectedTimelineEventIds: [],
    });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: next });
  },

  setSelection: (deviceIds) => {
    set({
      selectedDeviceIds: deviceIds,
      selectedPlatformIds: [],
      selectedFigureIds: [],
      selectedTimelineEventIds: [],
    });
    eventBus.emit('SELECTION_CHANGED', { deviceIds });
  },

  addToSelection: (deviceIds) => {
    const current = get().selectedDeviceIds;
    const next = Array.from(new Set([...current, ...deviceIds]));
    set({
      selectedDeviceIds: next,
      selectedPlatformIds: [],
      selectedFigureIds: [],
      selectedTimelineEventIds: [],
    });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: next });
  },

  clear: () => {
    set({
      selectedDeviceIds: [],
      selectedPlatformIds: [],
      selectedFigureIds: [],
      selectedTimelineEventIds: [],
    });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: [] });
  },

  isSelected: (deviceId) => get().selectedDeviceIds.includes(deviceId),

  selectPlatform: (platformId) => {
    set({
      selectedPlatformIds: [platformId],
      selectedDeviceIds: [],
      selectedFigureIds: [],
      selectedTimelineEventIds: [],
    });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: [] });
  },

  selectFigure: (figureId) => {
    set({
      selectedFigureIds: [figureId],
      selectedDeviceIds: [],
      selectedPlatformIds: [],
      selectedTimelineEventIds: [],
    });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: [] });
  },

  selectTimelineEvent: (eventId) =>
    set(
      eventId
        ? { selectedTimelineEventIds: [eventId], selectedDeviceIds: [], selectedPlatformIds: [], selectedFigureIds: [] }
        : { selectedTimelineEventIds: [] },
    ),

  selectTimelineEvents: (eventIds) =>
    set(
      eventIds.length > 0
        ? { selectedTimelineEventIds: eventIds, selectedDeviceIds: [], selectedPlatformIds: [], selectedFigureIds: [] }
        : { selectedTimelineEventIds: [] },
    ),
}));
