import { create } from 'zustand';
import { eventBus } from '../engine/eventBus';

interface SelectionState {
  selectedDeviceIds: string[];
  /** True while a box-selection drag is in progress on the Stage Editor. */
  isBoxSelecting: boolean;

  select: (deviceId: string) => void;
  toggle: (deviceId: string) => void;
  setSelection: (deviceIds: string[]) => void;
  addToSelection: (deviceIds: string[]) => void;
  clear: () => void;
  isSelected: (deviceId: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedDeviceIds: [],
  isBoxSelecting: false,

  select: (deviceId) => {
    set({ selectedDeviceIds: [deviceId] });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: [deviceId] });
  },

  toggle: (deviceId) => {
    const current = get().selectedDeviceIds;
    const next = current.includes(deviceId)
      ? current.filter((id) => id !== deviceId)
      : [...current, deviceId];
    set({ selectedDeviceIds: next });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: next });
  },

  setSelection: (deviceIds) => {
    set({ selectedDeviceIds: deviceIds });
    eventBus.emit('SELECTION_CHANGED', { deviceIds });
  },

  addToSelection: (deviceIds) => {
    const current = get().selectedDeviceIds;
    const next = Array.from(new Set([...current, ...deviceIds]));
    set({ selectedDeviceIds: next });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: next });
  },

  clear: () => {
    set({ selectedDeviceIds: [] });
    eventBus.emit('SELECTION_CHANGED', { deviceIds: [] });
  },

  isSelected: (deviceId) => get().selectedDeviceIds.includes(deviceId),
}));
