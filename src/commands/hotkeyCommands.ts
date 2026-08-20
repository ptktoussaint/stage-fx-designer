import type { Command } from './Command';
import { useProjectStore } from '../stores/projectStore';
import type { HotkeyBinding } from '../types';
import { createId } from '../utils/id';

export class AssignHotkeyCommand implements Command {
  label: string;
  readonly binding: HotkeyBinding;

  constructor(code: string, keyLabel: string, deviceIds: string[], name: string) {
    this.binding = { id: createId(), code, keyLabel, deviceIds, name };
    this.label = `Assign Hotkey ${keyLabel}`;
  }

  execute() {
    useProjectStore.getState()._addHotkey(this.binding);
  }

  undo() {
    useProjectStore.getState()._removeHotkey(this.binding.id);
  }
}

export class RemoveHotkeyCommand implements Command {
  label: string;
  private readonly binding: HotkeyBinding;

  constructor(binding: HotkeyBinding) {
    this.binding = binding;
    this.label = `Remove Hotkey ${binding.keyLabel}`;
  }

  execute() {
    useProjectStore.getState()._removeHotkey(this.binding.id);
  }

  undo() {
    useProjectStore.getState()._addHotkey(this.binding);
  }
}

export class UpdateHotkeyCommand implements Command {
  label = 'Edit Hotkey';
  private readonly bindingId: string;
  private readonly before: Partial<HotkeyBinding>;
  private readonly after: Partial<HotkeyBinding>;

  constructor(bindingId: string, before: Partial<HotkeyBinding>, after: Partial<HotkeyBinding>) {
    this.bindingId = bindingId;
    this.before = before;
    this.after = after;
  }

  execute() {
    useProjectStore.getState()._updateHotkey(this.bindingId, this.after);
  }

  undo() {
    useProjectStore.getState()._updateHotkey(this.bindingId, this.before);
  }
}
