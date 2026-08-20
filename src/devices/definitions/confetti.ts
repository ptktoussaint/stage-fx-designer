import type { DeviceDefinition } from '../../types';

export const confettiDevices: DeviceDefinition[] = [
  {
    id: 'confetti-cannon',
    name: 'Confetti Cannon',
    category: 'CONFETTI',
    icon: 'confetti',
    simulationType: 'confettiCannon',
    namePrefix: 'CONFETTI',
    footprint: { width: 0.3, depth: 0.3 },
    capabilities: {
      variableDuration: false,
      variableIntensity: true,
      variableAngle: true,
      maxShots: 1,
    },
    defaultParameters: { height: 6, intensity: 1, angle: 90 },
  },
  {
    id: 'streamer',
    name: 'Streamer',
    category: 'CONFETTI',
    icon: 'confetti',
    simulationType: 'streamer',
    namePrefix: 'STREAMER',
    footprint: { width: 0.3, depth: 0.3 },
    capabilities: {
      variableDuration: false,
      variableIntensity: true,
      variableAngle: true,
      maxShots: 1,
    },
    defaultParameters: { height: 8, intensity: 1, angle: 90 },
  },
];
