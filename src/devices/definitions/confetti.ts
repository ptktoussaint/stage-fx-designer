import type { DeviceDefinition } from '../../types';

export const confettiDevices: DeviceDefinition[] = [
  {
    id: 'confetti-cannon',
    name: 'Canhão de Confete',
    category: 'CONFETTI',
    icon: 'confetti',
    simulationType: 'confettiCannon',
    namePrefix: 'CONFETTI',
    footprint: { width: 0.3, depth: 0.3 },
    capabilities: {
      variableDuration: false,
      variableIntensity: true,
      variableAngle: true,
      variableWidth: true,
      maxShots: 1,
    },
    defaultParameters: { height: 6, intensity: 1, angle: 90, width: 1 },
  },
  {
    id: 'streamer',
    name: 'Serpentina',
    category: 'CONFETTI',
    icon: 'confetti',
    simulationType: 'streamer',
    namePrefix: 'STREAMER',
    footprint: { width: 0.3, depth: 0.3 },
    capabilities: {
      variableDuration: false,
      variableIntensity: true,
      variableAngle: true,
      variableWidth: true,
      maxShots: 1,
    },
    defaultParameters: { height: 8, intensity: 1, angle: 90, width: 1 },
  },
];
