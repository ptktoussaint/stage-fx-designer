import type { DeviceDefinition } from '../../types';

export const co2Devices: DeviceDefinition[] = [
  {
    id: 'co2-jet',
    name: 'CO₂ Jet',
    category: 'CO2',
    icon: 'co2',
    simulationType: 'co2',
    namePrefix: 'CO2',
    footprint: { width: 0.3, depth: 0.3 },
    capabilities: {
      variableDuration: true,
      variableIntensity: true,
      variableAngle: true,
    },
    defaultParameters: {
      height: 4,
      duration: 1.5,
      intensity: 1,
      angle: 90,
    },
  },
];
