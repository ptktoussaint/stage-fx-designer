export interface Effect3DProps {
  id: string;
  /** Ground position of the device that triggered this effect, in three.js space (x, height, depth). */
  position: [number, number, number];
  color: string;
  /** Target height in meters, from the device's simulation parameters. */
  height: number;
  onDone: (id: string) => void;
}
