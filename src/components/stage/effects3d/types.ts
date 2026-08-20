import type { SimulationType } from '../../../types';

export interface Effect3DProps {
  id: string;
  /** Ground position of the device that triggered this effect, in three.js space (x, height, depth). */
  position: [number, number, number];
  color: string;
  /** Target height in meters, from the device's simulation parameters. */
  height: number;
  /** Drives per-type styling within a shared family — e.g. EffectJet renders flame/co2/spark differently. */
  simulationType: SimulationType;
  onDone: (id: string) => void;
}
