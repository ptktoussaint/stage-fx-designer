import type { DeviceDefinition } from '../../types';

export const fireDevices: DeviceDefinition[] = [
  {
    id: 'flame-jet',
    name: 'Jato de Chama',
    category: 'FIRE',
    icon: 'flame',
    simulationType: 'flame',
    namePrefix: 'FIRE',
    footprint: { width: 0.4, depth: 0.4 },
    capabilities: {
      variableDuration: true,
      variableIntensity: true,
      variableAngle: true,
      variableWidth: true,
    },
    defaultParameters: {
      height: 3,
      duration: 1.2,
      intensity: 0.8,
      angle: 90,
      width: 1,
    },
  },
  {
    id: 'fire-machine',
    name: 'Máquina de Fogo',
    category: 'FIRE',
    icon: 'flame',
    simulationType: 'flame',
    namePrefix: 'FIRE',
    footprint: { width: 0.5, depth: 0.5 },
    capabilities: {
      variableDuration: true,
      variableIntensity: true,
      variableAngle: false,
      variableWidth: true,
    },
    defaultParameters: {
      height: 2,
      duration: 0.8,
      intensity: 1,
      width: 1,
    },
  },
];
