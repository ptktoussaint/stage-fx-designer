import type { ProjectSettings, StageConfig, Vector3 } from '../types';

export function snapValue(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface DistanceResult {
  horizontal: number;
  vertical: number;
  euclidean: number;
}

const SNAP_MAGNETISM_METERS = 0.15;

/**
 * Applies the active snap modes (grid / device / center / stage edge) to a
 * candidate X/Y, in priority order. Only X/Y ever snap — Z (height) is set
 * explicitly via the Inspector, never implied by 2D dragging.
 */
export function snapPosition(
  pos: Vector3,
  stage: StageConfig,
  snap: ProjectSettings['snap'],
  otherDevicePositions: Vector3[],
): Vector3 {
  if (!snap.enabled) return pos;
  let { x, y } = pos;

  if (snap.toGrid) {
    x = snapValue(x, snap.gridSize);
    y = snapValue(y, snap.gridSize);
  }
  if (snap.toStageEdge) {
    if (Math.abs(x) < SNAP_MAGNETISM_METERS) x = 0;
    if (Math.abs(x - stage.width) < SNAP_MAGNETISM_METERS) x = stage.width;
    if (Math.abs(y) < SNAP_MAGNETISM_METERS) y = 0;
    if (Math.abs(y - stage.depth) < SNAP_MAGNETISM_METERS) y = stage.depth;
  }
  if (snap.toCenter) {
    const centerX = stage.width / 2;
    const centerY = stage.depth / 2;
    if (Math.abs(x - centerX) < SNAP_MAGNETISM_METERS) x = centerX;
    if (Math.abs(y - centerY) < SNAP_MAGNETISM_METERS) y = centerY;
  }
  if (snap.toDevice) {
    for (const other of otherDevicePositions) {
      if (Math.abs(x - other.x) < SNAP_MAGNETISM_METERS) x = other.x;
      if (Math.abs(y - other.y) < SNAP_MAGNETISM_METERS) y = other.y;
    }
  }

  return { ...pos, x, y };
}

/** horizontal = delta X (stage width axis), vertical = delta Y (stage depth axis). */
export function computeDistance(a: Vector3, b: Vector3): DistanceResult {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return {
    horizontal: Math.abs(dx),
    vertical: Math.abs(dy),
    euclidean: Math.sqrt(dx * dx + dy * dy + dz * dz),
  };
}
