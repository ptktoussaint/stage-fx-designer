import type { DeviceDefinition } from '../../types';

export const sparkDevices: DeviceDefinition[] = [
  {
    id: 'sparkular',
    name: 'Sparkular',
    category: 'SPARK',
    icon: 'spark',
    simulationType: 'spark',
    namePrefix: 'SPARK',
    footprint: { width: 0.3, depth: 0.3 },
    capabilities: {
      variableDuration: true,
      variableIntensity: true,
      variableAngle: true,
    },
    defaultParameters: {
      height: 5,
      duration: 2,
      intensity: 0.9,
      angle: 90,
    },
  },
];
