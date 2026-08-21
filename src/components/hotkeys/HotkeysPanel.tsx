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
        Nenhum atalho atribuído ainda. Selecione um ou mais efeitos no palco e use "Atribuir Atalho" no
        Inspetor.
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
                {deviceNames.length > 0 ? deviceNames.join(', ') : 'Nenhum efeito'}
              </span>
            </div>
            <IconButton icon="trash" label="Remover Atalho" onClick={() => removeHotkey(binding)} />
          </div>
        );
      })}
    </div>
  );
}
