import { create } from 'zustand';
import type {
  AudioConfig,
  DeviceInstance,
  FigureInstance,
  Group,
  HotkeyBinding,
  PlatformInstance,
  Project,
  ProjectSettings,
  StageConfig,
  TimelineData,
  TimelineEvent,
} from '../types';
import { CURRENT_SCHEMA_VERSION, DEFAULT_AUDIO_CONFIG, DEFAULT_PROJECT_SETTINGS } from '../types';
import { DEFAULT_STAGE_CONFIG } from '../types/stage';
import { createId } from '../utils/id';
import { saveProjectToLocal } from '../persistence/autosave';

export function createEmptyProject(name = 'Untitled Show'): Project {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    stage: { ...DEFAULT_STAGE_CONFIG },
    devices: [],
    platforms: [],
    figures: [],
    groups: [],
    audio: { ...DEFAULT_AUDIO_CONFIG },
    timeline: { events: [], folders: [], trackOrder: [], trackFolder: {} },
    settings: { ...DEFAULT_PROJECT_SETTINGS, snap: { ...DEFAULT_PROJECT_SETTINGS.snap } },
    hotkeys: [],
  };
}

/**
 * Model layer for the active Project document.
 *
 * IMPORTANT: methods prefixed with `_` are low-level mutators meant to be
 * called ONLY from src/commands/* (the Command Pattern implementation that
 * provides undo/redo). React components should never call `_` methods
 * directly — they should dispatch a command from src/commands instead, so
 * every state change stays undoable and observable on the history stack.
 */
interface ProjectState {
  project: Project;

  _setProject: (project: Project) => void;
  _touch: () => void;

  _addDevice: (device: DeviceInstance) => void;
  _removeDevice: (deviceId: string) => void;
  _removeDevices: (deviceIds: string[]) => void;
  _updateDevice: (deviceId: string, patch: Partial<DeviceInstance>) => void;

  _addPlatform: (platform: PlatformInstance) => void;
  _removePlatform: (platformId: string) => void;
  _removePlatforms: (platformIds: string[]) => void;
  _updatePlatform: (platformId: string, patch: Partial<PlatformInstance>) => void;

  _addFigure: (figure: FigureInstance) => void;
  _removeFigure: (figureId: string) => void;
  _removeFigures: (figureIds: string[]) => void;
  _updateFigure: (figureId: string, patch: Partial<FigureInstance>) => void;

  _addGroup: (group: Group) => void;
  _removeGroup: (groupId: string) => void;
  _updateGroup: (groupId: string, patch: Partial<Group>) => void;

  _addTimelineEvent: (event: TimelineEvent) => void;
  _removeTimelineEvent: (eventId: string) => void;
  _updateTimelineEvent: (eventId: string, patch: Partial<TimelineEvent>) => void;

  _addHotkey: (binding: HotkeyBinding) => void;
  _removeHotkey: (bindingId: string) => void;
  _updateHotkey: (bindingId: string, patch: Partial<HotkeyBinding>) => void;

  _setStage: (patch: Partial<StageConfig>) => void;
  _setSettings: (patch: Partial<ProjectSettings>) => void;
  _setProjectName: (name: string) => void;

  /**
   * Not underscore-prefixed on purpose: importing/removing an audio track
   * is a one-off project-setup action, not a device/timeline edit a user
   * would expect on the undo stack, so it bypasses the Command Pattern and
   * is safe to call directly from UI code.
   */
  setAudio: (patch: Partial<AudioConfig>) => void;

  /**
   * Same rationale as setAudio: reordering/grouping timeline tracks is
   * organizing the editor's view of the show, not editing the show's
   * content — not something a user thinks of as undo-stack-worthy.
   */
  setTimelineOrganization: (patch: Partial<Omit<TimelineData, 'events'>>) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createEmptyProject(),

  _setProject: (project) => set({ project }),

  _touch: () =>
    set((s) => ({ project: { ...s.project, updatedAt: new Date().toISOString() } })),

  _addDevice: (device) =>
    set((s) => ({
      project: {
        ...s.project,
        devices: [...s.project.devices, device],
        updatedAt: new Date().toISOString(),
      },
    })),

  _removeDevice: (deviceId) =>
    set((s) => ({
      project: {
        ...s.project,
        devices: s.project.devices.filter((d) => d.id !== deviceId),
        groups: s.project.groups.map((g) => ({
          ...g,
          deviceIds: g.deviceIds.filter((id) => id !== deviceId),
        })),
        timeline: {
          ...s.project.timeline,
          events: s.project.timeline.events.filter(
            (e) => !(e.targetType === 'device' && e.targetId === deviceId),
          ),
        },
        hotkeys: s.project.hotkeys
          .map((h) => ({ ...h, deviceIds: h.deviceIds.filter((id) => id !== deviceId) }))
          .filter((h) => h.deviceIds.length > 0),
        updatedAt: new Date().toISOString(),
      },
    })),

  _removeDevices: (deviceIds) =>
    set((s) => {
      const idSet = new Set(deviceIds);
      return {
        project: {
          ...s.project,
          devices: s.project.devices.filter((d) => !idSet.has(d.id)),
          groups: s.project.groups.map((g) => ({
            ...g,
            deviceIds: g.deviceIds.filter((id) => !idSet.has(id)),
          })),
          timeline: {
            ...s.project.timeline,
            events: s.project.timeline.events.filter(
              (e) => !(e.targetType === 'device' && idSet.has(e.targetId)),
            ),
          },
          hotkeys: s.project.hotkeys
            .map((h) => ({ ...h, deviceIds: h.deviceIds.filter((id) => !idSet.has(id)) }))
            .filter((h) => h.deviceIds.length > 0),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  _updateDevice: (deviceId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        devices: s.project.devices.map((d) => (d.id === deviceId ? { ...d, ...patch } : d)),
        updatedAt: new Date().toISOString(),
      },
    })),

  _addPlatform: (platform) =>
    set((s) => ({
      project: {
        ...s.project,
        platforms: [...s.project.platforms, platform],
        updatedAt: new Date().toISOString(),
      },
    })),

  _removePlatform: (platformId) =>
    set((s) => ({
      project: {
        ...s.project,
        platforms: s.project.platforms.filter((p) => p.id !== platformId),
        updatedAt: new Date().toISOString(),
      },
    })),

  _removePlatforms: (platformIds) =>
    set((s) => {
      const idSet = new Set(platformIds);
      return {
        project: {
          ...s.project,
          platforms: s.project.platforms.filter((p) => !idSet.has(p.id)),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  _updatePlatform: (platformId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        platforms: s.project.platforms.map((p) => (p.id === platformId ? { ...p, ...patch } : p)),
        updatedAt: new Date().toISOString(),
      },
    })),

  _addFigure: (figure) =>
    set((s) => ({
      project: { ...s.project, figures: [...s.project.figures, figure], updatedAt: new Date().toISOString() },
    })),

  _removeFigure: (figureId) =>
    set((s) => ({
      project: {
        ...s.project,
        figures: s.project.figures.filter((f) => f.id !== figureId),
        updatedAt: new Date().toISOString(),
      },
    })),

  _removeFigures: (figureIds) =>
    set((s) => {
      const idSet = new Set(figureIds);
      return {
        project: {
          ...s.project,
          figures: s.project.figures.filter((f) => !idSet.has(f.id)),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  _updateFigure: (figureId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        figures: s.project.figures.map((f) => (f.id === figureId ? { ...f, ...patch } : f)),
        updatedAt: new Date().toISOString(),
      },
    })),

  _addGroup: (group) =>
    set((s) => ({
      project: { ...s.project, groups: [...s.project.groups, group], updatedAt: new Date().toISOString() },
    })),

  _removeGroup: (groupId) =>
    set((s) => ({
      project: {
        ...s.project,
        groups: s.project.groups.filter((g) => g.id !== groupId),
        devices: s.project.devices.map((d) => ({
          ...d,
          groupIds: d.groupIds.filter((id) => id !== groupId),
        })),
        updatedAt: new Date().toISOString(),
      },
    })),

  _updateGroup: (groupId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        groups: s.project.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
        updatedAt: new Date().toISOString(),
      },
    })),

  _addTimelineEvent: (event) =>
    set((s) => ({
      project: {
        ...s.project,
        timeline: { ...s.project.timeline, events: [...s.project.timeline.events, event] },
        updatedAt: new Date().toISOString(),
      },
    })),

  _removeTimelineEvent: (eventId) =>
    set((s) => ({
      project: {
        ...s.project,
        timeline: { ...s.project.timeline, events: s.project.timeline.events.filter((e) => e.id !== eventId) },
        updatedAt: new Date().toISOString(),
      },
    })),

  _updateTimelineEvent: (eventId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        timeline: {
          ...s.project.timeline,
          events: s.project.timeline.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
        },
        updatedAt: new Date().toISOString(),
      },
    })),

  _addHotkey: (binding) =>
    set((s) => ({
      project: { ...s.project, hotkeys: [...s.project.hotkeys, binding], updatedAt: new Date().toISOString() },
    })),

  _removeHotkey: (bindingId) =>
    set((s) => ({
      project: {
        ...s.project,
        hotkeys: s.project.hotkeys.filter((h) => h.id !== bindingId),
        updatedAt: new Date().toISOString(),
      },
    })),

  _updateHotkey: (bindingId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        hotkeys: s.project.hotkeys.map((h) => (h.id === bindingId ? { ...h, ...patch } : h)),
        updatedAt: new Date().toISOString(),
      },
    })),

  _setStage: (patch) =>
    set((s) => ({ project: { ...s.project, stage: { ...s.project.stage, ...patch }, updatedAt: new Date().toISOString() } })),

  _setSettings: (patch) =>
    set((s) => ({
      project: {
        ...s.project,
        settings: { ...s.project.settings, ...patch },
        updatedAt: new Date().toISOString(),
      },
    })),

  _setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name, updatedAt: new Date().toISOString() } })),

  setAudio: (patch) => {
    set((s) => ({
      project: { ...s.project, audio: { ...s.project.audio, ...patch }, updatedAt: new Date().toISOString() },
    }));
    // Bypasses the Command Pattern (see the interface doc comment above),
    // so it also bypasses historyStore's immediate-flush-on-command — flush
    // here instead. Otherwise removing a track/trimming falls back to the
    // debounced autosave alone and can lose the change to a fast reload,
    // same race as the one fixed in historyStore for command-based edits.
    void saveProjectToLocal(get().project);
  },

  setTimelineOrganization: (patch) => {
    set((s) => ({
      project: {
        ...s.project,
        timeline: { ...s.project.timeline, ...patch },
        updatedAt: new Date().toISOString(),
      },
    }));
    void saveProjectToLocal(get().project);
  },
}));
