import type { DeviceDefinition } from '../../types';

export const atmosphericDevices: DeviceDefinition[] = [
  {
    id: 'smoke',
    name: 'Fumaça',
    category: 'ATMOSPHERIC',
    icon: 'smoke',
    simulationType: 'smoke',
    namePrefix: 'SMOKE',
    footprint: { width: 0.5, depth: 0.5 },
    capabilities: {
      variableDuration: true,
      variableIntensity: true,
      variableAngle: false,
    },
    defaultParameters: { duration: 5, intensity: 0.7 },
  },
  {
    id: 'fog',
    name: 'Neblina',
    category: 'ATMOSPHERIC',
    icon: 'fog',
    simulationType: 'fog',
    namePrefix: 'FOG',
    footprint: { width: 0.6, depth: 0.6 },
    capabilities: {
      variableDuration: true,
      variableIntensity: true,
      variableAngle: false,
    },
    defaultParameters: { duration: 8, intensity: 0.5 },
  },
];
