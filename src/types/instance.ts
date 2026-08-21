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
  /** Color of the SIMULATED EFFECT this device fires (the flame/spark/confetti
   * particle color) — falls back to the category default. Independent from
   * `bodyColor` below: you might want an orange flame effect out of a
   * red-painted machine, or want to color-code machines by stage zone
   * without changing what color they actually fire. */
  color?: string;
  /** Color of the physical machine model itself (2D icon + 3D body) —
   * falls back to the category default. Independent from `color` above. */
  bodyColor?: string;
}
