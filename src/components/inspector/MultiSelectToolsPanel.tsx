import { useState } from 'react';
import {
  alignDevices,
  createGroup,
  distributeDevices,
  removeDevices,
  setDevicesLocked,
  addTimelineEvent,
  assignHotkey,
} from '../../commands';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { IconButton } from '../common/IconButton';
import { HotkeyCaptureButton } from '../common/HotkeyCaptureButton';
import { formatTime } from '../../utils/time';
import type { DeviceInstance } from '../../types';

const GROUP_COLORS = ['#4f8cff', '#e0693f', '#4bbf7a', '#d6a23c', '#a06fe0', '#4fb8d6'];

export function MultiSelectToolsPanel({ devices }: { devices: DeviceInstance[] }) {
  const ids = devices.map((d) => d.id);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const trimStart = useProjectStore((s) => s.project.audio.trimStart);
  const [groupName, setGroupName] = useState('');

  return (
    <div className="inspector-section">
      <div className="inspector-group-title">{devices.length} Efeitos Selecionados</div>

      <button
        type="button"
        className="inspector-trigger-button inspector-trigger-button--cue"
        title="Adiciona uma marcação na timeline para cada efeito selecionado, todas na posição atual do cursor"
        onClick={() =>
          ids.forEach((deviceId) =>
            addTimelineEvent({
              time: currentTime,
              duration: 0.5,
              targetType: 'device',
              targetId: deviceId,
              action: 'trigger',
              parameters: {},
            }),
          )
        }
      >
        Adicionar Marcação para {devices.length} Efeitos em {formatTime(Math.max(0, currentTime - trimStart))}
      </button>

      <div className="inspector-group-title">Atalhos (disparo ao vivo)</div>
      <HotkeyCaptureButton
        label={`Atribuir Atalho para ${devices.length} Efeitos`}
        onCapture={(code, keyLabel) =>
          assignHotkey(code, keyLabel, ids, devices.map((d) => d.name).join(' + '))
        }
      />

      <div className="inspector-group-title">Alinhar</div>
      <div className="inspector-toolgrid">
        <IconButton icon="align-left" label="Alinhar à Esquerda" onClick={() => alignDevices(ids, 'left')} />
        <IconButton icon="align-center-x" label="Alinhar ao Centro" onClick={() => alignDevices(ids, 'center-x')} />
        <IconButton icon="align-right" label="Alinhar à Direita" onClick={() => alignDevices(ids, 'right')} />
      </div>

      <div className="inspector-group-title">Distribuir</div>
      <div className="inspector-toolgrid">
        <IconButton
          icon="distribute-h"
          label="Distribuir Horizontalmente"
          onClick={() => distributeDevices(ids, 'horizontal')}
          disabled={devices.length < 3}
        />
        <IconButton
          icon="distribute-v"
          label="Distribuir Verticalmente"
          onClick={() => distributeDevices(ids, 'vertical')}
          disabled={devices.length < 3}
        />
      </div>

      <div className="inspector-group-title">Grupo</div>
      <div className="inspector-section__row inspector-section__row--gap">
        <input
          className="inspector-text-input"
          placeholder="Nome do grupo"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <IconButton
          icon="group"
          label="Agrupar Selecionados"
          onClick={() => {
            if (!groupName.trim()) return;
            createGroup(groupName.trim(), ids, GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
            setGroupName('');
          }}
        />
      </div>

      <div className="inspector-group-title">Ações</div>
      <div className="inspector-toolgrid">
        <IconButton icon="lock" label="Travar" onClick={() => setDevicesLocked(ids, true)} />
        <IconButton icon="unlock" label="Destravar" onClick={() => setDevicesLocked(ids, false)} />
        <IconButton icon="trash" label="Excluir" onClick={() => removeDevices(ids)} />
      </div>
    </div>
  );
}
