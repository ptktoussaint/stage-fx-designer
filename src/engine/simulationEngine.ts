import { useProjectStore } from '../stores/projectStore';
import { eventBus } from './eventBus';
import type { Rotation3, SimulationType, TimelineAction, Vector3 } from '../types';

export interface SimulationContext {
  deviceId: string;
  simulationType: SimulationType;
  action: TimelineAction;
  parameters: Record<string, number | string | boolean>;
  position: Vector3;
  rotation: Rotation3;
}

export type SimulationHandler = (ctx: SimulationContext) => void;

/**
 * Owns "what should happen visually" for a device, independent of whether
 * the active renderer is 2D or 3D (StageRenderer2D/3D both register their
 * own handlers here rather than the Simulation Engine knowing about either).
 * The engine itself never touches WHERE (Stage Editor) or WHEN (Timeline)
 * beyond reading the device's current position/rotation to hand to handlers.
 */
class SimulationEngine {
  private handlers = new Map<SimulationType, Set<SimulationHandler>>();

  registerHandler(type: SimulationType, handler: SimulationHandler): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  triggerEffect(
    deviceId: string,
    effectType: SimulationType,
    action: TimelineAction,
    parameters: Record<string, number | string | boolean>,
  ): void {
    const device = useProjectStore.getState().project.devices.find((d) => d.id === deviceId);
    if (!device) return;

    const ctx: SimulationContext = {
      deviceId,
      simulationType: effectType,
      action,
      parameters,
      position: device.position,
      rotation: device.rotation,
    };
    this.handlers.get(effectType)?.forEach((handler) => handler(ctx));
  }
}

export const simulationEngine = new SimulationEngine();

// Bridge: the Show Engine only knows WHO/WHEN. It emits SIMULATION_TRIGGER
// on the bus; the Simulation Engine is the sole subscriber that turns that
// into an actual visual trigger, keeping the two concerns decoupled.
eventBus.on('SIMULATION_TRIGGER', (payload) => {
  simulationEngine.triggerEffect(
    payload.deviceId,
    payload.simulationType as SimulationType,
    payload.action,
    payload.parameters,
  );
});
