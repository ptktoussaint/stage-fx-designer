import type { Vector3, Rotation3 } from './geometry';

/**
 * PlatformInstance = a "praticável" (riser/platform/DJ table): a physical
 * structure placed on stage with dimensions the user defines per instance
 * (unlike DeviceInstance, whose footprint comes from a shared catalog
 * definition) — e.g. "1.2m wide x 1.0m tall x 0.5m deep". Purely a scenery
 * object: it never emits a SIMULATION_TRIGGER, it only occupies real space
 * so effects can be positioned relative to it at true scale.
 */
export interface PlatformInstance {
  id: string;
  /** User-facing label, e.g. "DJ Table". */
  name: string;
  /** Position of the platform's base-center (bottom face), in meters. */
  position: Vector3;
  rotation: Rotation3;
  /** Physical size in meters: width (X), height (Z), depth (Y). */
  dimensions: { width: number; height: number; depth: number };
  color: string;
  locked: boolean;
}

export const DEFAULT_PLATFORM_COLOR = '#5b6472';

export const PLATFORM_PRESETS: { name: string; dimensions: PlatformInstance['dimensions'] }[] = [
  { name: 'DJ Table', dimensions: { width: 1.2, height: 1.0, depth: 0.5 } },
  { name: 'Riser 2x1m', dimensions: { width: 2, height: 0.4, depth: 1 } },
  { name: 'Riser 1x1m', dimensions: { width: 1, height: 0.4, depth: 1 } },
  { name: 'Custom Platform', dimensions: { width: 1, height: 0.6, depth: 1 } },
];
