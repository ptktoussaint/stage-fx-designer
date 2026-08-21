/**
 * DeviceDefinition = the TYPE of equipment (catalog entry).
 * Never referenced by hardcoded strings in components — always looked up
 * through the device registry (src/devices).
 */
export type DeviceCategory =
  | 'FIRE'
  | 'CO2'
  | 'SPARK'
  | 'PYRO_SIMULATION'
  | 'ATMOSPHERIC'
  | 'CONFETTI';

/**
 * Drives which handler in the Simulation Engine renders/animates the effect.
 * Independent from DeviceCategory: category is a catalog grouping, simulationType
 * is a rendering behavior. Several definitions can share one simulationType.
 */
export type SimulationType =
  | 'flame'
  | 'co2'
  | 'spark'
  | 'mine'
  | 'comet'
  | 'smoke'
  | 'fog'
  | 'confettiCannon'
  | 'streamer';

export interface DeviceCapabilities {
  /** Can this device's trigger duration be controlled per-event? */
  variableDuration: boolean;
  /** Does it support an intensity/power parameter? */
  variableIntensity: boolean;
  /** Does it support a firing angle / rotation parameter? */
  variableAngle: boolean;
  /** Does it support a spread/width parameter (how wide the effect opens)? */
  variableWidth?: boolean;
  /** Does it support a shape variant (open / cone / inverted cone)? */
  variableShape?: boolean;
  /** Maximum simultaneous shots (pyro-style devices), if relevant. */
  maxShots?: number;
}

export interface DeviceDefinition {
  id: string;
  name: string;
  category: DeviceCategory;
  /** Icon key, resolved by the icon set — never inline SVG/JSX in the registry. */
  icon: string;
  simulationType: SimulationType;
  capabilities: DeviceCapabilities;
  /** Default values merged into a new DeviceInstance's customProperties. */
  defaultParameters: Record<string, number | string | boolean>;
  /** Prefix used for auto-generated instance names, e.g. "FIRE" -> FIRE 01, FIRE 02 */
  namePrefix: string;
  /** Default footprint on the 2D stage, in meters, for the selection/bounding box. */
  footprint: { width: number; depth: number };
}
