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
      // Not user-configurable: how long the effect runs is always either
      // "as long as the hotkey stays held" (live) or "the timeline cue's
      // own recorded/resized length" (playback) — see SimulationEffects3D
      // and showEngine.dispatch.
      variableDuration: false,
      variableIntensity: true,
      variableAngle: true,
      variableWidth: true,
      variableShape: true,
    },
    defaultParameters: {
      height: 5,
      intensity: 0.9,
      angle: 90,
      width: 1,
      shape: 'cone',
    },
  },
];
