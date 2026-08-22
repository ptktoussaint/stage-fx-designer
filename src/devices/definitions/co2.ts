import type { DeviceDefinition } from '../../types';

export const co2Devices: DeviceDefinition[] = [
  {
    id: 'co2-jet',
    name: 'Jato de CO₂',
    category: 'CO2',
    icon: 'co2',
    simulationType: 'co2',
    namePrefix: 'CO2',
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
    },
    defaultParameters: {
      height: 4,
      intensity: 1,
      angle: 90,
      width: 1,
    },
  },
];
