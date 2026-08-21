import type { SimulationType } from '../../../types';

export interface Effect3DProps {
  id: string;
  /** Ground position of the device that triggered this effect, in three.js space (x, height, depth). */
  position: [number, number, number];
  color: string;
  /** Target height in meters, from the device's simulation parameters. */
  height: number;
  /** Firing angle in degrees, from the device's simulation parameters —
   * 90 = straight up, tilting away from 90 leans the trajectory toward
   * the device's facing direction (see directionFromAngle below). Devices
   * that don't declare `variableAngle` never expose this in the UI, so it
   * stays at the definition's default (usually 90) for them. */
  angle: number;
  /** The device's facing direction (DeviceInstance.rotation.z, degrees) —
   * `angle` tilts the trajectory within the vertical plane this points
   * along, so rotating the device instance re-aims a tilted effect. */
  yaw: number;
  /** How wide the effect opens — a multiplier on the family's default
   * horizontal spread/burst size (1 = the spread used before this control
   * existed), independent of how high/far particles travel. */
  width: number;
  /** Optional shape variant (currently only EffectJet uses it): how the
   * spread grows over the particles' flight. Absent = the family's normal
   * default behavior. */
  shape?: EffectShape;
  /** Drives per-type styling within a shared family — e.g. EffectJet renders flame/co2/spark differently. */
  simulationType: SimulationType;
  onDone: (id: string) => void;
}

export type EffectShape = 'open' | 'cone' | 'invertedCone';

/**
 * Unit trajectory direction for a tilted effect: x/z from the device's
 * facing yaw, y from how far `angle` leans away from straight up (90°).
 * Shared by every effect family so "tilt toward where the device is
 * rotated" means the same thing everywhere.
 */
export function directionFromAngle(angleDeg: number, yawDeg: number): { x: number; y: number; z: number } {
  const tilt = ((90 - angleDeg) * Math.PI) / 180;
  const yaw = (-yawDeg * Math.PI) / 180;
  return {
    x: Math.sin(tilt) * Math.sin(yaw),
    y: Math.cos(tilt),
    z: Math.sin(tilt) * Math.cos(yaw),
  };
}
