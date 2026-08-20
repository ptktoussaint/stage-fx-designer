import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { getDeviceDefinition } from '../../devices/registry';
import {
  updateDeviceProperty,
  createGroup,
  setDevicesLocked,
  removeDevices,
  duplicateDevices,
  addTimelineEvent,
} from '../../commands';
import { NumberField } from '../common/NumberField';
import { IconButton } from '../common/IconButton';
import { eventBus } from '../../engine/eventBus';
import { formatTime } from '../../utils/time';
import type { DeviceInstance } from '../../types';

const GROUP_COLORS = ['#4f8cff', '#e0693f', '#4bbf7a', '#d6a23c', '#a06fe0', '#4fb8d6'];

export function DevicePropertiesPanel({ device }: { device: DeviceInstance }) {
  const definition = getDeviceDefinition(device.definitionId);
  const groups = useProjectStore((s) => s.project.groups);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const [newGroupName, setNewGroupName] = useState('');

  if (!definition) return <div className="inspector-empty">Unknown device type.</div>;

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
          label={device.locked ? 'Locked' : 'Unlocked'}
          active={device.locked}
          onClick={() => setDevicesLocked([device.id], !device.locked)}
        />
        <label className="inspector-checkbox">
          <input
            type="checkbox"
            checked={device.enabled}
            onChange={(e) => commit({ enabled: device.enabled }, { enabled: e.target.checked }, 'Toggle Enabled')}
          />
          Enabled
        </label>
        <IconButton icon="duplicate" label="Duplicate" onClick={() => duplicateDevices([device.id])} />
        <IconButton icon="trash" label="Delete" onClick={() => removeDevices([device.id])} />
      </div>

      <div className="inspector-group-title">Position (meters)</div>
      <NumberField
        label="X"
        value={device.position.x}
        onCommit={(x) => commit({ position: device.position }, { position: { ...device.position, x } }, 'Move Device')}
        onChange={() => {}}
      />
      <NumberField
        label="Y"
        value={device.position.y}
        onCommit={(y) => commit({ position: device.position }, { position: { ...device.position, y } }, 'Move Device')}
        onChange={() => {}}
      />
      <NumberField
        label="Z (height)"
        value={device.position.z}
        onCommit={(z) => commit({ position: device.position }, { position: { ...device.position, z } }, 'Move Device')}
        onChange={() => {}}
      />
      <NumberField
        label="Rotation"
        value={device.rotation.z}
        suffix="°"
        step={5}
        onCommit={(z) => commit({ rotation: device.rotation }, { rotation: { ...device.rotation, z } }, 'Rotate Device')}
        onChange={() => {}}
      />

      <div className="inspector-group-title">Parameters</div>
      {Object.entries(device.customProperties).map(([key, value]) => {
        if (typeof value === 'number') {
          return (
            <NumberField
              key={key}
              label={key}
              value={value}
              onCommit={(next) =>
                commit(
                  { customProperties: device.customProperties },
                  { customProperties: { ...device.customProperties, [key]: next } },
                  'Edit Parameter',
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
                    'Edit Parameter',
                  )
                }
              />
              {key}
            </label>
          );
        }
        return (
          <div key={key} className="number-field">
            <span className="number-field__label">{key}</span>
            <input
              value={String(value)}
              onChange={(e) =>
                commit(
                  { customProperties: device.customProperties },
                  { customProperties: { ...device.customProperties, [key]: e.target.value } },
                  'Edit Parameter',
                )
              }
            />
          </div>
        );
      })}

      <button
        type="button"
        className="inspector-trigger-button"
        title="Fires the same SIMULATION_TRIGGER event the Show Engine emits during playback, without needing a timeline event"
        onClick={() =>
          eventBus.emit('SIMULATION_TRIGGER', {
            deviceId: device.id,
            simulationType: definition.simulationType,
            action: 'trigger',
            parameters: { ...definition.defaultParameters, ...device.customProperties },
          })
        }
      >
        Test Trigger
      </button>

      <button
        type="button"
        className="inspector-trigger-button inspector-trigger-button--cue"
        title="Adds a timeline event for this device at the current playhead position"
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
        Add Cue at {formatTime(currentTime)}
      </button>

      <div className="inspector-group-title">Groups</div>
      {groups.length === 0 && <div className="inspector-subtle">No groups yet.</div>}
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
                commit({ groupIds: device.groupIds }, { groupIds }, isMember ? 'Remove from Group' : 'Add to Group');
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
          placeholder="New group name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <IconButton
          icon="group"
          label="Create Group"
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
