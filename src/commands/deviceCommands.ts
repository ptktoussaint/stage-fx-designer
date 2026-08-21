import type { Command } from './Command';
import { useProjectStore } from '../stores/projectStore';
import { useSelectionStore } from '../stores/selectionStore';
import type { DeviceDefinition, DeviceInstance, Group, TimelineEvent, Vector3 } from '../types';
import { createId, nextInstanceName } from '../utils/id';
import { eventBus } from '../engine/eventBus';

export class AddDeviceCommand implements Command {
  label: string;
  readonly device: DeviceInstance;

  constructor(definition: DeviceDefinition, position: Vector3) {
    const existingNames = useProjectStore.getState().project.devices.map((d) => d.name);
    this.device = {
      id: createId(),
      definitionId: definition.id,
      name: nextInstanceName(definition.namePrefix, existingNames),
      position,
      rotation: { z: 0 },
      groupIds: [],
      customProperties: { ...definition.defaultParameters },
      enabled: true,
      locked: false,
    };
    this.label = `Add ${this.device.name}`;
  }

  execute() {
    useProjectStore.getState()._addDevice(this.device);
    eventBus.emit('DEVICE_ADDED', { device: this.device });
  }

  undo() {
    useProjectStore.getState()._removeDevice(this.device.id);
    eventBus.emit('DEVICE_REMOVED', { deviceId: this.device.id });
  }
}

export class RemoveDevicesCommand implements Command {
  label: string;
  private readonly deviceIds: string[];
  private readonly prevDevices: DeviceInstance[];
  private readonly prevGroups: Group[];
  private readonly prevEvents: TimelineEvent[];

  constructor(deviceIds: string[]) {
    this.deviceIds = deviceIds;
    const { project } = useProjectStore.getState();
    this.prevDevices = project.devices;
    this.prevGroups = project.groups;
    this.prevEvents = project.timeline.events;
    this.label = deviceIds.length > 1 ? `Delete ${deviceIds.length} Devices` : 'Delete Device';
  }

  execute() {
    useProjectStore.getState()._removeDevices(this.deviceIds);
    useSelectionStore.getState().setSelection([]);
    this.deviceIds.forEach((deviceId) => eventBus.emit('DEVICE_REMOVED', { deviceId }));
  }

  undo() {
    const store = useProjectStore.getState();
    store._setProject({
      ...store.project,
      devices: this.prevDevices,
      groups: this.prevGroups,
      timeline: { ...store.project.timeline, events: this.prevEvents },
    });
  }
}

export class MoveDeviceCommand implements Command {
  label: string;
  private readonly deviceId: string;
  private readonly from: Vector3;
  private to: Vector3;

  constructor(deviceId: string, from: Vector3, to: Vector3) {
    this.deviceId = deviceId;
    this.from = from;
    this.to = to;
    this.label = 'Move Device';
  }

  execute() {
    useProjectStore.getState()._updateDevice(this.deviceId, { position: this.to });
    eventBus.emit('DEVICE_MOVED', { deviceId: this.deviceId });
  }

  undo() {
    useProjectStore.getState()._updateDevice(this.deviceId, { position: this.from });
    eventBus.emit('DEVICE_MOVED', { deviceId: this.deviceId });
  }

  mergeWith(next: Command): Command | null {
    if (!(next instanceof MoveDeviceCommand) || next.deviceId !== this.deviceId) return null;
    const merged = new MoveDeviceCommand(this.deviceId, this.from, next.to);
    return merged;
  }
}

export interface DeviceMove {
  deviceId: string;
  from: Vector3;
  to: Vector3;
}

/**
 * Commits a multi-device drag gesture as one undo entry. The Stage Editor
 * applies live position updates directly to the store while the pointer is
 * down (for zero-latency dragging) and only dispatches this command once,
 * on pointer-up, with the start/end positions it already knows — so
 * `execute()` here is a no-op re-application, and `undo()` is what actually
 * restores prior state.
 */
export class MoveDevicesCommand implements Command {
  label: string;
  private readonly moves: DeviceMove[];

  constructor(moves: DeviceMove[]) {
    this.moves = moves;
    this.label = moves.length > 1 ? `Move ${moves.length} Devices` : 'Move Device';
  }

  execute() {
    const store = useProjectStore.getState();
    this.moves.forEach(({ deviceId, to }) => store._updateDevice(deviceId, { position: to }));
    this.moves.forEach(({ deviceId }) => eventBus.emit('DEVICE_MOVED', { deviceId }));
  }

  undo() {
    const store = useProjectStore.getState();
    this.moves.forEach(({ deviceId, from }) => store._updateDevice(deviceId, { position: from }));
    this.moves.forEach(({ deviceId }) => eventBus.emit('DEVICE_MOVED', { deviceId }));
  }
}

export class UpdateDevicePropertyCommand implements Command {
  label: string;
  private readonly deviceId: string;
  private readonly patchBefore: Partial<DeviceInstance>;
  private readonly patchAfter: Partial<DeviceInstance>;

  constructor(deviceId: string, patchBefore: Partial<DeviceInstance>, patchAfter: Partial<DeviceInstance>, label = 'Edit Device') {
    this.deviceId = deviceId;
    this.patchBefore = patchBefore;
    this.patchAfter = patchAfter;
    this.label = label;
  }

  execute() {
    useProjectStore.getState()._updateDevice(this.deviceId, this.patchAfter);
    eventBus.emit('DEVICE_UPDATED', { deviceId: this.deviceId });
  }

  undo() {
    useProjectStore.getState()._updateDevice(this.deviceId, this.patchBefore);
    eventBus.emit('DEVICE_UPDATED', { deviceId: this.deviceId });
  }
}

export class DuplicateDevicesCommand implements Command {
  label: string;
  private readonly sourceIds: string[];
  private duplicates: DeviceInstance[] = [];

  constructor(sourceIds: string[]) {
    this.sourceIds = sourceIds;
    this.label = sourceIds.length > 1 ? `Duplicate ${sourceIds.length} Devices` : 'Duplicate Device';
  }

  execute() {
    const { project } = useProjectStore.getState();
    const existingNames = project.devices.map((d) => d.name);
    this.duplicates = project.devices
      .filter((d) => this.sourceIds.includes(d.id))
      .map((d) => {
        const definitionPrefix = d.name.replace(/\s*\d+$/, '').trim();
        const name = nextInstanceName(definitionPrefix, [...existingNames]);
        existingNames.push(name);
        return {
          ...d,
          id: createId(),
          name,
          position: { x: d.position.x + 0.5, y: d.position.y + 0.5, z: d.position.z },
          groupIds: [...d.groupIds],
        };
      });
    const store = useProjectStore.getState();
    this.duplicates.forEach((d) => store._addDevice(d));
    useSelectionStore.getState().setSelection(this.duplicates.map((d) => d.id));
  }

  undo() {
    const store = useProjectStore.getState();
    store._removeDevices(this.duplicates.map((d) => d.id));
  }
}
