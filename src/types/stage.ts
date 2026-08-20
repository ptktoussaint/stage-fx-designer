export interface StageConfig {
  /** Stage width along X, in meters. */
  width: number;
  /** Stage depth along Y, in meters. */
  depth: number;
  /** Deck height of the stage platform off the ground, in meters — purely
   * visual (renders the stage as a real riser box in 3D); device Z
   * positions stay independent so existing shows are unaffected. */
  height: number;
  /** Extra floor area in front of the stage (y < 0), in meters, at ground
   * level (z=0) — lets effects be placed off-stage (e.g. a dance floor / pit
   * area) instead of only on the deck. 0 = no extension. */
  frontMargin: number;
  /** World-space origin offset of the stage's front-left corner, in meters. */
  origin: { x: number; y: number };
  /** Grid spacing, in meters, used for the visual grid and "snap to grid". */
  gridSize: number;
}

export const DEFAULT_STAGE_CONFIG: StageConfig = {
  width: 20,
  depth: 12,
  height: 1,
  frontMargin: 6,
  origin: { x: 0, y: 0 },
  gridSize: 0.5,
};
