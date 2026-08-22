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
    const events = project.timeline.events;

    // A cue's END crossing this window gets an explicit 'stop', independent
    // of the cue's own recorded action (always 'trigger' today) — without
    // this, a continuous-hold cue (flame/co2/spark) recorded from a hotkey
    // hold had no way to end on its own during playback and fell back to
    // the DEVICE's "Duração do Efeito" parameter instead of the cue's own
    // recorded/resized length, so a 2s hold on the timeline could play back
    // for however long the device parameter happened to say. Dispatched
    // before the starts below so a cue ending the same instant another
    // begins on the same device doesn't have its stop wrongly kill the new
    // one (SimulationEffects3D matches 'stop' by device+type, not cue id).
    const dueEnds = events.filter((event) => {
      const end = event.time + event.duration;
      return end > this.lastTime && end <= currentTime;
    });
    dueEnds.forEach((event) => this.dispatch(event, project, 'stop'));

    const dueStarts = events.filter((event) => event.time > this.lastTime && event.time <= currentTime);
    dueStarts.forEach((event) => this.dispatch(event, project, event.action));

    this.lastTime = currentTime;
  }

  private dispatch(event: TimelineEvent, project: Project, action: TimelineEvent['action']): void {
    for (const deviceId of this.resolveTargets(event, project)) {
      const device = project.devices.find((d) => d.id === deviceId);
      if (!device || !device.enabled) continue;
      const definition = getDeviceDefinition(device.definitionId);
      if (!definition) continue;

      eventBus.emit('SIMULATION_TRIGGER', {
        deviceId,
        simulationType: definition.simulationType,
        action,
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
