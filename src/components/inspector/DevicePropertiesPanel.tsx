import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { getDeviceDefinition } from '../../devices/registry';
import { CATEGORY_COLOR_HEX } from '../../devices/categoryColors';
import {
  updateDeviceProperty,
  createGroup,
  setDevicesLocked,
  removeDevices,
  duplicateDevices,
  addTimelineEvent,
  assignHotkey,
  removeHotkey,
} from '../../commands';
import { NumberField } from '../common/NumberField';
import { IconButton } from '../common/IconButton';
import type { IconName } from '../common/Icon';
import { HotkeyCaptureButton } from '../common/HotkeyCaptureButton';
import { eventBus } from '../../engine/eventBus';
import { formatTime } from '../../utils/time';
import type { DeviceInstance } from '../../types';

const GROUP_COLORS = ['#4f8cff', '#e0693f', '#4bbf7a', '#d6a23c', '#a06fe0', '#4fb8d6'];

const SHAPE_OPTIONS: { value: string; label: string; icon: IconName }[] = [
  { value: 'open', label: 'Aberto', icon: 'shape-open' },
  { value: 'cone', label: 'Cone (\\/)', icon: 'shape-cone' },
  { value: 'invertedCone', label: 'Cone Invertido (/\\)', icon: 'shape-inverted-cone' },
];

/** Friendly Portuguese labels for the generic customProperties keys shown
 * in the Parameters section below — the underlying data keys (height,
 * angle, width, ...) stay in English since they're the stable persisted
 * schema (project JSON, migrations, command payloads); only the on-screen
 * label changes. */
const PARAM_LABEL_PT: Record<string, string> = {
  height: 'Altura do Efeito',
  duration: 'Duração do Efeito',
  intensity: 'Intensidade',
  angle: 'Ângulo do Efeito',
  width: 'Largura do Efeito',
};

export function DevicePropertiesPanel({ device }: { device: DeviceInstance }) {
  const definition = getDeviceDefinition(device.definitionId);
  const groups = useProjectStore((s) => s.project.groups);
  const hotkeys = useProjectStore((s) => s.project.hotkeys);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const trimStart = useProjectStore((s) => s.project.audio.trimStart);
  const [newGroupName, setNewGroupName] = useState('');
  const deviceHotkeys = hotkeys.filter((h) => h.deviceIds.includes(device.id));

  if (!definition) return <div className="inspector-empty">Tipo de efeito desconhecido.</div>;

  const commit = (patchBefore: Partial<DeviceInstance>, patchAfter: Partial<DeviceInstance>, label?: string) =>
    updateDeviceProperty(device.id, patchBefore, patchAfter, label);

  return (
    <div className="inspector-section">
      <div className="inspector-section__row">
        <input
          className="inspector-name-input"
          value={device.name}
          onChange={(e) => useProjectStore.getState()._updateDevice(device.id, { name: e.target.value })}
        />
      </div>
      <div className="inspector-subtle">{definition.name} · {definition.category}</div>

      <div className="inspector-section__row inspector-section__row--gap">
        <IconButton
          icon={device.locked ? 'lock' : 'unlock'}
          label={device.locked ? 'Travado' : 'Destravado'}
          active={device.locked}
          onClick={() => setDevicesLocked([device.id], !device.locked)}
        />
        <label className="inspector-checkbox">
          <input
            type="checkbox"
            checked={device.enabled}
            onChange={(e) => commit({ enabled: device.enabled }, { enabled: e.target.checked }, 'Ativar/Desativar')}
          />
          Ativado
        </label>
        <IconButton icon="duplicate" label="Duplicar" onClick={() => duplicateDevices([device.id])} />
        <IconButton icon="trash" label="Excluir" onClick={() => removeDevices([device.id])} />
      </div>

      <div className="inspector-section__row inspector-section__row--gap">
        <label className="inspector-checkbox" title="Cor da máquina em si — o ícone 2D e o modelo 3D">
          Cor do Objeto
          <input
            type="color"
            value={device.bodyColor ?? CATEGORY_COLOR_HEX[definition.category]}
            onChange={(e) => commit({ bodyColor: device.bodyColor }, { bodyColor: e.target.value }, 'Editar Cor do Objeto')}
          />
        </label>
        <label className="inspector-checkbox" title="Cor da chama/faísca/confete simulado que este efeito dispara">
          Cor do Efeito
          <input
            type="color"
            value={device.color ?? CATEGORY_COLOR_HEX[definition.category]}
            onChange={(e) => commit({ color: device.color }, { color: e.target.value }, 'Editar Cor do Efeito')}
          />
        </label>
      </div>

      <div className="inspector-group-title">Posição (metros)</div>
      <NumberField
        label="Horizontal"
        value={device.position.x}
        onCommit={(x) => commit({ position: device.position }, { position: { ...device.position, x } }, 'Mover Efeito')}
        onChange={() => {}}
      />
      <NumberField
        label="Distância"
        value={device.position.y}
        onCommit={(y) => commit({ position: device.position }, { position: { ...device.position, y } }, 'Mover Efeito')}
        onChange={() => {}}
      />
      <NumberField
        label="Altura"
        value={device.position.z}
        onCommit={(z) => commit({ position: device.position }, { position: { ...device.position, z } }, 'Mover Efeito')}
        onChange={() => {}}
      />
      <NumberField
        label="Rotação"
        value={device.rotation.z}
        suffix="°"
        step={5}
        onCommit={(z) => commit({ rotation: device.rotation }, { rotation: { ...device.rotation, z } }, 'Rotacionar Efeito')}
        onChange={() => {}}
      />

      <div className="inspector-group-title">Parâmetros</div>
      {Object.entries(device.customProperties).map(([key, value]) => {
        if (key === 'shape' && typeof value === 'string') {
          return (
            <div key={key} className="inspector-section__row inspector-section__row--gap">
              {SHAPE_OPTIONS.map((opt) => (
                <IconButton
                  key={opt.value}
                  icon={opt.icon}
                  label={opt.label}
                  active={value === opt.value}
                  onClick={() =>
                    commit(
                      { customProperties: device.customProperties },
                      { customProperties: { ...device.customProperties, shape: opt.value } },
                      'Editar Formato',
                    )
                  }
                />
              ))}
            </div>
          );
        }
        if (typeof value === 'number') {
          return (
            <NumberField
              key={key}
              label={PARAM_LABEL_PT[key] ?? key}
              value={value}
              onCommit={(next) =>
                commit(
                  { customProperties: device.customProperties },
                  { customProperties: { ...device.customProperties, [key]: next } },
                  'Editar Parâmetro',
                )
              }
              onChange={() => {}}
            />
          );
        }
        if (typeof value === 'boolean') {
          return (
            <label key={key} className="inspector-checkbox">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  commit(
                    { customProperties: device.customProperties },
                    { customProperties: { ...device.customProperties, [key]: e.target.checked } },
                    'Editar Parâmetro',
                  )
                }
              />
              {PARAM_LABEL_PT[key] ?? key}
            </label>
          );
        }
        return (
          <div key={key} className="number-field">
            <span className="number-field__label">{PARAM_LABEL_PT[key] ?? key}</span>
            <input
              value={String(value)}
              onChange={(e) =>
                commit(
                  { customProperties: device.customProperties },
                  { customProperties: { ...device.customProperties, [key]: e.target.value } },
                  'Editar Parâmetro',
                )
              }
            />
          </div>
        );
      })}

      <button
        type="button"
        className="inspector-trigger-button"
        title="Dispara o mesmo evento que o Motor do Show emite durante a reprodução, sem precisar de uma marcação na timeline"
        onClick={() =>
          eventBus.emit('SIMULATION_TRIGGER', {
            deviceId: device.id,
            simulationType: definition.simulationType,
            action: 'trigger',
            parameters: { ...definition.defaultParameters, ...device.customProperties },
          })
        }
      >
        Testar Disparo
      </button>

      <button
        type="button"
        className="inspector-trigger-button inspector-trigger-button--cue"
        title="Adiciona uma marcação na timeline para este efeito na posição atual do cursor"
        onClick={() =>
          addTimelineEvent({
            time: currentTime,
            duration: 0.5,
            targetType: 'device',
            targetId: device.id,
            action: 'trigger',
            parameters: {},
          })
        }
      >
        Adicionar Marcação em {formatTime(Math.max(0, currentTime - trimStart))}
      </button>

      <div className="inspector-group-title">Atalhos (disparo ao vivo)</div>
      {deviceHotkeys.map((binding) => (
        <div key={binding.id} className="inspector-section__row inspector-section__row--gap">
          <span className="inspector-hotkey-chip">{binding.keyLabel}</span>
          <span className="inspector-subtle" style={{ margin: 0, flex: 1 }}>
            {binding.name}
          </span>
          <IconButton icon="trash" label="Remover Atalho" onClick={() => removeHotkey(binding)} />
        </div>
      ))}
      <HotkeyCaptureButton
        label="Atribuir Atalho"
        onCapture={(code, keyLabel) => assignHotkey(code, keyLabel, [device.id], device.name)}
      />

      <div className="inspector-group-title">Grupos</div>
      {groups.length === 0 && <div className="inspector-subtle">Nenhum grupo ainda.</div>}
      {groups.map((group) => {
        const isMember = device.groupIds.includes(group.id);
        return (
          <label key={group.id} className="inspector-checkbox">
            <input
              type="checkbox"
              checked={isMember}
              onChange={() => {
                const groupIds = isMember
                  ? device.groupIds.filter((id) => id !== group.id)
                  : [...device.groupIds, group.id];
                commit({ groupIds: device.groupIds }, { groupIds }, isMember ? 'Remover do Grupo' : 'Adicionar ao Grupo');
              }}
            />
            <span className="inspector-group-swatch" style={{ background: group.color }} />
            {group.name}
          </label>
        );
      })}
      <div className="inspector-section__row inspector-section__row--gap">
        <input
          className="inspector-text-input"
          placeholder="Nome do novo grupo"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <IconButton
          icon="group"
          label="Criar Grupo"
          onClick={() => {
            if (!newGroupName.trim()) return;
            createGroup(newGroupName.trim(), [device.id], GROUP_COLORS[groups.length % GROUP_COLORS.length]);
            setNewGroupName('');
          }}
        />
      </div>
    </div>
  );
}
