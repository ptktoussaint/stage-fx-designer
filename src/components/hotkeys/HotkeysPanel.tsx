import { useProjectStore } from '../../stores/projectStore';
import { removeHotkey, updateHotkey } from '../../commands';
import { IconButton } from '../common/IconButton';
import './HotkeysPanel.css';

export function HotkeysPanel() {
  const hotkeys = useProjectStore((s) => s.project.hotkeys);
  const devices = useProjectStore((s) => s.project.devices);

  if (hotkeys.length === 0) {
    return (
      <div className="hotkeys-panel__empty">
        No hotkeys assigned yet. Select one or more devices on the stage, then use "Assign Hotkey" in
        the Inspector.
      </div>
    );
  }

  return (
    <div className="hotkeys-panel">
      {hotkeys.map((binding) => {
        const deviceNames = binding.deviceIds
          .map((id) => devices.find((d) => d.id === id)?.name)
          .filter((name): name is string => Boolean(name));
        return (
          <div key={binding.id} className="hotkeys-panel__row">
            <span className="hotkeys-panel__key">{binding.keyLabel}</span>
            <div className="hotkeys-panel__info">
              <input
                className="hotkeys-panel__name-input"
                value={binding.name}
                onChange={(e) => updateHotkey(binding.id, { name: binding.name }, { name: e.target.value })}
              />
              <span className="hotkeys-panel__devices">
                {deviceNames.length > 0 ? deviceNames.join(', ') : 'No devices'}
              </span>
            </div>
            <IconButton icon="trash" label="Remove Hotkey" onClick={() => removeHotkey(binding)} />
          </div>
        );
      })}
    </div>
  );
}
