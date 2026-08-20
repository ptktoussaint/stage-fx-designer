import type { DeviceInstance } from './instance';
import type { Group } from './group';
import type { StageConfig } from './stage';
import type { TimelineData } from './timeline';

export const CURRENT_SCHEMA_VERSION = 1;

export interface AudioConfig {
  /** Object URL or asset reference for the loaded track; null if none loaded. */
  sourceUrl: string | null;
  fileName: string | null;
  /** Duration in seconds, once known. */
  duration: number | null;
  /** Offset applied when aligning audio to timeline zero, in seconds. */
  offset: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sourceUrl: null,
  fileName: null,
  duration: null,
  offset: 0,
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
}
