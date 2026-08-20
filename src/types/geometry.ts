/**
 * Coordinate system convention (fixed for the whole app):
 *   X = horizontal position on stage (meters)
 *   Y = depth, distance from the front of the stage (meters)
 *   Z = height / elevation (meters)
 * All stage-space quantities are stored in METERS. Pixels only exist inside renderers.
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Rotation3 {
  /** Yaw, rotation around Z axis, in degrees. Pitch/roll reserved for future 3D use. */
  z: number;
  pitch?: number;
  roll?: number;
}

export interface Vector2 {
  x: number;
  y: number;
}
