import { useEffect, useState } from 'react';
import { eventBus } from '../../engine/eventBus';
import { useProjectStore } from '../../stores/projectStore';
import { getDeviceDefinition } from '../../devices/registry';
import { CATEGORY_COLOR_HEX } from '../../devices/categoryColors';
import { localFloorElevation } from '../../engine/coordinates';
import { createId } from '../../utils/id';
import { EffectJet } from './effects3d/EffectJet';
import { EffectBurst } from './effects3d/EffectBurst';
import { EffectCloud } from './effects3d/EffectCloud';
import { EffectConfettiFall } from './effects3d/EffectConfettiFall';
import type { EffectShape } from './effects3d/types';
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

/**
 * Hard ceiling on simultaneous effect instances. Each instance owns its own
 * particle batch (14-30+ meshes with a per-frame useFrame callback), so
 * without a cap a burst of triggers in a short window — many devices on one
 * hotkey, a dense stretch of the timeline, anything upstream misbehaving —
 * degrades into an unrecoverable frame-rate death spiral rather than a
 * dropped visual. Oldest effect is evicted first, same as it would have
 * finished and disappeared on its own a moment later.
 */
const MAX_CONCURRENT_EFFECTS = 40;

/**
 * Simulation types whose visual is a continuous stream rather than a
 * one-off burst — a held hotkey should read as one sustained jet, not a
 * pile of separate mini-effects stacking up every retrigger. Flame belongs
 * here too: a real fire-machine jet stays lit as one continuous flame while
 * triggered, and without this a held hotkey stacks several independent
 * flame instances on top of each other — their additive blending piles up
 * fast and washes the whole thing out to solid white. Mine/comet are
 * deliberately excluded: a real pyro mine is a one-shot burst, and holding
 * its hotkey firing several distinct bursts in a row is the realistic
 * behavior, not a bug.
 */
const CONTINUOUS_HOLD_TYPES = new Set<SimulationType>(['flame', 'co2', 'spark']);

/**
 * Fallback self-expiry for a continuous-hold effect (flame/CO2/spark) when
 * nothing ever explicitly stops it — e.g. the Inspector's "Testar Disparo"
 * button or a Timeline-driven trigger, neither of which has a keyup to pair
 * with. Live hotkey use doesn't rely on this at all: useHotkeyEngine emits
 * an explicit 'stop' the instant the key comes up (see the handler below),
 * which ends the effect on the spot — this timer only exists so a one-shot
 * trigger with no matching 'stop' doesn't run forever. Falls back to this
 * constant if the device has no numeric `duration` parameter of its own.
 */
const DEFAULT_SELF_EXPIRE_SECONDS = 1.5;

interface ActiveEffect {
  id: string;
  deviceId: string;
  family: EffectFamily;
  position: [number, number, number];
  color: string;
  height: number;
  angle: number;
  yaw: number;
  width: number;
  shape?: EffectShape;
  simulationType: SimulationType;
  /** Self-expiry timestamp (performance.now() clock) — only ever used as a
   * fallback if no explicit 'stop' arrives; see DEFAULT_SELF_EXPIRE_SECONDS. */
  holdUntil: number;
}

export function SimulationEffects3D() {
  const [active, setActive] = useState<ActiveEffect[]>([]);

  useEffect(
    () =>
      eventBus.on('SIMULATION_TRIGGER', ({ deviceId, simulationType, action, parameters }) => {
        if (action === 'stop') {
          // Key-up from useHotkeyEngine: end this device's continuous-hold
          // effect right now, no fade — that's what makes a quick tap read
          // as a quick tap instead of lingering for a fixed grace window
          // regardless of how briefly the key was actually held. Ignored
          // for one-shot families (mine/comet, ...): those always finish
          // their own fixed animation independent of hold duration.
          if (CONTINUOUS_HOLD_TYPES.has(simulationType as SimulationType)) {
            setActive((prev) => prev.filter((e) => !(e.deviceId === deviceId && e.simulationType === simulationType)));
          }
          return;
        }

        const project = useProjectStore.getState().project;
        const device = project.devices.find((d) => d.id === deviceId);
        if (!device) return;
        const definition = getDeviceDefinition(device.definitionId);
        if (!definition) return;

        const family = FAMILY_BY_SIMULATION_TYPE[simulationType as SimulationType];
        if (!family) return;

        const height = typeof parameters.height === 'number' ? parameters.height : 3;
        const color = device.color ?? CATEGORY_COLOR_HEX[definition.category];
        const originY = localFloorElevation(device.position.y, project.stage.height) + device.position.z;
        const angle = typeof parameters.angle === 'number' ? parameters.angle : 90;
        const width = typeof parameters.width === 'number' ? parameters.width : 1;
        const shape = typeof parameters.shape === 'string' ? (parameters.shape as EffectShape) : undefined;
        const selfExpireSeconds = typeof parameters.duration === 'number' ? parameters.duration : DEFAULT_SELF_EXPIRE_SECONDS;

        const position: [number, number, number] = [device.position.x, originY, device.position.y];
        const holdUntil = performance.now() + selfExpireSeconds * 1000;

        setActive((prev) => {
          if (CONTINUOUS_HOLD_TYPES.has(simulationType as SimulationType)) {
            const existingIndex = prev.findIndex((e) => e.deviceId === deviceId && e.simulationType === simulationType);
            if (existingIndex !== -1) {
              // Same device firing again while its previous jet is still
              // active — extend it in place (same id, same mounted
              // component/animation state) instead of stacking a new
              // instance on top.
              const next = [...prev];
              next[existingIndex] = { ...next[existingIndex], position, color, height, angle, yaw: device.rotation.z, width, shape, holdUntil };
              return next;
            }
          }

          const next = [
            ...prev,
            {
              id: createId(),
              deviceId,
              family,
              position,
              color,
              height,
              angle,
              yaw: device.rotation.z,
              width,
              shape,
              simulationType: simulationType as SimulationType,
              holdUntil,
            },
          ];
          return next.length > MAX_CONCURRENT_EFFECTS ? next.slice(next.length - MAX_CONCURRENT_EFFECTS) : next;
        });
      }),
    [],
  );

  const remove = (id: string) => setActive((prev) => prev.filter((e) => e.id !== id));

  return (
    <>
      {active.map((effect) => {
        const props = {
          id: effect.id,
          position: effect.position,
          color: effect.color,
          height: effect.height,
          angle: effect.angle,
          yaw: effect.yaw,
          width: effect.width,
          shape: effect.shape,
          simulationType: effect.simulationType,
          holdUntil: effect.holdUntil,
          onDone: remove,
        };
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
