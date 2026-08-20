import { useState } from 'react';
import { alignDevices, createGroup, distributeDevices, removeDevices, setDevicesLocked } from '../../commands';
import { IconButton } from '../common/IconButton';
import type { DeviceInstance } from '../../types';

const GROUP_COLORS = ['#4f8cff', '#e0693f', '#4bbf7a', '#d6a23c', '#a06fe0', '#4fb8d6'];

export function MultiSelectToolsPanel({ devices }: { devices: DeviceInstance[] }) {
  const ids = devices.map((d) => d.id);
  const [groupName, setGroupName] = useState('');

  return (
    <div className="inspector-section">
      <div className="inspector-group-title">{devices.length} Devices Selected</div>

      <div className="inspector-group-title">Align</div>
      <div className="inspector-toolgrid">
        <IconButton icon="align-left" label="Align Left" onClick={() => alignDevices(ids, 'left')} />
        <IconButton icon="align-center-x" label="Align Center" onClick={() => alignDevices(ids, 'center-x')} />
        <IconButton icon="align-right" label="Align Right" onClick={() => alignDevices(ids, 'right')} />
      </div>

      <div className="inspector-group-title">Distribute</div>
      <div className="inspector-toolgrid">
        <IconButton
          icon="distribute-h"
          label="Distribute Horizontally"
          onClick={() => distributeDevices(ids, 'horizontal')}
          disabled={devices.length < 3}
        />
        <IconButton
          icon="distribute-v"
          label="Distribute Vertically"
          onClick={() => distributeDevices(ids, 'vertical')}
          disabled={devices.length < 3}
        />
      </div>

      <div className="inspector-group-title">Group</div>
      <div className="inspector-section__row inspector-section__row--gap">
        <input
          className="inspector-text-input"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <IconButton
          icon="group"
          label="Group Selected"
          onClick={() => {
            if (!groupName.trim()) return;
            createGroup(groupName.trim(), ids, GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
            setGroupName('');
          }}
        />
      </div>

      <div className="inspector-group-title">Actions</div>
      <div className="inspector-toolgrid">
        <IconButton icon="lock" label="Lock" onClick={() => setDevicesLocked(ids, true)} />
        <IconButton icon="unlock" label="Unlock" onClick={() => setDevicesLocked(ids, false)} />
        <IconButton icon="trash" label="Delete" onClick={() => removeDevices(ids)} />
      </div>
    </div>
  );
}
