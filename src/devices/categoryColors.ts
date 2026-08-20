import type { DeviceCategory } from '../types';

/**
 * Hex mirror of the --cat-* custom properties in src/index.css. The 2D
 * renderer reads the CSS variables directly; the 3D renderer needs real
 * color values for three.js materials, which can't consume CSS vars, so
 * this is the one place both must be kept in sync.
 */
export const CATEGORY_COLOR_HEX: Record<DeviceCategory, string> = {
  FIRE: '#e0693f',
  CO2: '#4fb8d6',
  SPARK: '#e0c23f',
  PYRO_SIMULATION: '#d64f6f',
  ATMOSPHERIC: '#8b93a3',
  CONFETTI: '#a06fe0',
};
