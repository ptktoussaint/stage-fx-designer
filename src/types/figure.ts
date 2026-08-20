import type { Vector3, Rotation3 } from './geometry';

/**
 * FigureDefinition = the TYPE of scenery figure (catalog entry), mirroring
 * DeviceDefinition's pattern: never referenced by hardcoded strings in
 * components — always looked up through the figure registry
 * (src/figures/registry.ts). Figures are placement/scale references (where
 * a dancer, band member, or instrument will stand), not simulated FX.
 */
export type FigureCategory = 'DANCER' | 'BAND_MEMBER' | 'INSTRUMENT';

export interface FigureDefinition {
  id: string;
  name: string;
  category: FigureCategory;
  icon: string;
  /** Real-world footprint on the 2D stage, in meters. */
  footprint: { width: number; depth: number };
  /** Standing/resting height, in meters — drives the 3D marker's scale. */
  heightMeters: number;
  /** Prefix used for auto-generated instance names, e.g. "Dancer" -> Dancer 01. */
  namePrefix: string;
}

export interface FigureInstance {
  id: string;
  definitionId: string;
  name: string;
  position: Vector3;
  rotation: Rotation3;
  locked: boolean;
  color?: string;
}
