import { useEffect, useState } from 'react';
import { eventBus } from '../../engine/eventBus';
import { useProjectStore } from '../../stores/projectStore';
import { getDeviceDefinition } from '../../devices/registry';
import { CATEGORY_COLOR_HEX } from '../../devices/categoryColors';
import { createId } from '../../utils/id';
import { EffectJet } from './effects3d/EffectJet';
import { EffectBurst } from './effects3d/EffectBurst';
import { EffectCloud } from './effects3d/EffectCloud';
import { EffectConfettiFall } from './effects3d/EffectConfettiFall';
import type { SimulationType } from '../../types';

type EffectFamily = 'jet' | 'burst' | 'cloud' | 'confetti';

/**
 * Every SimulationType maps to one of a handful of shared visual "families"
 * rather than nine bespoke effects — stylized, not physically accurate (out
 * of scope per the project brief), but each family is a real registered
 * simulationEngine handler so a future bespoke effect for one type is a
 * drop-in replacement, not a rearchitecture.
 */
const FAMILY_BY_SIMULATION_TYPE: Record<SimulationType, EffectFamily> = {
  flame: 'jet',
  co2: 'jet',
  spark: 'jet',
  mine: 'burst',
  comet: 'burst',
  smoke: 'cloud',
  fog: 'cloud',
  confettiCannon: 'confetti',
  streamer: 'confetti',
};

interface ActiveEffect {
  id: string;
  family: EffectFamily;
  position: [number, number, number];
  color: string;
  height: number;
}

export function SimulationEffects3D() {
  const [active, setActive] = useState<ActiveEffect[]>([]);

  useEffect(
    () =>
      eventBus.on('SIMULATION_TRIGGER', ({ deviceId, simulationType, parameters }) => {
        const device = useProjectStore.getState().project.devices.find((d) => d.id === deviceId);
        if (!device) return;
        const definition = getDeviceDefinition(device.definitionId);
        if (!definition) return;

        const family = FAMILY_BY_SIMULATION_TYPE[simulationType as SimulationType];
        if (!family) return;

        const height = typeof parameters.height === 'number' ? parameters.height : 3;
        const color = device.color ?? CATEGORY_COLOR_HEX[definition.category];

        setActive((prev) => [
          ...prev,
          {
            id: createId(),
            family,
            position: [device.position.x, device.position.z, device.position.y],
            color,
            height,
          },
        ]);
      }),
    [],
  );

  const remove = (id: string) => setActive((prev) => prev.filter((e) => e.id !== id));

  return (
    <>
      {active.map((effect) => {
        const props = { id: effect.id, position: effect.position, color: effect.color, height: effect.height, onDone: remove };
        switch (effect.family) {
          case 'jet':
            return <EffectJet key={effect.id} {...props} />;
          case 'burst':
            return <EffectBurst key={effect.id} {...props} />;
          case 'cloud':
            return <EffectCloud key={effect.id} {...props} />;
          case 'confetti':
            return <EffectConfettiFall key={effect.id} {...props} />;
        }
      })}
    </>
  );
}
