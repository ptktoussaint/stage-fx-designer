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
      // Not user-configurable: how long the effect runs is always either
      // "as long as the hotkey stays held" (live) or "the timeline cue's
      // own recorded/resized length" (playback) — see SimulationEffects3D
      // and showEngine.dispatch.
      variableDuration: false,
      variableIntensity: true,
      variableAngle: true,
      variableWidth: true,
    },
    defaultParameters: {
      height: 3,
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
      variableDuration: false,
      variableIntensity: true,
      variableAngle: false,
      variableWidth: true,
    },
    defaultParameters: {
      height: 2,
      intensity: 1,
      width: 1,
    },
  },
];
