import type { Command } from './Command';
import { useProjectStore } from '../stores/projectStore';
import type { Group } from '../types';
import { createId } from '../utils/id';

/**
 * Adds `groupId` to every listed device's groupIds, reading fresh state on
 * each iteration. NEVER read `.project` off a `useProjectStore.getState()`
 * result and reuse it after a mutating call in the same function — each
 * `getState()` snapshot is a point-in-time object, and `_setProject` writes
 * whatever object it's given verbatim, so a stale snapshot silently
 * resurrects data an earlier call in the same function just removed.
 * Always re-call `getState()` after any `_xxx` mutator before reading state.
 */
function addGroupIdToDevices(groupId: string, deviceIds: string[]): void {
  deviceIds.forEach((deviceId) => {
    const device = useProjectStore.getState().project.devices.find((d) => d.id === deviceId);
    if (device && !device.groupIds.includes(groupId)) {
      useProjectStore.getState()._updateDevice(deviceId, { groupIds: [...device.groupIds, groupId] });
    }
  });
}

export class CreateGroupCommand implements Command {
  label: string;
  readonly group: Group;
  private readonly deviceIds: string[];

  constructor(name: string, deviceIds: string[], color: string) {
    this.deviceIds = deviceIds;
    this.group = { id: createId(), name, deviceIds, color };
    this.label = `Agrupar "${name}"`;
  }

  execute() {
    useProjectStore.getState()._addGroup(this.group);
    addGroupIdToDevices(this.group.id, this.deviceIds);
  }

  undo() {
    // _removeGroup already strips this groupId from every device's
    // groupIds, so nothing else needs restoring.
    useProjectStore.getState()._removeGroup(this.group.id);
  }
}

export class UngroupCommand implements Command {
  label: string;
  private readonly group: Group;

  constructor(group: Group) {
    this.group = group;
    this.label = `Desagrupar "${group.name}"`;
  }

  execute() {
    useProjectStore.getState()._removeGroup(this.group.id);
  }

  undo() {
    useProjectStore.getState()._addGroup(this.group);
    addGroupIdToDevices(this.group.id, this.group.deviceIds);
  }
}

export class SetDevicesLockedCommand implements Command {
  label: string;
  private readonly deviceIds: string[];
  private readonly locked: boolean;

  constructor(deviceIds: string[], locked: boolean) {
    this.deviceIds = deviceIds;
    this.locked = locked;
    this.label = locked ? 'Travar Efeitos' : 'Destravar Efeitos';
  }

  execute() {
    const store = useProjectStore.getState();
    this.deviceIds.forEach((id) => store._updateDevice(id, { locked: this.locked }));
  }

  undo() {
    const store = useProjectStore.getState();
    this.deviceIds.forEach((id) => store._updateDevice(id, { locked: !this.locked }));
  }
}
