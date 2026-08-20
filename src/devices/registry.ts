import type { DeviceCategory, DeviceDefinition } from '../types';
import { fireDevices } from './definitions/fire';
import { co2Devices } from './definitions/co2';
import { sparkDevices } from './definitions/spark';
import { pyroDevices } from './definitions/pyro';
import { atmosphericDevices } from './definitions/atmospheric';
import { confettiDevices } from './definitions/confetti';

/**
 * Single source of truth for every device type the FX Library can offer.
 * Adding a new machine model means adding one entry to a definitions/*.ts
 * file — never touching a React component.
 */
export const DEVICE_DEFINITIONS: DeviceDefinition[] = [
  ...fireDevices,
  ...co2Devices,
  ...sparkDevices,
  ...pyroDevices,
  ...atmosphericDevices,
  ...confettiDevices,
];

const definitionById = new Map(DEVICE_DEFINITIONS.map((d) => [d.id, d]));

export function getDeviceDefinition(id: string): DeviceDefinition | undefined {
  return definitionById.get(id);
}

export const CATEGORY_ORDER: DeviceCategory[] = [
  'FIRE',
  'CO2',
  'SPARK',
  'PYRO_SIMULATION',
  'ATMOSPHERIC',
  'CONFETTI',
];

export const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  FIRE: 'Fire',
  CO2: 'CO₂',
  SPARK: 'Spark',
  PYRO_SIMULATION: 'Pyro Simulation',
  ATMOSPHERIC: 'Atmospheric',
  CONFETTI: 'Confetti',
};

export function getDefinitionsByCategory(category: DeviceCategory): DeviceDefinition[] {
  return DEVICE_DEFINITIONS.filter((d) => d.category === category);
}
