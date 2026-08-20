export interface StageConfig {
  /** Stage width along X, in meters. */
  width: number;
  /** Stage depth along Y, in meters. */
  depth: number;
  /** World-space origin offset of the stage's front-left corner, in meters. */
  origin: { x: number; y: number };
  /** Grid spacing, in meters, used for the visual grid and "snap to grid". */
  gridSize: number;
}

export const DEFAULT_STAGE_CONFIG: StageConfig = {
  width: 20,
  depth: 12,
  origin: { x: 0, y: 0 },
  gridSize: 0.5,
};
