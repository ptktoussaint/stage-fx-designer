/**
 * Public action API. Components should import from here — never construct a
 * Command directly and never call a projectStore `_` mutator directly. This
 * keeps every state change routed through the undo/redo history.
 */
import { useHistoryStore } from '../stores/historyStore';
import { useProjectStore } from '../stores/projectStore';
import type { Command } from './Command';
import type { AudioConfig, DeviceDefinition, DeviceInstance, TimelineEvent, Vector3 } from '../types';
import {
  AddDeviceCommand,
  DuplicateDevicesCommand,
  MoveDeviceCommand,
  MoveDevicesCommand,
  RemoveDevicesCommand,
  UpdateDevicePropertyCommand,
  type DeviceMove,
} from './deviceCommands';
import { AlignDevicesCommand, DistributeDevicesCommand, type AlignMode, type DistributeAxis } from './alignCommands';
import { CreateGroupCommand, SetDevicesLockedCommand, UngroupCommand } from './groupCommands';
import {
  AddTimelineEventCommand,
  RemoveTimelineEventCommand,
  UpdateTimelineEventCommand,
} from './timelineCommands';
import type { Group } from '../types';

const dispatch = (command: Command) => useHistoryStore.getState().execute(command);

export function addDevice(definition: DeviceDefinition, position: Vector3): string {
  const cmd = new AddDeviceCommand(definition, position);
  dispatch(cmd);
  return cmd.device.id;
}

export function removeDevices(deviceIds: string[]): void {
  if (deviceIds.length === 0) return;
  dispatch(new RemoveDevicesCommand(deviceIds));
}

export function moveDevice(deviceId: string, from: Vector3, to: Vector3): void {
  dispatch(new MoveDeviceCommand(deviceId, from, to));
}

/** Commits a completed drag gesture (see MoveDevicesCommand for why this is a distinct path). */
export function moveDevices(moves: DeviceMove[]): void {
  if (moves.length === 0) return;
  dispatch(new MoveDevicesCommand(moves));
}

export function updateDeviceProperty(
  deviceId: string,
  before: Partial<DeviceInstance>,
  after: Partial<DeviceInstance>,
  label?: string,
): void {
  dispatch(new UpdateDevicePropertyCommand(deviceId, before, after, label));
}

export function duplicateDevices(deviceIds: string[]): void {
  if (deviceIds.length === 0) return;
  dispatch(new DuplicateDevicesCommand(deviceIds));
}

export function alignDevices(deviceIds: string[], mode: AlignMode): void {
  if (deviceIds.length < 2) return;
  dispatch(new AlignDevicesCommand(deviceIds, mode));
}

export function distributeDevices(deviceIds: string[], axis: DistributeAxis): void {
  if (deviceIds.length < 3) return;
  dispatch(new DistributeDevicesCommand(deviceIds, axis));
}

export function createGroup(name: string, deviceIds: string[], color: string): void {
  if (deviceIds.length === 0) return;
  dispatch(new CreateGroupCommand(name, deviceIds, color));
}

export function ungroup(group: Group): void {
  dispatch(new UngroupCommand(group));
}

export function setDevicesLocked(deviceIds: string[], locked: boolean): void {
  if (deviceIds.length === 0) return;
  dispatch(new SetDevicesLockedCommand(deviceIds, locked));
}

export function addTimelineEvent(event: Omit<TimelineEvent, 'id'>): void {
  dispatch(new AddTimelineEventCommand(event));
}

export function updateTimelineEvent(
  eventId: string,
  before: Partial<TimelineEvent>,
  after: Partial<TimelineEvent>,
): void {
  dispatch(new UpdateTimelineEventCommand(eventId, before, after));
}

export function removeTimelineEvent(event: TimelineEvent): void {
  dispatch(new RemoveTimelineEventCommand(event));
}

/** Not undoable — see projectStore.setAudio for why. */
export function setAudio(patch: Partial<AudioConfig>): void {
  useProjectStore.getState().setAudio(patch);
}

export function undo(): void {
  useHistoryStore.getState().undo();
}

export function redo(): void {
  useHistoryStore.getState().redo();
}
