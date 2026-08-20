import { useProjectStore } from '../stores/projectStore';
import { getDeviceDefinition } from '../devices/registry';
import { eventBus } from './eventBus';
import type { Project, TimelineEvent } from '../types';

/**
 * Resolves timeline data ("what should fire and when") into concrete
 * SIMULATION_TRIGGER events. This is the only place that reads TimelineEvent
 * data during playback — Timeline UI components only ever EDIT timeline
 * data, they never drive the stage directly. That separation is what lets
 * the same show run identically whether the Timeline panel is open or not.
 */
export class ShowEngine {
  private lastTime = 0;

  reset(time = 0): void {
    this.lastTime = time;
  }

  /** Called on every playback frame with the new transport time, in seconds. */
  tick(currentTime: number): void {
    const { project } = useProjectStore.getState();
    if (currentTime < this.lastTime) {
      // Playhead was scrubbed backwards — resync without re-firing past events.
      this.lastTime = currentTime;
      return;
    }
    const dueEvents = project.timeline.events.filter(
      (event) => event.time > this.lastTime && event.time <= currentTime,
    );
    dueEvents.forEach((event) => this.dispatch(event, project));
    this.lastTime = currentTime;
  }

  private dispatch(event: TimelineEvent, project: Project): void {
    for (const deviceId of this.resolveTargets(event, project)) {
      const device = project.devices.find((d) => d.id === deviceId);
      if (!device || !device.enabled) continue;
      const definition = getDeviceDefinition(device.definitionId);
      if (!definition) continue;

      eventBus.emit('SIMULATION_TRIGGER', {
        deviceId,
        simulationType: definition.simulationType,
        action: event.action,
        parameters: {
          ...definition.defaultParameters,
          ...device.customProperties,
          ...event.parameters,
        },
      });
    }
  }

  private resolveTargets(event: TimelineEvent, project: Project): string[] {
    if (event.targetType === 'device') return [event.targetId];
    const group = project.groups.find((g) => g.id === event.targetId);
    return group ? group.deviceIds : [];
  }
}

export const showEngine = new ShowEngine();
