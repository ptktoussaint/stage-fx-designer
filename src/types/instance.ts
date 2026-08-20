import type { Vector3, Rotation3 } from './geometry';

/**
 * DeviceInstance = a SPECIFIC machine placed in a specific show.
 * References a DeviceDefinition by id; never duplicates catalog data.
 */
export interface DeviceInstance {
  id: string;
  definitionId: string;
  /** User-facing label, e.g. "FIRE 01". Independent from `id` (UUID) — renaming never changes `id`. */
  name: string;
  position: Vector3;
  rotation: Rotation3;
  groupIds: string[];
  /** Per-instance overrides merged on top of DeviceDefinition.defaultParameters. */
  customProperties: Record<string, number | string | boolean>;
  enabled: boolean;
  locked: boolean;
  /** Optional UI color override (e.g. for stage-map readability); falls back to category color. */
  color?: string;
}
