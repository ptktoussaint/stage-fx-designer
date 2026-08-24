import { create } from 'zustand';

export type StageTool = 'select' | 'distance' | 'pan';

interface ContextMenuState {
  x: number;
  y: number;
  /** What was right-clicked: a device/platform/figure (with its id), or empty stage space. */
  target:
    | { type: 'device'; deviceId: string }
    | { type: 'platform'; platformId: string }
    | { type: 'figure'; figureId: string }
    | { type: 'stage' }
    | null;
}

interface UiState {
  zoom: number;
  pan: { x: number; y: number };
  activeTool: StageTool;

  leftSidebarTab: 'fx' | 'scenery';
  leftSidebarWidth: number;
  rightInspectorWidth: number;
  timelineHeight: number;
  isTimelineCollapsed: boolean;

  contextMenu: ContextMenuState | null;
  isStageSettingsOpen: boolean;
  isHotkeysPanelOpen: boolean;
  isClipRecording: boolean;
  isProjectPanelOpen: boolean;
  isAutoRendering: boolean;
  autoRenderProgress: number;

  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setActiveTool: (tool: StageTool) => void;
  setLeftSidebarTab: (tab: 'fx' | 'scenery') => void;
  setLeftSidebarWidth: (w: number) => void;
  setRightInspectorWidth: (w: number) => void;
  setTimelineHeight: (h: number) => void;
  toggleTimelineCollapsed: () => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  setStageSettingsOpen: (open: boolean) => void;
  setHotkeysPanelOpen: (open: boolean) => void;
  setClipRecording: (recording: boolean) => void;
  setProjectPanelOpen: (open: boolean) => void;
  setAutoRendering: (rendering: boolean) => void;
  setAutoRenderProgress: (progress: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  zoom: 1,
  pan: { x: 40, y: 40 },
  activeTool: 'select',

  leftSidebarTab: 'fx',
  leftSidebarWidth: 260,
  rightInspectorWidth: 300,
  timelineHeight: 220,
  isTimelineCollapsed: false,

  contextMenu: null,
  isStageSettingsOpen: false,
  isHotkeysPanelOpen: false,
  isClipRecording: false,
  isProjectPanelOpen: false,
  isAutoRendering: false,
  autoRenderProgress: 0,

  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),
  setPan: (pan) => set({ pan }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setLeftSidebarTab: (leftSidebarTab) => set({ leftSidebarTab }),
  setLeftSidebarWidth: (w) => set({ leftSidebarWidth: Math.min(480, Math.max(180, w)) }),
  setRightInspectorWidth: (w) => set({ rightInspectorWidth: Math.min(480, Math.max(220, w)) }),
  setTimelineHeight: (h) => set({ timelineHeight: Math.min(560, Math.max(80, h)) }),
  toggleTimelineCollapsed: () => set((s) => ({ isTimelineCollapsed: !s.isTimelineCollapsed })),
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),
  setStageSettingsOpen: (isStageSettingsOpen) => set({ isStageSettingsOpen }),
  setHotkeysPanelOpen: (isHotkeysPanelOpen) => set({ isHotkeysPanelOpen }),
  setClipRecording: (isClipRecording) => set({ isClipRecording }),
  setProjectPanelOpen: (isProjectPanelOpen) => set({ isProjectPanelOpen }),
  setAutoRendering: (isAutoRendering) => set({ isAutoRendering }),
  setAutoRenderProgress: (autoRenderProgress) => set({ autoRenderProgress }),
}));
