import type { DeviceInstance } from './instance';
import type { Group } from './group';
import type { HotkeyBinding } from './hotkey';
import type { StageConfig } from './stage';
import type { TimelineData } from './timeline';

export const CURRENT_SCHEMA_VERSION = 1;

export interface AudioConfig {
  /**
   * Object URL for the loaded track, valid only for the current page
   * session — object URLs never survive a reload. The persisted source of
   * truth is the raw Blob kept separately in IndexedDB (see
   * src/persistence/audioStorage.ts) and re-attached to a fresh object URL
   * on load. Never persist a blob: URL string as if it were durable.
   */
  sourceUrl: string | null;
  fileName: string | null;
  /** Duration in seconds, once known. */
  duration: number | null;
  /** Offset applied when aligning audio to timeline zero, in seconds. */
  offset: number;
  /**
   * Downsampled amplitude peaks (0..1) for waveform rendering, computed once
   * at import time so the Timeline never has to re-decode the audio file.
   */
  waveformPeaks: number[] | null;
  /**
   * Playback window, in seconds from the start of the original file. The
   * file itself is never re-encoded/sliced — trimming only clamps where
   * playback starts and where it auto-stops, so it's cheap and always
   * reversible by dragging the handles back out.
   */
  trimStart: number;
  /** null = trim end not set, i.e. play through to the natural end of the file. */
  trimEnd: number | null;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sourceUrl: null,
  fileName: null,
  duration: null,
  offset: 0,
  waveformPeaks: null,
  trimStart: 0,
  trimEnd: null,
};

export interface ProjectSettings {
  viewMode: '2D' | '3D';
  snap: {
    enabled: boolean;
    toGrid: boolean;
    toDevice: boolean;
    toCenter: boolean;
    toStageEdge: boolean;
    gridSize: number;
  };
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  viewMode: '2D',
  snap: {
    enabled: true,
    toGrid: true,
    toDevice: true,
    toCenter: true,
    toStageEdge: true,
    gridSize: 0.5,
  },
};

/**
 * Root project document. This is the single source of truth persisted to
 * disk/IndexedDB and (later) to cloud storage. schemaVersion allows old
 * projects to be migrated forward when the shape of this document changes.
 */
export interface Project {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  stage: StageConfig;
  devices: DeviceInstance[];
  groups: Group[];
  audio: AudioConfig;
  timeline: TimelineData;
  settings: ProjectSettings;
  hotkeys: HotkeyBinding[];
}
