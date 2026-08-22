/**
 * Minimal typed pub/sub bus. This is the seam that keeps the Timeline,
 * Stage Editor, and Simulation Engine decoupled from each other: nobody
 * calls another module's methods directly to react to something that
 * happened elsewhere — they publish/subscribe an AppEvent instead.
 *
 * Zustand stores remain the source of truth for state; the bus is only for
 * cross-cutting notifications (undo/redo bookkeeping, simulation triggers,
 * playback ticks) where a direct store subscription would be awkward or
 * would wrongly couple two unrelated modules.
 */
import type { DeviceInstance, TimelineEvent } from '../types';

export type AppEventMap = {
  DEVICE_ADDED: { device: DeviceInstance };
  DEVICE_REMOVED: { deviceId: string };
  DEVICE_MOVED: { deviceId: string };
  DEVICE_UPDATED: { deviceId: string };
  SELECTION_CHANGED: { deviceIds: string[] };
  EVENT_ADDED: { event: TimelineEvent };
  EVENT_UPDATED: { event: TimelineEvent };
  EVENT_REMOVED: { eventId: string };
  PLAYBACK_STARTED: { currentTime: number };
  PLAYBACK_STOPPED: { currentTime: number };
  PLAYHEAD_CHANGED: { currentTime: number };
  SIMULATION_TRIGGER: {
    deviceId: string;
    simulationType: string;
    action: TimelineEvent['action'];
    parameters: Record<string, number | string | boolean>;
    /** Set by useHotkeyEngine's held-key loop on every retrigger of a live
     * hold (never by the Inspector's one-shot "Testar Disparo" or the Show
     * Engine's Timeline playback) — see SimulationEffects3D's
     * MIN_HOLD_KEEPALIVE_SECONDS for why this needs to widen the
     * continuous-hold self-expire safety margin. */
    keepAlive?: boolean;
  };
};

export type AppEventName = keyof AppEventMap;

type Listener<K extends AppEventName> = (payload: AppEventMap[K]) => void;

class EventBus {
  private listeners = new Map<AppEventName, Set<Listener<AppEventName>>>();

  on<K extends AppEventName>(event: K, listener: Listener<K>): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as Listener<AppEventName>);
    this.listeners.set(event, set);
    return () => this.off(event, listener);
  }

  off<K extends AppEventName>(event: K, listener: Listener<K>): void {
    this.listeners.get(event)?.delete(listener as Listener<AppEventName>);
  }

  emit<K extends AppEventName>(event: K, payload: AppEventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}

export const eventBus = new EventBus();
